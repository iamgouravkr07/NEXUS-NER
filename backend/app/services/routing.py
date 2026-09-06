import logging
from math import radians, degrees, sin, cos, asin, atan2

import requests


logger = logging.getLogger("nexus_ner.routing")

OSRM_BASE_URL = "https://router.project-osrm.org"


def _format_route(route):
    return {
        "distance_km": round(route["distance"] / 1000, 2),
        "duration_minutes": round(route["duration"] / 60),
        "geometry": route["geometry"],
    }


def calculate_route(
    origin_lat: float,
    origin_lon: float,
    destination_lat: float,
    destination_lon: float,
):
    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{origin_lon},{origin_lat};"
        f"{destination_lon},{destination_lat}"
    )

    params = {
        "overview": "full",
        "geometries": "geojson",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError("No route found")

    return _format_route(data["routes"][0])


def calculate_alternative_routes(
    origin_lat: float,
    origin_lon: float,
    destination_lat: float,
    destination_lon: float,
):
    """
    Request multiple routes from OSRM.

    The public OSRM demo server may return only one route because
    alternative routing depends on server configuration.
    """

    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{origin_lon},{origin_lat};"
        f"{destination_lon},{destination_lat}"
    )

    params = {
        "overview": "full",
        "geometries": "geojson",
        "alternatives": "true",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError("No alternative routes found")

    return [_format_route(route) for route in data["routes"]]


def calculate_route_via_waypoint(
    origin_lat: float,
    origin_lon: float,
    waypoint_lat: float,
    waypoint_lon: float,
    destination_lat: float,
    destination_lon: float,
):
    """
    Calculate a route forced through a waypoint.

    Kept for compatibility with existing /routes endpoints.
    """

    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{origin_lon},{origin_lat};"
        f"{waypoint_lon},{waypoint_lat};"
        f"{destination_lon},{destination_lat}"
    )

    params = {
        "overview": "full",
        "geometries": "geojson",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError(
            f"No route found through waypoint: "
            f"{waypoint_lat}, {waypoint_lon}"
        )

    return _format_route(data["routes"][0])


# ================================================================
# Corridor detour helpers
#
# These are additive (new) functions used by the reroute workflow
# to generate *meaningful* detour waypoints instead of blind, huge
# lat/lon offsets. They do not modify calculate_route(),
# calculate_alternative_routes(), or calculate_route_via_waypoint(),
# which are preserved above for other endpoints.
# ================================================================

def calculate_bearing(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Initial compass bearing (0-360 degrees) from point 1 to point 2."""

    lat1_r = radians(lat1)
    lat2_r = radians(lat2)
    dlon = radians(lon2 - lon1)

    x = sin(dlon) * cos(lat2_r)
    y = (
        cos(lat1_r) * sin(lat2_r)
        - sin(lat1_r) * cos(lat2_r) * cos(dlon)
    )

    bearing = degrees(atan2(x, y))
    return (bearing + 360) % 360


def offset_point(
    lat: float,
    lon: float,
    bearing_deg: float,
    distance_km: float,
) -> tuple[float, float]:
    """Offset a lat/lon point by distance_km along bearing_deg."""

    earth_radius_km = 6371.0

    bearing = radians(bearing_deg)
    lat1 = radians(lat)
    lon1 = radians(lon)
    angular_distance = distance_km / earth_radius_km

    lat2 = asin(
        sin(lat1) * cos(angular_distance)
        + cos(lat1) * sin(angular_distance) * cos(bearing)
    )
    lon2 = lon1 + atan2(
        sin(bearing) * sin(angular_distance) * cos(lat1),
        cos(angular_distance) - sin(lat1) * sin(lat2),
    )

    return degrees(lat2), degrees(lon2)


def generate_corridor_waypoints(
    blocked_lat: float,
    blocked_lon: float,
    corridor_bearing_deg: float,
    distances_km: list | None = None,
) -> list[tuple[float, float]]:
    """
    Generate deterministic detour waypoints around a blockage.

    Waypoints are placed *perpendicular* to the local road corridor
    direction (corridor_bearing_deg), on both the left and right
    side of the blockage, at a progression of realistic detour
    distances. This produces meaningful "go around the landslide"
    candidates instead of blind, arbitrarily large lat/lon jumps
    that are unlikely to land near any real road.
    """

    if distances_km is None:
        distances_km = [5, 10, 20, 35, 50]

    right_bearing = (corridor_bearing_deg + 90) % 360
    left_bearing = (corridor_bearing_deg - 90) % 360

    waypoints = []

    for distance_km in distances_km:
        for bearing in (right_bearing, left_bearing):
            waypoints.append(
                offset_point(
                    blocked_lat,
                    blocked_lon,
                    bearing,
                    distance_km,
                )
            )

    return waypoints


def snap_to_road(lat: float, lon: float):
    """
    Snap an arbitrary lat/lon to the nearest routable road using
    OSRM's /nearest service.

    Returns (snapped_lat, snapped_lon) or None if OSRM has no
    routable road near this point (or the request fails). Callers
    must treat None as an explicit rejection reason, not a silent
    skip.
    """

    url = f"{OSRM_BASE_URL}/nearest/v1/driving/{lon},{lat}"

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
    except requests.RequestException as error:
        logger.info("OSRM /nearest request failed for (%s, %s): %s", lat, lon, error)
        return None

    data = response.json()

    if data.get("code") != "Ok" or not data.get("waypoints"):
        logger.info("OSRM /nearest found no routable road near (%s, %s)", lat, lon)
        return None

    snapped_lon, snapped_lat = data["waypoints"][0]["location"]
    return snapped_lat, snapped_lon