import logging
import requests

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.risk import calculate_route_risk, haversine_distance_km
from app.services.routing import (
    calculate_bearing,
    calculate_route,
    calculate_route_via_waypoint,
    generate_corridor_waypoints,
    snap_to_road,
)

router = APIRouter(
    prefix="/routes",
    tags=["Routes"],
)

logger = logging.getLogger("nexus_ner.routes")


class RouteRequest(BaseModel):
    origin_lat: float = Field(..., ge=20, le=30)
    origin_lon: float = Field(..., ge=88, le=98)
    destination_lat: float = Field(..., ge=20, le=30)
    destination_lon: float = Field(..., ge=88, le=98)


class AlternativeRouteRequest(RouteRequest):
    blocked_lat: float = Field(..., ge=20, le=30)
    blocked_lon: float = Field(..., ge=88, le=98)


@router.post("/calculate")
def calculate_route_endpoint(
    request: RouteRequest,
    db: Session = Depends(get_db),
):
    try:
        return calculate_route(
            origin_lat=request.origin_lat,
            origin_lon=request.origin_lon,
            destination_lat=request.destination_lat,
            destination_lon=request.destination_lon,
        )
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"Routing service unavailable: {str(error)}",
        )
    except RuntimeError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.post("/risk-check")
def route_risk_check(
    request: RouteRequest,
    db: Session = Depends(get_db),
):
    try:
        route = calculate_route(
            origin_lat=request.origin_lat,
            origin_lon=request.origin_lon,
            destination_lat=request.destination_lat,
            destination_lon=request.destination_lon,
        )
        risk = calculate_route_risk(
            route_geometry=route["geometry"],
            db=db,
        )
        return {"route": route, "risk": risk}
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"Routing service unavailable: {str(error)}",
        )
    except RuntimeError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.post("/alternatives")
def calculate_alternative_routes(
    request: AlternativeRouteRequest,
    db: Session = Depends(get_db),
):
    try:
        primary_route = calculate_route(
            origin_lat=request.origin_lat,
            origin_lon=request.origin_lon,
            destination_lat=request.destination_lat,
            destination_lon=request.destination_lon,
        )

        primary_risk = calculate_route_risk(
            route_geometry=primary_route["geometry"],
            db=db,
        )

        coordinates = primary_route["geometry"].get("coordinates", [])
        if len(coordinates) >= 2:
            nearest_index = min(
                range(len(coordinates)),
                key=lambda i: haversine_distance_km(
                    request.blocked_lat,
                    request.blocked_lon,
                    coordinates[i][1],
                    coordinates[i][0],
                ),
            )
            before = max(0, nearest_index - 3)
            after = min(len(coordinates) - 1, nearest_index + 3)

            if before != after:
                lon1, lat1 = coordinates[before]
                lon2, lat2 = coordinates[after]
                corridor_bearing = calculate_bearing(
                    lat1, lon1, lat2, lon2
                )
            else:
                corridor_bearing = calculate_bearing(
                    request.origin_lat,
                    request.origin_lon,
                    request.destination_lat,
                    request.destination_lon,
                )
        else:
            corridor_bearing = calculate_bearing(
                request.origin_lat,
                request.origin_lon,
                request.destination_lat,
                request.destination_lon,
            )

        waypoint_candidates = generate_corridor_waypoints(
            request.blocked_lat,
            request.blocked_lon,
            corridor_bearing,
        )

        alternatives = []
        rejected_candidates = []

        for waypoint_lat, waypoint_lon in waypoint_candidates:
            if not (20 <= waypoint_lat <= 30 and 88 <= waypoint_lon <= 98):
                rejected_candidates.append({
                    "waypoint": {
                        "latitude": waypoint_lat,
                        "longitude": waypoint_lon,
                    },
                    "reason": "out_of_bounds",
                })
                continue

            attempt_points = [(waypoint_lat, waypoint_lon)]
            snapped_once = False
            alternative_route = None
            last_error = None
            attempt_index = 0

            while attempt_index < len(attempt_points):
                attempt_lat, attempt_lon = attempt_points[attempt_index]
                attempt_index += 1

                try:
                    alternative_route = calculate_route_via_waypoint(
                        origin_lat=request.origin_lat,
                        origin_lon=request.origin_lon,
                        waypoint_lat=attempt_lat,
                        waypoint_lon=attempt_lon,
                        destination_lat=request.destination_lat,
                        destination_lon=request.destination_lon,
                    )
                    break
                except requests.RequestException as error:
                    last_error = ("osrm_request_failed", str(error))
                    break
                except RuntimeError as error:
                    last_error = ("osrm_no_route", str(error))
                    if snapped_once:
                        break

                    snapped_once = True
                    snapped = snap_to_road(attempt_lat, attempt_lon)
                    if snapped is None:
                        last_error = (
                            "osrm_nearest_snap_failed",
                            f"No routable road near ({attempt_lat}, {attempt_lon})",
                        )
                        break

                    attempt_points.append(snapped)

            if alternative_route is None:
                reason, detail = last_error or (
                    "osrm_no_route",
                    "Unknown routing failure",
                )
                rejected_candidates.append({
                    "waypoint": {
                        "latitude": waypoint_lat,
                        "longitude": waypoint_lon,
                    },
                    "reason": reason,
                    "detail": detail,
                })
                continue

            route_coordinates = alternative_route["geometry"].get(
                "coordinates", []
            )
            if not route_coordinates:
                rejected_candidates.append({
                    "waypoint": {
                        "latitude": waypoint_lat,
                        "longitude": waypoint_lon,
                    },
                    "reason": "empty_geometry",
                })
                continue

            clearance = min(
                haversine_distance_km(
                    lat,
                    lon,
                    request.blocked_lat,
                    request.blocked_lon,
                )
                for lon, lat in route_coordinates
            )

            if clearance < 1.0:
                rejected_candidates.append({
                    "waypoint": {
                        "latitude": waypoint_lat,
                        "longitude": waypoint_lon,
                    },
                    "reason": "intersects_blocked_zone",
                    "detail": f"Route passes within {clearance:.2f} km of blockage",
                })
                continue

            risk = calculate_route_risk(
                route_geometry=alternative_route["geometry"],
                db=db,
            )
            safe = (
                risk["risk_score"] < 80
                and not risk["reroute_required"]
            )

            alternatives.append({
                "route": alternative_route,
                "risk": risk,
                "safe": safe,
                "waypoint": {
                    "latitude": waypoint_lat,
                    "longitude": waypoint_lon,
                },
                "blockage_clearance_km": round(clearance, 2),
            })

        safe_alternatives = [
            item for item in alternatives if item["safe"]
        ]

        safe_alternatives.sort(
            key=lambda item: (
                item["risk"]["risk_score"],
                item["route"]["duration_minutes"],
            )
        )

        return {
            "primary_route": primary_route,
            "primary_risk": primary_risk,
            "recommended_route": (
                safe_alternatives[0]
                if safe_alternatives
                else None
            ),
            "alternatives": alternatives,
            "safe_alternatives_count": len(safe_alternatives),
            "reroute_required": primary_risk["reroute_required"],
            "rejected_candidates": rejected_candidates,
            "reason": (
                "Primary route requires rerouting; safe alternative selected"
                if safe_alternatives and primary_risk["reroute_required"]
                else (
                    "No safe alternative route found"
                    if not safe_alternatives
                    else "Alternative routes generated"
                )
            ),
        }

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"Routing service unavailable: {str(error)}",
        )
    except RuntimeError as error:
        raise HTTPException(status_code=404, detail=str(error))
