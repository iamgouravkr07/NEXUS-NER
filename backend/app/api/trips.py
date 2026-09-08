import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests

from app.database import get_db
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.incident import Incident
from app.models.road import Road

from app.schemas.trip import (
    TripCreate,
    TripEtaUpdate,
    TripResponse,
    TripStatusUpdate,
)

from app.services.routing import (
    calculate_route,
    calculate_route_via_waypoint,
    calculate_bearing,
    generate_corridor_waypoints,
    snap_to_road,
)

from app.services.risk import (
    calculate_route_risk,
    haversine_distance_km,
)
from app.services import alert_service


logger = logging.getLogger("nexus_ner.reroute")
if not logger.handlers:
    # Ensure reroute rejection reasons are actually visible even if
    # the app has no global logging configuration.
    logging.basicConfig(level=logging.INFO)
    logger.setLevel(logging.INFO)


# NER (North Eastern Region) operational bounding box.
# Used as a sanity check on generated detour waypoints.
NER_LAT_BOUNDS = (20.0, 30.0)
NER_LON_BOUNDS = (88.0, 98.0)


def _find_corridor_bearing(coordinates, blocked_lat, blocked_lon):
    """
    Determine the local road corridor direction at the point on the
    primary route closest to the blockage, using neighbouring route
    coordinates. Falls back to None if the route is too short to
    infer a bearing.
    """

    if len(coordinates) < 2:
        return None

    nearest_index = min(
        range(len(coordinates)),
        key=lambda i: haversine_distance_km(
            blocked_lat,
            blocked_lon,
            coordinates[i][1],
            coordinates[i][0],
        ),
    )

    window = 3
    before_index = max(0, nearest_index - window)
    after_index = min(len(coordinates) - 1, nearest_index + window)

    if before_index == after_index:
        return None

    lon1, lat1 = coordinates[before_index]
    lon2, lat2 = coordinates[after_index]

    return calculate_bearing(lat1, lon1, lat2, lon2)


router = APIRouter(
    prefix="/trips",
    tags=["Trips"],
)


# ============================================================
# CREATE TRIP
# ============================================================

@router.post("/", response_model=TripResponse)
def create_trip(
    trip: TripCreate,
    db: Session = Depends(get_db),
):
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == trip.vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    db_trip = Trip(
        vehicle_id=trip.vehicle_id,
        origin=trip.origin,
        destination=trip.destination,
        origin_lat=trip.origin_lat,
        origin_lon=trip.origin_lon,
        destination_lat=trip.destination_lat,
        destination_lon=trip.destination_lon,
        cargo_type=trip.cargo_type,
        priority=trip.priority,
        status=trip.status,
        eta_minutes=trip.eta_minutes,
        route_distance_km=trip.route_distance_km,
        route_duration_minutes=trip.route_duration_minutes,
        current_route_geometry=trip.current_route_geometry,
        reroute_count=trip.reroute_count or 0,
        last_reroute_reason=trip.last_reroute_reason,
    )

    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)

    vehicle.current_trip_id = db_trip.id

    if vehicle.status == "idle":
        vehicle.status = "in_transit"

    db.commit()

    return db_trip


# ============================================================
# GET ALL TRIPS
# ============================================================

@router.get("/", response_model=list[TripResponse])
def get_trips(
    db: Session = Depends(get_db),
):
    return (
        db.query(Trip)
        .order_by(Trip.id.desc())
        .all()
    )


# ============================================================
# GET SINGLE TRIP
# ============================================================

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
):
    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id)
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    return trip


# ============================================================
# UPDATE TRIP STATUS
# ============================================================

@router.patch(
    "/{trip_id}/status",
    response_model=TripResponse,
)
def update_trip_status(
    trip_id: int,
    status_update: TripStatusUpdate,
    db: Session = Depends(get_db),
):
    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id)
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    allowed_statuses = {
        "planned",
        "active",
        "delayed",
        "rerouting",
        "completed",
        "cancelled",
    }

    new_status = status_update.status.lower()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid status. "
                f"Allowed values: {sorted(allowed_statuses)}"
            ),
        )

    trip.status = new_status

    db.commit()
    db.refresh(trip)

    return trip


# ============================================================
# UPDATE TRIP ETA
# ============================================================

@router.patch(
    "/{trip_id}/eta",
    response_model=TripResponse,
)
def update_trip_eta(
    trip_id: int,
    eta_update: TripEtaUpdate,
    db: Session = Depends(get_db),
):
    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id)
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    trip.eta_minutes = eta_update.eta_minutes

    db.commit()
    db.refresh(trip)

    return trip


# ============================================================
# REROUTE TRIP
# ============================================================

@router.post("/{trip_id}/reroute")
def reroute_trip(
    trip_id: int,
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # 1. Get trip
    # --------------------------------------------------------

    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id)
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    # --------------------------------------------------------
    # 2. Get vehicle
    # --------------------------------------------------------

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == trip.vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    if vehicle.latitude is not None and vehicle.longitude is not None:
        start_lat = vehicle.latitude
        start_lon = vehicle.longitude
        origin_source = "vehicle_gps"
    elif trip.origin_lat is not None and trip.origin_lon is not None:
        start_lat = trip.origin_lat
        start_lon = trip.origin_lon
        origin_source = "trip_origin"
    else:
        raise HTTPException(
            status_code=400,
            detail="Neither vehicle GPS location nor trip origin coordinates are available",
        )

    if (
        trip.destination_lat is None
        or trip.destination_lon is None
    ):
        raise HTTPException(
            status_code=400,
            detail="Trip destination coordinates are not available",
        )

    # --------------------------------------------------------
    # 3. Calculate primary route
    # --------------------------------------------------------

    try:
        primary_route = calculate_route(
            origin_lat=start_lat,
            origin_lon=start_lon,
            destination_lat=trip.destination_lat,
            destination_lon=trip.destination_lon,
        )

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"Routing service unavailable: {str(error)}",
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    # --------------------------------------------------------
    # 4. Check primary route risk
    # --------------------------------------------------------

    primary_risk = calculate_route_risk(
        route_geometry=primary_route["geometry"],
        db=db,
    )

    # --------------------------------------------------------
    # 5. Current route is safe
    # --------------------------------------------------------

    if not primary_risk["reroute_required"]:

        previous_eta = trip.eta_minutes

        if trip.status in {"delayed", "rerouting"}:
            trip.status = "active"

        trip.route_distance_km = primary_route["distance_km"]
        trip.route_duration_minutes = (
            primary_route["duration_minutes"]
        )
        trip.eta_minutes = primary_route["duration_minutes"]
        trip.current_route_geometry = json.dumps(primary_route["geometry"])
        trip.last_reroute_reason = "Current route is safe"

        db.commit()
        db.refresh(trip)

        return {
            "trip_id": trip.id,
            "vehicle_id": vehicle.id,
            "status": trip.status,
            "reroute_required": False,
            "reason": "Current route is safe",
            "origin_used": {
                "source": origin_source,
                "latitude": start_lat,
                "longitude": start_lon,
            },
            "blockage": None,
            "previous_route": primary_route,
            "selected_route": primary_route,
            "new_route": primary_route,
            "current_route": primary_route,
            "previous_eta_minutes": previous_eta,
            "new_eta_minutes": primary_route["duration_minutes"],
            "delay_minutes": 0,
            "previous_risk": primary_risk,
            "selected_risk": primary_risk,
            "safe_alternatives_count": 0,
            "safe_alternatives_found": 0,
            "alternatives_count": 0,
            "alternatives_evaluated": 0,
            "reroute_count": trip.reroute_count or 0,
            "last_reroute_reason": trip.last_reroute_reason,
            "alternatives": [],
        }

    # --------------------------------------------------------
    # 6. Find disruption closest to primary route
    # --------------------------------------------------------

    coordinates = primary_route["geometry"].get(
        "coordinates",
        [],
    )

    verified_incidents = (
        db.query(Incident)
        .filter(Incident.status == "verified")
        .all()
    )

    blocked_roads = (
        db.query(Road)
        .filter(Road.status == "blocked")
        .all()
    )

    candidates = []

    for incident in verified_incidents:

        if coordinates:

            distance = min(
                haversine_distance_km(
                    lat,
                    lon,
                    incident.latitude,
                    incident.longitude,
                )
                for lon, lat in coordinates
            )

            candidates.append(
                (
                    distance,
                    incident.latitude,
                    incident.longitude,
                    f"Verified {incident.incident_type}",
                )
            )

    for road in blocked_roads:

        if coordinates:

            distance = min(
                haversine_distance_km(
                    lat,
                    lon,
                    road.latitude,
                    road.longitude,
                )
                for lon, lat in coordinates
            )

            candidates.append(
                (
                    distance,
                    road.latitude,
                    road.longitude,
                    f"Blocked road: {road.road_name}",
                )
            )

    if not candidates:

        raise HTTPException(
            status_code=404,
            detail=(
                "No verified incident or blocked road "
                "found for rerouting"
            ),
        )

    candidates.sort(key=lambda item: item[0])

    (
        blockage_distance,
        blocked_lat,
        blocked_lon,
        blockage_source,
    ) = candidates[0]

    # --------------------------------------------------------
    # 7. Controlled detour routing
    #
    # Public OSRM does not know our private blocked-road data, and
    # the public OSRM demo server does not return usable
    # alternatives=true results (confirmed: only ever one route).
    #
    # Root cause of the previous bug: candidate waypoints were
    # blind, large lat/lon offsets (0.25-0.6 degrees, i.e. roughly
    # 28-90 km) from the blockage. In the hilly, sparsely-mapped
    # NER terrain those points frequently sit far from any real
    # road, so every single OSRM waypoint-routing request failed
    # with "no route found" -- and because the failure was caught
    # with a bare `except ...: continue`, all 12 candidates were
    # silently dropped, alternatives stayed empty, and the endpoint
    # fell through to the "no safe alternative" branch every time.
    #
    # Fix: generate waypoints *perpendicular to the local road
    # corridor direction* at increasing, realistic detour
    # distances (5-50 km) either side of the blockage, then snap
    # each candidate onto the actual OSRM road network via
    # /nearest before requesting a route through it. Every
    # rejection reason is now recorded instead of swallowed.
    # --------------------------------------------------------

    corridor_bearing = _find_corridor_bearing(
        coordinates,
        blocked_lat,
        blocked_lon,
    )

    if corridor_bearing is None:
        # Fall back to the overall origin -> destination bearing if
        # the primary route geometry was too sparse to infer a
        # local direction.
        corridor_bearing = calculate_bearing(
            start_lat,
            start_lon,
            trip.destination_lat,
            trip.destination_lon,
        )

    waypoint_candidates = generate_corridor_waypoints(
        blocked_lat,
        blocked_lon,
        corridor_bearing,
    )

    # All known blockages on/near the primary route. A candidate
    # route must clear *every* one of these, not just the closest.
    exclusion_zones = [
        (lat, lon, source)
        for (_distance, lat, lon, source) in candidates
    ]

    alternatives = []
    rejected_candidates = []

    def _reject(waypoint_lat, waypoint_lon, reason, detail=""):
        logger.warning(
            "Reroute candidate rejected: waypoint=(%.5f, %.5f) reason=%s %s",
            waypoint_lat,
            waypoint_lon,
            reason,
            detail,
        )
        rejected_candidates.append(
            {
                "waypoint": {
                    "latitude": waypoint_lat,
                    "longitude": waypoint_lon,
                },
                "reason": reason,
                "detail": detail,
            }
        )

    for waypoint_lat, waypoint_lon in waypoint_candidates:

        # Keep waypoint inside NER operational bounds.
        if not (
            NER_LAT_BOUNDS[0] <= waypoint_lat <= NER_LAT_BOUNDS[1]
        ):
            _reject(
                waypoint_lat,
                waypoint_lon,
                "out_of_bounds",
                "Latitude outside NER operational bounds",
            )
            continue

        if not (
            NER_LON_BOUNDS[0] <= waypoint_lon <= NER_LON_BOUNDS[1]
        ):
            _reject(
                waypoint_lat,
                waypoint_lon,
                "out_of_bounds",
                "Longitude outside NER operational bounds",
            )
            continue

        # ----------------------------------------------------
        # Try the raw waypoint first (cheap: one OSRM call).
        # If OSRM cannot find a route through it, snap the point
        # onto the actual road network and retry once before
        # giving up on this candidate.
        # ----------------------------------------------------

        # Try the raw waypoint first (cheap: one OSRM call). If OSRM
        # cannot find a route through it, snap the point onto the
        # actual road network and retry exactly once before giving
        # up on this candidate. Implemented as an explicit index
        # loop (not `for p in list(points)`) so the snapped retry
        # point, appended mid-loop, is actually visited.
        attempt_points = [(waypoint_lat, waypoint_lon)]
        attempt_index = 0

        alternative_route = None
        last_error = None
        already_snapped = False

        while attempt_index < len(attempt_points):
            attempt_lat, attempt_lon = attempt_points[attempt_index]
            attempt_index += 1

            try:
                alternative_route = calculate_route_via_waypoint(
                    origin_lat=start_lat,
                    origin_lon=start_lon,
                    waypoint_lat=attempt_lat,
                    waypoint_lon=attempt_lon,
                    destination_lat=trip.destination_lat,
                    destination_lon=trip.destination_lon,
                )
                break

            except requests.RequestException as error:
                last_error = ("osrm_request_failed", str(error))
                # A transient network/HTTP failure. Retrying the
                # same point with a snap won't fix a dead
                # connection, so stop trying this candidate.
                break

            except RuntimeError as error:
                last_error = ("osrm_no_route", str(error))

                if already_snapped:
                    # Already retried once with a snapped point and
                    # it still failed -- give up on this candidate.
                    break

                already_snapped = True
                snapped = snap_to_road(attempt_lat, attempt_lon)

                if snapped is None:
                    last_error = (
                        "osrm_nearest_snap_failed",
                        (
                            f"No routable road found near "
                            f"({attempt_lat}, {attempt_lon})"
                        ),
                    )
                    break

                attempt_points.append(snapped)

        if alternative_route is None:
            reason, detail = last_error or (
                "osrm_no_route",
                "Unknown failure",
            )
            _reject(waypoint_lat, waypoint_lon, reason, detail)
            continue

        route_coordinates = (
            alternative_route["geometry"].get("coordinates", [])
        )

        if not route_coordinates:
            _reject(
                waypoint_lat,
                waypoint_lon,
                "empty_geometry",
                "OSRM returned a route with no geometry",
            )
            continue

        # ----------------------------------------------------
        # Reject candidates that pass back through any known
        # blockage (not just the nearest one).
        # ----------------------------------------------------

        exclusion_radius_km = 1.0
        intersected_zone = None

        for zone_lat, zone_lon, zone_source in exclusion_zones:

            minimum_distance = min(
                haversine_distance_km(
                    lat,
                    lon,
                    zone_lat,
                    zone_lon,
                )
                for lon, lat in route_coordinates
            )

            if minimum_distance < exclusion_radius_km:
                intersected_zone = (zone_source, minimum_distance)
                break

        if intersected_zone is not None:
            zone_source, minimum_distance = intersected_zone
            _reject(
                waypoint_lat,
                waypoint_lon,
                "intersects_blocked_zone",
                (
                    f"Route passes within "
                    f"{round(minimum_distance, 2)} km of {zone_source}"
                ),
            )
            continue

        blockage_clearance_km = min(
            haversine_distance_km(
                lat,
                lon,
                blocked_lat,
                blocked_lon,
            )
            for lon, lat in route_coordinates
        )

        # ----------------------------------------------------
        # Run the complete local risk engine.
        # ----------------------------------------------------

        alternative_risk = calculate_route_risk(
            route_geometry=alternative_route["geometry"],
            db=db,
        )

        is_safe = (
            alternative_risk["risk_score"] < 80
            and not alternative_risk["reroute_required"]
        )

        if not is_safe:
            logger.warning(
                "Reroute candidate rejected by risk engine: "
                "waypoint=(%.5f, %.5f) risk_score=%s "
                "reroute_required=%s warnings=%s",
                waypoint_lat,
                waypoint_lon,
                alternative_risk["risk_score"],
                alternative_risk["reroute_required"],
                alternative_risk["warnings"],
            )

        alternatives.append(
            {
                "route": alternative_route,
                "risk": alternative_risk,
                "safe": is_safe,
                "waypoint": {
                    "latitude": waypoint_lat,
                    "longitude": waypoint_lon,
                },
                "blockage_clearance_km": round(
                    blockage_clearance_km,
                    2,
                ),
            }
        )


    # --------------------------------------------------------
    # 8. Safe alternatives
    # --------------------------------------------------------

    safe_alternatives = [
        alternative
        for alternative in alternatives
        if (
            alternative["risk"]["risk_score"] < 80
            and not alternative["risk"]["reroute_required"]
        )
    ]

    # --------------------------------------------------------
    # 9. No safe alternative
    # --------------------------------------------------------

    if not safe_alternatives:

        trip.status = "delayed"
        trip.last_reroute_reason = f"{blockage_source} - No safe alternative found"

        db.commit()
        db.refresh(trip)

        try:
            alert_service.create_alert(
                db=db,
                title=f"Trip #{trip.id} Delayed: No Safe Route",
                description=f"Trip #{trip.id} (Vehicle #{vehicle.id}) from {trip.origin} to {trip.destination} blocked by {blockage_source}. All alternative detours impassable.",
                severity="critical",
                alert_type="trip_delay",
                location=trip.origin,
                source_entity="trip",
                source_entity_id=trip.id,
                dedup_key=f"trip_delay:trip:{trip.id}"
            )
        except Exception:
            pass

        return {
            "trip_id": trip.id,
            "vehicle_id": vehicle.id,
            "status": trip.status,
            "reroute_required": True,
            "reason": "No safe alternative route found; corridor is blocked",
            "blockage": {
                "source": blockage_source,
                "title": blockage_source,
                "type": blockage_source.split(" ")[0].lower(),
                "distance_km": round(blockage_distance, 2),
                "latitude": blocked_lat,
                "longitude": blocked_lon,
            },
            "previous_route": {
                **primary_route,
                "risk_score": primary_risk.get("risk_score", 95.0),
                "risk_level": primary_risk.get("risk_level", "critical"),
            },
            "selected_route": None,
            "new_route": None,
            "previous_eta_minutes": trip.eta_minutes,
            "new_eta_minutes": trip.eta_minutes,
            "delay_minutes": 0,
            "previous_risk": primary_risk,
            "selected_risk": None,
            "safe_alternatives_count": 0,
            "safe_alternatives_found": 0,
            "alternatives_count": len(alternatives),
            "alternatives_evaluated": len(alternatives),
            "reroute_count": trip.reroute_count or 0,
            "last_reroute_reason": trip.last_reroute_reason,
            "alternatives": alternatives,
            "rejected_candidates": rejected_candidates,
        }

    # --------------------------------------------------------
    # 10. Select best safe route
    #
    # Priority:
    #   1. Lowest risk
    #   2. Shortest duration
    # --------------------------------------------------------

    safe_alternatives.sort(
        key=lambda item: (
            item["risk"]["risk_score"],
            item["route"]["duration_minutes"],
        )
    )

    recommended = safe_alternatives[0]

    selected_route = recommended["route"]
    selected_risk = recommended["risk"]

    # --------------------------------------------------------
    # 11. Update trip
    # --------------------------------------------------------

    previous_eta = trip.eta_minutes

    trip.status = "rerouting"

    trip.eta_minutes = (
        selected_route["duration_minutes"]
    )

    trip.route_distance_km = (
        selected_route["distance_km"]
    )

    trip.route_duration_minutes = (
        selected_route["duration_minutes"]
    )

    trip.current_route_geometry = json.dumps(selected_route["geometry"])
    trip.reroute_count = (trip.reroute_count or 0) + 1
    trip.last_reroute_reason = f"Avoided {blockage_source}"

    db.commit()
    db.refresh(trip)

    try:
        alert_service.create_alert(
            db=db,
            title=f"Safe Detour Active: Trip #{trip.id}",
            description=f"Trip #{trip.id} (Vehicle #{vehicle.id}) dynamically rerouted to avoid {blockage_source}. New ETA: {trip.eta_minutes} min ({round(selected_route['distance_km'], 1)} km).",
            severity="critical" if (trip.priority or "").lower() == "critical" else "high",
            alert_type="reroute",
            location=trip.origin,
            source_entity="trip",
            source_entity_id=trip.id,
            dedup_key=f"reroute:trip:{trip.id}:{trip.reroute_count}"
        )
    except Exception:
        pass

    # --------------------------------------------------------
    # 12. Calculate delay
    # --------------------------------------------------------

    delay_minutes = 0

    if previous_eta is not None:

        delay_minutes = max(
            0,
            selected_route["duration_minutes"]
            - previous_eta,
        )

    # --------------------------------------------------------
    # 13. Return rerouting decision
    # --------------------------------------------------------

    return {
        "trip_id": trip.id,
        "vehicle_id": vehicle.id,
        "status": trip.status,
        "reroute_required": True,
        "reason": (
            "Primary route is unsafe; "
            "safe alternative route selected"
        ),
        "origin_used": {
            "source": origin_source,
            "latitude": start_lat,
            "longitude": start_lon,
        },
        "blockage": {
            "source": blockage_source,
            "title": blockage_source,
            "type": blockage_source.split(" ")[0].lower(),
            "distance_km": round(blockage_distance, 2),
            "latitude": blocked_lat,
            "longitude": blocked_lon,
        },
        "previous_route": {
            **primary_route,
            "risk_score": primary_risk.get("risk_score", 95.0),
            "risk_level": primary_risk.get("risk_level", "critical"),
        },
        "selected_route": selected_route,
        "new_route": {
            **selected_route,
            "risk_score": selected_risk.get("risk_score", 25.0),
            "risk_level": selected_risk.get("risk_level", "low"),
        },
        "previous_eta_minutes": previous_eta,
        "new_eta_minutes": (
            selected_route["duration_minutes"]
        ),
        "delay_minutes": delay_minutes,
        "previous_risk": primary_risk,
        "selected_risk": selected_risk,
        "safe_alternatives_count": len(safe_alternatives),
        "safe_alternatives_found": len(safe_alternatives),
        "alternatives_count": len(alternatives),
        "alternatives_evaluated": len(alternatives),
        "reroute_count": trip.reroute_count,
        "last_reroute_reason": trip.last_reroute_reason,
        "alternatives": alternatives,
        "rejected_candidates": rejected_candidates,
    }
