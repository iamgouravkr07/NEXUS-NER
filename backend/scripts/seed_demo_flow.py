#!/usr/bin/env python3
"""
NEXUS-NER — UNIFIED SIH 2026 DEMO HARNESS & SCENARIO ORCHESTRATOR
================================================================
Deterministic, repeatable, and idempotent demo seeder staging the
end-to-end NEXUS-NER operational demonstration:
PREDICT -> DECIDE -> TRACK -> RESPOND

Corridor: Guwahati (26.1445, 91.7362) -> Tezpur (26.6528, 92.7926)
Vehicle:  AS-01-BX-4091 (Critical Vaccines & Cold-Chain Supplies)
Trip:     Guwahati -> Tezpur (Active, Real OSRM Geometry)
Incident: [DEMO-SIH-2026] Major landslide blocking NH-15 corridor near Kharupetia
Road:     NH-15 Guwahati-Tezpur Corridor
Users:    admin, operator, field_officer, driver
"""

import argparse
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sys

# Ensure backend package is in python path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database import SessionLocal
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.road import Road
from app.models.incident import Incident
from app.services.auth_service import seed_initial_users_if_empty
from app.services.routing import calculate_route
from app.config import (
    BOOTSTRAP_ADMIN_PASSWORD,
    BOOTSTRAP_OPERATOR_PASSWORD,
    BOOTSTRAP_FIELD_PASSWORD,
    BOOTSTRAP_DRIVER_PASSWORD,
)
from geoalchemy2.elements import WKTElement

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nexus_ner.demo_seed")

# Deterministic Demo Constants
DEMO_VEHICLE_NUMBER = "AS-01-BX-4091"
DEMO_VEHICLE_TYPE = "Heavy Carrier"
DEMO_CARGO_TYPE = "Critical Vaccines & Cold-Chain Supplies"
DEMO_CARGO_PRIORITY = "critical"

DEMO_ORIGIN_NAME = "Guwahati, Assam"
DEMO_ORIGIN_LAT = 26.1445
DEMO_ORIGIN_LON = 91.7362

DEMO_DESTINATION_NAME = "Tezpur, Assam"
DEMO_DESTINATION_LAT = 26.6528
DEMO_DESTINATION_LON = 92.7926

DEMO_ROAD_NAME = "NH-15 Guwahati-Tezpur Corridor"
DEMO_BLOCKAGE_LAT = 26.40463
DEMO_BLOCKAGE_LON = 91.925314

DEMO_INCIDENT_DESC = "[DEMO-SIH-2026] Major landslide blocking NH-15 corridor near Kharupetia"
DEMO_INCIDENT_TYPE = "landslide"
DEMO_INCIDENT_SEVERITY = "critical"


def load_or_calculate_route():
    """Fetch live OSRM route geometry or fall back to cached local GeoJSON."""
    fallback_file = Path(__file__).resolve().parent / "demo_route_geometry.json"
    try:
        logger.info("Calculating live OSRM route for Guwahati -> Tezpur...")
        route = calculate_route(
            origin_lat=DEMO_ORIGIN_LAT,
            origin_lon=DEMO_ORIGIN_LON,
            destination_lat=DEMO_DESTINATION_LAT,
            destination_lon=DEMO_DESTINATION_LON,
        )
        # Update fallback file if writable
        try:
            with open(fallback_file, "w", encoding="utf-8") as f:
                json.dump(route, f)
        except Exception:
            pass
        return route
    except Exception as exc:
        logger.warning("OSRM online calculation failed (%s); loading cached fallback route...", exc)
        if fallback_file.exists():
            with open(fallback_file, "r", encoding="utf-8") as f:
                return json.load(f)
        else:
            # Minimal straight-line fallback if cache unavailable
            return {
                "distance_km": 157.76,
                "duration_minutes": 126,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [DEMO_ORIGIN_LON, DEMO_ORIGIN_LAT],
                        [DEMO_BLOCKAGE_LON, DEMO_BLOCKAGE_LAT],
                        [DEMO_DESTINATION_LON, DEMO_DESTINATION_LAT],
                    ],
                },
            }


def seed_demo_scenario(db=None) -> dict:
    """
    Seed or reset the deterministic SIH 2026 demo scenario.
    Idempotent: Safe to execute repeatedly.
    """
    close_session_on_finish = False
    if db is None:
        db = SessionLocal()
        close_session_on_finish = True

    try:
        # 1. Ensure Demo Users
        seed_initial_users_if_empty(db)

        # 2. Road Fixture (Starts OPEN, risk 15)
        road = db.query(Road).filter(Road.road_name == DEMO_ROAD_NAME).first()
        if not road:
            road = Road(
                road_name=DEMO_ROAD_NAME,
                road_type="National Highway",
                status="open",
                risk_score=15.0,
                latitude=DEMO_BLOCKAGE_LAT,
                longitude=DEMO_BLOCKAGE_LON,
                location=WKTElement(f"POINT({DEMO_BLOCKAGE_LON} {DEMO_BLOCKAGE_LAT})", srid=4326),
            )
            db.add(road)
            db.commit()
            db.refresh(road)
            logger.info("Created Demo Road #%d: %s", road.id, road.road_name)
        else:
            road.status = "open"
            road.risk_score = 15.0
            road.latitude = DEMO_BLOCKAGE_LAT
            road.longitude = DEMO_BLOCKAGE_LON
            db.commit()
            db.refresh(road)
            logger.info("Reset Demo Road #%d to OPEN", road.id)

        # 3. Incident Fixture (Starts REPORTED / UNVERIFIED)
        incident = db.query(Incident).filter(
            Incident.description.like("%[DEMO-SIH-2026]%")
        ).first()

        # If not found, check legacy incident #15 at identical coordinates and adopt it
        if not incident:
            inc15 = db.query(Incident).filter(Incident.id == 15).first()
            if inc15 and inc15.latitude == DEMO_BLOCKAGE_LAT:
                incident = inc15

        if not incident:
            incident = Incident(
                incident_type=DEMO_INCIDENT_TYPE,
                severity=DEMO_INCIDENT_SEVERITY,
                description=DEMO_INCIDENT_DESC,
                latitude=DEMO_BLOCKAGE_LAT,
                longitude=DEMO_BLOCKAGE_LON,
                location=WKTElement(f"POINT({DEMO_BLOCKAGE_LON} {DEMO_BLOCKAGE_LAT})", srid=4326),
                road_status="blocked",
                status="reported",  # UNVERIFIED
                risk_score=95.0,
                affected_road_id=road.id,
                reported_at=datetime.now(timezone.utc),
            )
            db.add(incident)
            db.commit()
            db.refresh(incident)
            logger.info("Created Demo Incident #%d: UNVERIFIED (%s)", incident.id, incident.status)
        else:
            incident.description = DEMO_INCIDENT_DESC
            incident.incident_type = DEMO_INCIDENT_TYPE
            incident.severity = DEMO_INCIDENT_SEVERITY
            incident.latitude = DEMO_BLOCKAGE_LAT
            incident.longitude = DEMO_BLOCKAGE_LON
            incident.road_status = "blocked"
            incident.status = "reported"  # Always reset to UNVERIFIED for repeat demos
            incident.risk_score = 95.0
            incident.affected_road_id = road.id
            db.commit()
            db.refresh(incident)
            logger.info("Reset Demo Incident #%d to UNVERIFIED (reported)", incident.id)

        # De-conflict other verified incidents at this exact coordinate if any exist
        other_verified_at_coord = db.query(Incident).filter(
            Incident.id != incident.id,
            Incident.latitude == DEMO_BLOCKAGE_LAT,
            Incident.longitude == DEMO_BLOCKAGE_LON,
            Incident.status == "verified",
        ).all()
        for other in other_verified_at_coord:
            other.status = "resolved"
        if other_verified_at_coord:
            db.commit()

        # 4. Vehicle Fixture
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == DEMO_VEHICLE_NUMBER).first()
        if not vehicle:
            vehicle = Vehicle(
                vehicle_number=DEMO_VEHICLE_NUMBER,
                vehicle_type=DEMO_VEHICLE_TYPE,
                cargo_type=DEMO_CARGO_TYPE,
                cargo_priority=DEMO_CARGO_PRIORITY,
                status="in_transit",
                latitude=DEMO_ORIGIN_LAT,
                longitude=DEMO_ORIGIN_LON,
                last_gps_timestamp=datetime.now(timezone.utc),
                current_trip_id=None,
            )
            db.add(vehicle)
            db.commit()
            db.refresh(vehicle)
            logger.info("Created Demo Vehicle #%d: %s", vehicle.id, vehicle.vehicle_number)
        else:
            vehicle.vehicle_type = DEMO_VEHICLE_TYPE
            vehicle.cargo_type = DEMO_CARGO_TYPE
            vehicle.cargo_priority = DEMO_CARGO_PRIORITY
            vehicle.status = "in_transit"
            vehicle.latitude = DEMO_ORIGIN_LAT
            vehicle.longitude = DEMO_ORIGIN_LON
            vehicle.last_gps_timestamp = datetime.now(timezone.utc)
            db.commit()
            db.refresh(vehicle)
            logger.info("Reset Demo Vehicle #%d coordinates to Guwahati (%s)", vehicle.id, vehicle.vehicle_number)

        # 5. Trip Fixture
        route_data = load_or_calculate_route()
        trip = db.query(Trip).filter(
            Trip.vehicle_id == vehicle.id,
            Trip.origin == DEMO_ORIGIN_NAME,
            Trip.destination == DEMO_DESTINATION_NAME,
        ).first()

        if not trip:
            trip = Trip(
                vehicle_id=vehicle.id,
                origin=DEMO_ORIGIN_NAME,
                destination=DEMO_DESTINATION_NAME,
                origin_lat=DEMO_ORIGIN_LAT,
                origin_lon=DEMO_ORIGIN_LON,
                destination_lat=DEMO_DESTINATION_LAT,
                destination_lon=DEMO_DESTINATION_LON,
                cargo_type=DEMO_CARGO_TYPE,
                priority=DEMO_CARGO_PRIORITY,
                status="active",
                eta_minutes=route_data.get("duration_minutes", 126),
                route_distance_km=route_data.get("distance_km", 157.76),
                route_duration_minutes=route_data.get("duration_minutes", 126),
                current_route_geometry=json.dumps(route_data["geometry"]),
                reroute_count=0,
                last_reroute_reason=None,
            )
            db.add(trip)
            db.commit()
            db.refresh(trip)
            logger.info("Created Demo Trip #%d: %s -> %s", trip.id, trip.origin, trip.destination)
        else:
            trip.status = "active"
            trip.origin_lat = DEMO_ORIGIN_LAT
            trip.origin_lon = DEMO_ORIGIN_LON
            trip.destination_lat = DEMO_DESTINATION_LAT
            trip.destination_lon = DEMO_DESTINATION_LON
            trip.cargo_type = DEMO_CARGO_TYPE
            trip.priority = DEMO_CARGO_PRIORITY
            trip.eta_minutes = route_data.get("duration_minutes", 126)
            trip.route_distance_km = route_data.get("distance_km", 157.76)
            trip.route_duration_minutes = route_data.get("duration_minutes", 126)
            trip.current_route_geometry = json.dumps(route_data["geometry"]),
            # If current_route_geometry was a tuple from trailing comma in previous seeds, ensure clean string
            if isinstance(trip.current_route_geometry, tuple):
                trip.current_route_geometry = trip.current_route_geometry[0]
            trip.reroute_count = 0
            trip.last_reroute_reason = None
            db.commit()
            db.refresh(trip)
            logger.info("Reset Demo Trip #%d to ACTIVE route", trip.id)

        # 6. Link Vehicle & Trip
        vehicle.current_trip_id = trip.id
        trip.vehicle_id = vehicle.id
        db.commit()

        demo_state = {
            "seeded_at": datetime.now(timezone.utc).isoformat(),
            "demo_users": [
                {"role": "ADMIN", "username": "admin", "demo_password": BOOTSTRAP_ADMIN_PASSWORD},
                {"role": "CONTROL_OPERATOR", "username": "operator", "demo_password": BOOTSTRAP_OPERATOR_PASSWORD},
                {"role": "FIELD_OFFICER", "username": "field_officer", "demo_password": BOOTSTRAP_FIELD_PASSWORD},
                {"role": "DRIVER", "username": "driver", "demo_password": BOOTSTRAP_DRIVER_PASSWORD},
            ],
            "vehicle": {
                "id": vehicle.id,
                "vehicle_number": vehicle.vehicle_number,
                "vehicle_type": vehicle.vehicle_type,
                "cargo_type": vehicle.cargo_type,
                "status": vehicle.status,
                "latitude": vehicle.latitude,
                "longitude": vehicle.longitude,
            },
            "trip": {
                "id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "origin": trip.origin,
                "destination": trip.destination,
                "status": trip.status,
                "eta_minutes": trip.eta_minutes,
                "distance_km": trip.route_distance_km,
                "reroute_count": trip.reroute_count,
            },
            "incident": {
                "id": incident.id,
                "incident_type": incident.incident_type,
                "severity": incident.severity,
                "status": incident.status,
                "description": incident.description,
                "latitude": incident.latitude,
                "longitude": incident.longitude,
                "affected_road_id": incident.affected_road_id,
            },
            "road": {
                "id": road.id,
                "road_name": road.road_name,
                "status": road.status,
                "risk_score": road.risk_score,
                "latitude": road.latitude,
                "longitude": road.longitude,
            },
        }

        # Write state to local JSON file for orchestrator scripts
        state_file = Path(__file__).resolve().parent / "demo_state.json"
        with open(state_file, "w", encoding="utf-8") as sf:
            json.dump(demo_state, sf, indent=2)

        return demo_state

    except Exception as exc:
        db.rollback()
        logger.error("Failed to seed demo scenario: %s", exc)
        raise
    finally:
        if close_session_on_finish:
            db.close()


def print_demo_banner(state: dict):
    """Print clean, professional SIH 2026 presentation banner."""
    v = state["vehicle"]
    t = state["trip"]
    inc = state["incident"]
    rd = state["road"]

    print("\n" + "=" * 70)
    print(" NEXUS-NER — SIH 2026 UNIFIED DEMONSTRATION HARNESS")
    print("=" * 70)
    print(f" DEMO CORRIDOR : {t['origin']} -> {t['destination']} (NH-15)")
    print(f" DEMO VEHICLE  : #{v['id']} | {v['vehicle_number']} ({v['cargo_type']})")
    print(f" DEMO TRIP     : #{t['id']} | Status: {t['status'].upper()} | Dist: {t['distance_km']} km | ETA: {t['eta_minutes']} min")
    print(f" DEMO INCIDENT : #{inc['id']} | [{inc['severity'].upper()}] {inc['incident_type'].upper()} | Status: {inc['status'].upper()} (UNVERIFIED)")
    print(f" AFFECTED ROAD : #{rd['id']} | {rd['road_name']} | Status: {rd['status'].upper()}")
    print("-" * 70)
    print(" DEMONSTRATION USER ACCOUNTS (Role-Based Access Control):")
    for u in state["demo_users"]:
        print(f"  * {u['role']:<16} : {u['username']:<14} (Password: {u['demo_password']})")
    print("-" * 70)
    print(" SIX-STEP SIH 2026 PRESENTATION NARRATIVE:")
    print("  1. CONTROL TOWER   : Observe normal operations (Trip #%d, Vehicle #%d at Guwahati)." % (t['id'], v['id']))
    print("  2. INCIDENTS       : Show unverified landslide Incident #%d, then click 'Verify'." % inc['id'])
    print("  3. ROUTE PLANNER   : Select Trip #%d, run Dynamic Reroute, see real detour." % t['id'])
    print("  4. LIVE TELEMETRY  : Run GPS simulator to stream live movement & anomalies:")
    print(f"                       python scripts/simulate_vehicle.py --vehicle-id {v['id']} --interval 2.0")
    print("  5. FIELD APP       : Demonstrate multilingual offline reporting + auto sync.")
    print("  6. NLP ASSISTANT   : Paste raw SITREP text to extract structured incident.")
    print("=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="NEXUS-NER SIH 2026 Unified Demo Seeder")
    parser.add_argument("--json", action="store_true", help="Output raw JSON state")
    args = parser.parse_args()

    state = seed_demo_scenario()

    if args.json:
        print(json.dumps(state, indent=2))
    else:
        print_demo_banner(state)


if __name__ == "__main__":
    main()
