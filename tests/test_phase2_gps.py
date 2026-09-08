import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.database import SessionLocal
from app.models.incident import Incident
from app.models.road import Road
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.services.gps_simulator import DeterministicGPSSimulator

from geoalchemy2.elements import WKTElement

client = TestClient(app)

# Authenticate test client as CONTROL_OPERATOR for operational GPS and reroute tests
_login_res = client.post("/auth/login", json={"username": "operator", "password": "Operator@Nexus2026"})
if _login_res.status_code == 200:
    client.headers["Authorization"] = f"Bearer {_login_res.json()['access_token']}"


def cleanup_test_data(db):
    """Clean up synthetic test entities."""
    db.query(Trip).filter(Trip.origin.like("TEST_P2_%")).delete(synchronize_session=False)
    db.query(Vehicle).filter(Vehicle.vehicle_number.like("TEST-P2-%")).delete(synchronize_session=False)
    db.query(Incident).filter(Incident.description.like("TEST_P2_%")).delete(synchronize_session=False)
    db.commit()


def test_scenario_a_valid_gps_update():
    """Scenario A: Valid GPS location update via PATCH and POST /vehicles/{id}/location."""
    db = SessionLocal()
    cleanup_test_data(db)

    vehicle = Vehicle(
        vehicle_number="TEST-P2-VH-A",
        vehicle_type="Truck",
        cargo_type="Medical",
        cargo_priority="high",
        status="idle",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    # 1. Test PATCH
    iso_time = "2026-09-08T12:30:00Z"
    patch_payload = {
        "latitude": 26.2500,
        "longitude": 91.8500,
        "timestamp": iso_time,
        "status": "in_transit",
    }
    patch_res = client.patch(f"/vehicles/{vehicle.id}/location", json=patch_payload)
    assert patch_res.status_code == 200, f"PATCH failed: {patch_res.text}"
    patch_data = patch_res.json()
    assert patch_data["latitude"] == 26.2500
    assert patch_data["longitude"] == 91.8500
    assert patch_data["status"] == "in_transit"
    assert patch_data["last_gps_timestamp"] is not None

    # 2. Test POST
    post_payload = {
        "latitude": 26.3000,
        "longitude": 91.9000,
        "timestamp": "2026-09-08T12:35:00Z",
    }
    post_res = client.post(f"/vehicles/{vehicle.id}/location", json=post_payload)
    assert post_res.status_code == 200, f"POST failed: {post_res.text}"
    post_data = post_res.json()
    assert post_data["latitude"] == 26.3000
    assert post_data["longitude"] == 91.9000

    print("PASS: Scenario A - Valid GPS updates via PATCH and POST verified.")
    db.close()


def test_scenario_b_invalid_coordinates():
    """Scenario B: Invalid coordinates validation (out of range bounds, types)."""
    db = SessionLocal()
    cleanup_test_data(db)

    vehicle = Vehicle(
        vehicle_number="TEST-P2-VH-B",
        vehicle_type="Truck",
        cargo_type="Medical",
        cargo_priority="normal",
        status="idle",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    # 1. Latitude > 90
    res1 = client.patch(f"/vehicles/{vehicle.id}/location", json={"latitude": 95.0, "longitude": 91.7})
    assert res1.status_code == 422, f"Expected 422 for lat > 90, got {res1.status_code}"

    # 2. Latitude < -90
    res2 = client.patch(f"/vehicles/{vehicle.id}/location", json={"latitude": -91.0, "longitude": 91.7})
    assert res2.status_code == 422, f"Expected 422 for lat < -90, got {res2.status_code}"

    # 3. Longitude > 180
    res3 = client.patch(f"/vehicles/{vehicle.id}/location", json={"latitude": 26.1, "longitude": 185.0})
    assert res3.status_code == 422, f"Expected 422 for lon > 180, got {res3.status_code}"

    # 4. Longitude < -180
    res4 = client.patch(f"/vehicles/{vehicle.id}/location", json={"latitude": 26.1, "longitude": -185.0})
    assert res4.status_code == 422, f"Expected 422 for lon < -180, got {res4.status_code}"

    # 5. Non-numeric
    res5 = client.patch(f"/vehicles/{vehicle.id}/location", json={"latitude": "invalid", "longitude": 91.7})
    assert res5.status_code == 422, f"Expected 422 for non-numeric, got {res5.status_code}"

    print("PASS: Scenario B - Invalid coordinates properly rejected with 422.")
    db.close()


def test_scenario_c_gps_persistence():
    """Scenario C: Direct database persistence of latest vehicle position and timestamp."""
    db = SessionLocal()
    cleanup_test_data(db)

    vehicle = Vehicle(
        vehicle_number="TEST-P2-VH-C",
        vehicle_type="Van",
        cargo_type="Perishables",
        cargo_priority="high",
        status="idle",
        latitude=26.1000,
        longitude=91.7000,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    test_time = datetime(2026, 9, 8, 15, 45, 0, tzinfo=timezone.utc)
    client.patch(
        f"/vehicles/{vehicle.id}/location",
        json={
            "latitude": 26.4250,
            "longitude": 91.9550,
            "timestamp": test_time.isoformat(),
            "status": "in_transit",
        },
    )

    # Fresh DB session query to verify persistence
    db.expire_all()
    persisted = db.query(Vehicle).filter(Vehicle.id == vehicle.id).first()
    assert persisted is not None
    assert round(persisted.latitude, 4) == 26.4250
    assert round(persisted.longitude, 4) == 91.9550
    assert persisted.status == "in_transit"
    assert persisted.last_gps_timestamp is not None
    assert persisted.last_gps_timestamp.year == 2026

    print("PASS: Scenario C - Database persistence of GPS coords and timestamp verified.")
    db.close()


def test_scenario_d_latest_position_retrieval():
    """Scenario D: Retrieval of latest GPS fix via GET /vehicles/{id}/location."""
    db = SessionLocal()
    cleanup_test_data(db)

    vehicle = Vehicle(
        vehicle_number="TEST-P2-VH-D",
        vehicle_type="Truck",
        cargo_type="Fuel",
        cargo_priority="critical",
        status="in_transit",
        latitude=26.5500,
        longitude=92.1200,
        last_gps_timestamp=datetime(2026, 9, 8, 16, 0, 0, tzinfo=timezone.utc),
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    res = client.get(f"/vehicles/{vehicle.id}/location")
    assert res.status_code == 200, f"GET location failed: {res.text}"
    data = res.json()
    assert data["vehicle_id"] == vehicle.id
    assert data["vehicle_number"] == "TEST-P2-VH-D"
    assert data["latitude"] == 26.5500
    assert data["longitude"] == 92.1200
    assert data["status"] == "in_transit"
    assert "timestamp" in data and data["timestamp"] is not None

    print("PASS: Scenario D - Latest position retrieval endpoint verified.")
    db.close()


def test_scenario_e_rerouting_starts_from_latest_gps_position():
    """Scenario E: Dynamic rerouting uses vehicle's updated GPS position as origin."""
    db = SessionLocal()
    cleanup_test_data(db)

    # 1. Setup vehicle starting in Guwahati
    vehicle = Vehicle(
        vehicle_number="TEST-P2-VH-E",
        vehicle_type="Truck",
        cargo_type="Relief Supplies",
        cargo_priority="critical",
        status="in_transit",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    # 2. Setup trip: Guwahati -> Tezpur
    trip = Trip(
        vehicle_id=vehicle.id,
        origin="TEST_P2_Guwahati",
        destination="TEST_P2_Tezpur",
        origin_lat=26.1445,
        origin_lon=91.7362,
        destination_lat=26.6528,
        destination_lon=92.7926,
        cargo_type="Relief Supplies",
        priority="critical",
        status="active",
        eta_minutes=150,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # 3. Add blockage at midpoint
    midpoint_lat = 26.40463
    midpoint_lon = 91.92531
    incident = Incident(
        incident_type="landslide",
        severity="critical",
        status="verified",
        description="TEST_P2_Critical Landslide on NH-27",
        latitude=midpoint_lat,
        longitude=midpoint_lon,
        location=WKTElement(f"POINT({midpoint_lon} {midpoint_lat})", srid=4326),
    )
    db.add(incident)
    db.commit()

    # 4. Advance vehicle along route (e.g. to Baihata Chariali / intermediate coordinate)
    intermediate_lat = 26.3450
    intermediate_lon = 91.7200
    update_res = client.patch(
        f"/vehicles/{vehicle.id}/location",
        json={
            "latitude": intermediate_lat,
            "longitude": intermediate_lon,
            "status": "in_transit",
        },
    )
    assert update_res.status_code == 200

    # 5. Trigger reroute
    reroute_res = client.post(f"/trips/{trip.id}/reroute")
    assert reroute_res.status_code == 200, f"Reroute failed: {reroute_res.text}"
    data = reroute_res.json()

    # Verify origin used
    assert "origin_used" in data, "origin_used missing from reroute response"
    assert data["origin_used"]["source"] == "vehicle_gps"
    assert round(data["origin_used"]["latitude"], 4) == intermediate_lat
    assert round(data["origin_used"]["longitude"], 4) == intermediate_lon

    # Verify selected detour route coordinates start near vehicle's intermediate position
    selected_geom = data["selected_route"]["geometry"]["coordinates"]
    start_lon, start_lat = selected_geom[0]
    # OSRM snaps to road, so within 2 km of intermediate point
    from app.services.risk import haversine_distance_km
    dist_from_vehicle = haversine_distance_km(start_lat, start_lon, intermediate_lat, intermediate_lon)
    assert dist_from_vehicle < 2.0, f"Detour start point ({start_lat}, {start_lon}) is too far ({dist_from_vehicle} km) from vehicle position ({intermediate_lat}, {intermediate_lon})"

    print(f"PASS: Scenario E - Rerouting successfully started from vehicle GPS (dist: {dist_from_vehicle:.3f} km).")
    db.close()


def test_scenario_f_simulator_produces_deterministic_updates():
    """Scenario F: GPS Simulator produces identical, deterministic sequence of positions."""
    start = (26.1445, 91.7362)
    end = (26.6528, 92.7926)

    sim1 = DeterministicGPSSimulator(start_point=start, end_point=end, total_steps=10, interval_seconds=5.0)
    sim2 = DeterministicGPSSimulator(start_point=start, end_point=end, total_steps=10, interval_seconds=5.0)

    steps1 = sim1.generate_all_steps()
    steps2 = sim2.generate_all_steps()

    assert len(steps1) == 11
    assert len(steps2) == 11

    for i in range(len(steps1)):
        s1 = steps1[i]
        s2 = steps2[i]
        assert s1["step"] == s2["step"] == i
        assert s1["latitude"] == s2["latitude"]
        assert s1["longitude"] == s2["longitude"]
        assert s1["timestamp"] == s2["timestamp"]
        assert s1["progress_pct"] == s2["progress_pct"]

    # Monotonic progress check
    assert steps1[0]["progress_pct"] == 0.0
    assert steps1[-1]["progress_pct"] == 100.0
    assert steps1[0]["latitude"] == round(start[0], 6)
    assert steps1[-1]["latitude"] == round(end[0], 6)

    for i in range(1, len(steps1)):
        assert steps1[i]["distance_traveled_km"] >= steps1[i - 1]["distance_traveled_km"]

    print("PASS: Scenario F - Deterministic GPS simulator produces identical, monotonically advancing steps.")


def run_all():
    print("==================================================")
    print("RUNNING PHASE 2 AUTOMATED TEST SUITE")
    print("==================================================")
    test_scenario_a_valid_gps_update()
    test_scenario_b_invalid_coordinates()
    test_scenario_c_gps_persistence()
    test_scenario_d_latest_position_retrieval()
    test_scenario_e_rerouting_starts_from_latest_gps_position()
    test_scenario_f_simulator_produces_deterministic_updates()
    print("==================================================")
    print("ALL 6 PHASE 2 SCENARIO TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_all()
