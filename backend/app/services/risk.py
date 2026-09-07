from math import radians, sin, cos, sqrt, atan2

from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.road import Road


def haversine_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate distance between two GPS coordinates in kilometers."""

    earth_radius_km = 6371.0

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1))
        * cos(radians(lat2))
        * sin(dlon / 2) ** 2
    )

    return 2 * earth_radius_km * atan2(
        sqrt(a),
        sqrt(1 - a),
    )


def calculate_route_risk(
    db: Session,
    route_geometry: dict,
):
    """
    Evaluate road and verified incident risk along a GeoJSON route.

    Prototype approach:
    - Sample route coordinates.
    - Check nearby roads and verified incidents.
    - Use Haversine distance.
    - Blocked roads have critical risk.
    - Incidents have a tighter proximity radius so that
      a genuine detour is not incorrectly marked unsafe.
    """

    coordinates = route_geometry.get("coordinates", [])

    if not coordinates:
        return {
            "risk_score": 0,
            "risk_level": "low",
            "reroute_required": False,
            "warnings": [],
        }

    roads = db.query(Road).all()

    incidents = (
        db.query(Incident)
        .filter(Incident.status == "verified")
        .all()
    )

    risk_score = 0
    reroute_required = False
    warnings = set()
    blocked_roads = []

    # --------------------------------------------------------
    # Proximity thresholds
    # --------------------------------------------------------

    # A blocked/restricted road must be genuinely close to
    # the route before affecting its risk.
    road_proximity_km = 0.25

    # Incident reports use a tighter radius. This prevents a
    # detour several kilometers away from inheriting the
    # original incident's risk.
    incident_proximity_km = 0.50

    # --------------------------------------------------------
    # Check route points
    # --------------------------------------------------------

    for lon, lat in coordinates:

        # ----------------------------------------------------
        # Check roads
        # ----------------------------------------------------

        for road in roads:

            distance_km = haversine_distance_km(
                lat,
                lon,
                road.latitude,
                road.longitude,
            )

            if distance_km > road_proximity_km:
                continue

            if road.status == "blocked":
                risk_score = max(risk_score, 95)
                reroute_required = True

                warning = f"Blocked road detected: {road.road_name}"
                warnings.add(warning)

                if road.id not in blocked_roads:
                    blocked_roads.append(road.id)

            elif road.status == "restricted":

                risk_score = max(
                    risk_score,
                    50,
                )

                warnings.add(
                    f"Restricted road detected: {road.road_name}"
                )

            elif road.status == "under_repair":

                risk_score = max(
                    risk_score,
                    70,
                )

                warnings.add(
                    f"Road under repair: {road.road_name}"
                )

            else:

                risk_score = max(
                    risk_score,
                    int(road.risk_score or 0),
                )

        # ----------------------------------------------------
        # Check verified incidents
        # ----------------------------------------------------

        for incident in incidents:

            distance_km = haversine_distance_km(
                lat,
                lon,
                incident.latitude,
                incident.longitude,
            )

            if distance_km > incident_proximity_km:
                continue

            incident_risk = int(
                incident.risk_score or 0
            )

            risk_score = max(
                risk_score,
                incident_risk,
            )

            warnings.add(
                f"Verified {incident.incident_type} reported nearby"
            )

            if incident.severity.lower() == "critical":
                reroute_required = True

    # --------------------------------------------------------
    # Risk level
    # --------------------------------------------------------

    if risk_score >= 80:
        risk_level = "critical"

    elif risk_score >= 60:
        risk_level = "high"

    elif risk_score >= 30:
        risk_level = "medium"

    else:
        risk_level = "low"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reroute_required": reroute_required,
        "warnings": sorted(warnings),
        "blocked_road_ids": blocked_roads
    }