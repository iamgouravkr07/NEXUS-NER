import json
import sys
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
from geoalchemy2.elements import WKTElement

client = TestClient(app)

# Authenticate test client as CONTROL_OPERATOR for operational reroute permissions
_login_res = client.post("/auth/login", json={"username": "operator", "password": "Operator@Nexus2026"})
if _login_res.status_code == 200:
    client.headers["Authorization"] = f"Bearer {_login_res.json()['access_token']}"


def cleanup_test_data(db):
    """Clean up synthetic test rows."""
    db.query(Trip).filter(Trip.origin.like("TEST_%")).delete(synchronize_session=False)
    db.query(Vehicle).filter(Vehicle.vehicle_number.like("TEST-VH-%")).delete(synchronize_session=False)
    db.query(Incident).filter(Incident.description.like("TEST_%")).delete(synchronize_session=False)
    db.query(Road).filter(Road.road_name.like("TEST_RD_%")).delete(synchronize_session=False)
    db.commit()


def test_scenario_a_normal_trip_no_blockage():
    """TEST A: Normal trip with no blockage. Expected: normal route remains usable."""
    db = SessionLocal()
    cleanup_test_data(db)

    vehicle = Vehicle(
        vehicle_number="TEST-VH-A",
        vehicle_type="Truck",
        cargo_type="Pharmaceuticals",
        cargo_priority="high",
        status="idle",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    trip = Trip(
        vehicle_id=vehicle.id,
        origin="TEST_Guwahati",
        destination="TEST_Shillong",
        origin_lat=26.1445,
        origin_lon=91.7362,
        destination_lat=25.5788,
        destination_lon=91.8933,
        cargo_type="Pharmaceuticals",
        priority="high",
        status="planned",
        eta_minutes=180,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    response = client.post(f"/trips/{trip.id}/reroute")
    assert response.status_code == 200, f"Reroute failed: {response.text}"
    data = response.json()

    assert data["reroute_required"] is False
    assert data["reason"] == "Current route is safe"
    assert data["selected_route"] is not None
    assert data["selected_route"]["distance_km"] > 0
    assert data["delay_minutes"] == 0

    db.refresh(trip)
    assert trip.status in {"planned", "active"}
    assert trip.current_route_geometry is not None
    assert trip.last_reroute_reason == "Current route is safe"

    print("PASS: TEST A - Normal trip with no blockage verified.")
    db.close()


def test_scenario_b_verified_blockage_triggers_reroute():
    """TEST B: Verified blockage intersects primary route. Expected: reroute_required = true and safe alternative is selected."""
    db = SessionLocal()
    cleanup_test_data(db)

    vehicle = Vehicle(
        vehicle_number="TEST-VH-B",
        vehicle_type="Truck",
        cargo_type="Medical Supplies",
        cargo_priority="critical",
        status="in_transit",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    # Trip: Guwahati to Tezpur
    trip = Trip(
        vehicle_id=vehicle.id,
        origin="TEST_Guwahati",
        destination="TEST_Tezpur",
        origin_lat=26.1445,
        origin_lon=91.7362,
        destination_lat=26.6528,
        destination_lon=92.7926,
        cargo_type="Medical Supplies",
        priority="critical",
        status="active",
        eta_minutes=240,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # Get primary route and place a blockage on it
    route_res = client.post("/routes/calculate", json={
        "origin_lat": 26.1445,
        "origin_lon": 91.7362,
        "destination_lat": 26.6528,
        "destination_lon": 92.7926,
    })
    assert route_res.status_code == 200
    route_coords = route_res.json()["geometry"]["coordinates"]
    midpoint = route_coords[len(route_coords) // 2]  # [lon, lat]
    block_lon, block_lat = midpoint

    incident = Incident(
        incident_type="landslide",
        severity="critical",
        description="TEST_Major landslide blocking highway",
        latitude=block_lat,
        longitude=block_lon,
        location=WKTElement(f"POINT({block_lon} {block_lat})", srid=4326),
        road_status="blocked",
        status="verified",
        risk_score=95,
    )
    db.add(incident)
    db.commit()

    response = client.post(f"/trips/{trip.id}/reroute")
    assert response.status_code == 200, f"Reroute failed: {response.text}"
    data = response.json()

    assert data["reroute_required"] is True
    assert data["blockage"] is not None
    assert "Verified landslide" in data["blockage"]["source"]
    assert data["status"] == "rerouting"
    assert data["selected_route"] is not None
    assert data["safe_alternatives_count"] >= 1

    db.refresh(trip)
    assert trip.reroute_count >= 1
    assert "Avoided" in trip.last_reroute_reason
    assert trip.current_route_geometry is not None

    print(f"PASS: TEST B - Verified blockage triggered safe detour (safe alternatives: {data['safe_alternatives_count']}).")
    db.close()


def test_scenario_c_reject_alternative_intersecting_blockage():
    """TEST C: Alternative route that passes through blockage is rejected."""
    db = SessionLocal()
    cleanup_test_data(db)

    vehicle = Vehicle(
        vehicle_number="TEST-VH-C",
        vehicle_type="Truck",
        cargo_type="Food Grains",
        cargo_priority="high",
        status="in_transit",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    trip = Trip(
        vehicle_id=vehicle.id,
        origin="TEST_Guwahati",
        destination="TEST_Tezpur",
        origin_lat=26.1445,
        origin_lon=91.7362,
        destination_lat=26.6528,
        destination_lon=92.7926,
        cargo_type="Food Grains",
        priority="high",
        status="active",
        eta_minutes=240,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    route_res = client.post("/routes/calculate", json={
        "origin_lat": 26.1445,
        "origin_lon": 91.7362,
        "destination_lat": 26.6528,
        "destination_lon": 92.7926,
    })
    assert route_res.status_code == 200
    route_coords = route_res.json()["geometry"]["coordinates"]
    midpoint = route_coords[len(route_coords) // 2]
    block_lon, block_lat = midpoint

    incident = Incident(
        incident_type="flood",
        severity="critical",
        description="TEST_Flash flood",
        latitude=block_lat,
        longitude=block_lon,
        location=WKTElement(f"POINT({block_lon} {block_lat})", srid=4326),
        road_status="blocked",
        status="verified",
        risk_score=95,
    )
    db.add(incident)
    db.commit()

    response = client.post(f"/trips/{trip.id}/reroute")
    assert response.status_code == 200
    data = response.json()

    # Verify that candidate routes passing within 1 km of the blockage are strictly rejected
    rejected = data.get("rejected_candidates", [])
    zone_rejections = [r for r in rejected if r.get("reason") == "intersects_blocked_zone"]
    assert len(zone_rejections) > 0, "Expected at least one candidate rejected for intersecting blockage zone"
    assert "passes within" in zone_rejections[0]["detail"]

    print(f"PASS: TEST C - Rejected {len(zone_rejections)} alternative candidate(s) intersecting blockage zone.")
    db.close()


def test_scenario_d_no_safe_alternative_exists():
    """TEST D: Destination road is completely blocked. Expected: no safe alternative exists, trip marked delayed."""
    db = SessionLocal()
    cleanup_test_data(db)

    dest_lat = 25.5788
    dest_lon = 91.8933

    vehicle = Vehicle(
        vehicle_number="TEST-VH-D",
        vehicle_type="Truck",
        cargo_type="Fuel",
        cargo_priority="critical",
        status="in_transit",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    trip = Trip(
        vehicle_id=vehicle.id,
        origin="TEST_Guwahati",
        destination="TEST_Shillong",
        origin_lat=26.1445,
        origin_lon=91.7362,
        destination_lat=dest_lat,
        destination_lon=dest_lon,
        cargo_type="Fuel",
        priority="critical",
        status="active",
        eta_minutes=180,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # The access road directly at the destination point is blocked
    # Every single candidate detour route MUST terminate here, so no alternative can clear it
    blocked_road = Road(
        road_name="TEST_RD_TerminalAccess",
        road_type="primary",
        status="blocked",
        risk_score=95.0,
        latitude=dest_lat,
        longitude=dest_lon,
        location=WKTElement(f"POINT({dest_lon} {dest_lat})", srid=4326),
    )
    db.add(blocked_road)
    db.commit()

    response = client.post(f"/trips/{trip.id}/reroute")
    assert response.status_code == 200
    data = response.json()

    assert data["reroute_required"] is True
    assert data["selected_route"] is None
    assert data["status"] == "delayed"
    assert "No safe alternative" in data["reason"]

    db.refresh(trip)
    assert trip.status == "delayed"
    assert "No safe alternative found" in trip.last_reroute_reason

    print("PASS: TEST D - Correctly reported 'No safe alternative found' and marked trip delayed.")
    db.close()


def test_scenario_e_vehicle_current_gps_position():
    """TEST E: Vehicle has a current GPS position. Expected: rerouting begins from vehicle's current position."""
    db = SessionLocal()
    cleanup_test_data(db)

    # Vehicle is already at mid-point (26.3000, 92.0000)
    current_gps_lat = 26.5000
    current_gps_lon = 92.5000

    vehicle = Vehicle(
        vehicle_number="TEST-VH-E",
        vehicle_type="Truck",
        cargo_type="Electronics",
        cargo_priority="normal",
        status="in_transit",
        latitude=current_gps_lat,
        longitude=current_gps_lon,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    # Trip original origin was Guwahati (26.1445, 91.7362)
    trip = Trip(
        vehicle_id=vehicle.id,
        origin="TEST_Guwahati",
        destination="TEST_Tezpur",
        origin_lat=26.1445,
        origin_lon=91.7362,
        destination_lat=26.6528,
        destination_lon=92.7926,
        cargo_type="Electronics",
        priority="normal",
        status="active",
        eta_minutes=240,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    response = client.post(f"/trips/{trip.id}/reroute")
    assert response.status_code == 200
    data = response.json()

    origin_used = data.get("origin_used")
    assert origin_used is not None
    assert origin_used["source"] == "vehicle_gps"
    assert origin_used["latitude"] == current_gps_lat
    assert origin_used["longitude"] == current_gps_lon
    assert data["selected_route"]["distance_km"] < 100.0

    print(f"PASS: TEST E - Reroute started from vehicle GPS ({current_gps_lat}, {current_gps_lon}) instead of trip origin.")
    db.close()


def test_scenario_f_reroute_auth_and_frontend_contract():
    """TEST F: Verify RBAC authentication requirement on /trips/{id}/reroute and RoutePlanner.tsx contract."""
    db = SessionLocal()
    cleanup_test_data(db)

    # 1. Create a trip
    vehicle = Vehicle(
        vehicle_number="TEST-VH-F",
        vehicle_type="Truck",
        cargo_type="Medical Supplies",
        cargo_priority="critical",
        status="in_transit",
        latitude=26.1445,
        longitude=91.7362,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    trip = Trip(
        vehicle_id=vehicle.id,
        origin="TEST_Guwahati",
        destination="TEST_Shillong",
        origin_lat=26.1445,
        origin_lon=91.7362,
        destination_lat=25.5788,
        destination_lon=91.8933,
        cargo_type="Medical Supplies",
        priority="critical",
        status="in_transit",
        eta_minutes=150,
        route_distance_km=98.5,
        route_duration_minutes=150,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # 2. Unauthenticated request MUST return 401 Unauthorized
    unauth_client = TestClient(app)
    unauth_resp = unauth_client.post(f"/trips/{trip.id}/reroute")
    assert unauth_resp.status_code == 401, f"Expected 401 for unauthenticated reroute, got {unauth_resp.status_code}"

    # 3. FIELD_OFFICER role MUST return 403 Forbidden
    officer_login = client.post("/auth/login", json={"username": "officer", "password": "Officer@Nexus2026"})
    if officer_login.status_code == 200:
        officer_token = officer_login.json()["access_token"]
        officer_resp = client.post(f"/trips/{trip.id}/reroute", headers={"Authorization": f"Bearer {officer_token}"})
        assert officer_resp.status_code == 403, f"Expected 403 for FIELD_OFFICER reroute, got {officer_resp.status_code}"

    # 4. CONTROL_OPERATOR or ADMIN role MUST succeed with 200 OK
    operator_login = client.post("/auth/login", json={"username": "operator", "password": "Operator@Nexus2026"})
    assert operator_login.status_code == 200
    operator_token = operator_login.json()["access_token"]
    op_resp = client.post(f"/trips/{trip.id}/reroute", headers={"Authorization": f"Bearer {operator_token}"})
    assert op_resp.status_code == 200, f"Expected 200 for CONTROL_OPERATOR reroute, got {op_resp.status_code}"

    # 5. Verify frontend RoutePlanner.tsx code integrity
    frontend_path = backend_dir.parent / "frontend" / "src" / "pages" / "RoutePlanner.tsx"
    assert frontend_path.exists(), "RoutePlanner.tsx file not found"
    code = frontend_path.read_text(encoding="utf-8")

    # Verify useAuth imported and used
    assert 'import { useAuth } from "../context/AuthContext"' in code, "RoutePlanner must import useAuth"
    assert "const { getAuthHeader } = useAuth()" in code, "RoutePlanner must consume getAuthHeader()"
    assert "...getAuthHeader()" in code, "RoutePlanner reroute request must spread getAuthHeader()"

    # Verify API_URL reads from environment with safe fallback to http://127.0.0.1:8000
    assert "VITE_API_URL" in code, "RoutePlanner must read VITE_API_URL"
    assert "http://127.0.0.1:8000" in code, "RoutePlanner must fall back to http://127.0.0.1:8000"

    print("PASS: TEST F - Dynamic reroute RBAC authentication and frontend contract verified.")
    cleanup_test_data(db)
    db.close()


def run_all():
    print("==================================================")
    print("EXECUTING PHASE 1 DYNAMIC REROUTING TEST SUITE")
    print("==================================================\n")
    test_scenario_a_normal_trip_no_blockage()
    test_scenario_b_verified_blockage_triggers_reroute()
    test_scenario_c_reject_alternative_intersecting_blockage()
    test_scenario_d_no_safe_alternative_exists()
    test_scenario_e_vehicle_current_gps_position()
    test_scenario_f_reroute_auth_and_frontend_contract()
    print("\n==================================================")
    print("ALL PHASE 1 SCENARIO TESTS (A, B, C, D, E, F) PASSED!")
    print("==================================================")

    db = SessionLocal()
    cleanup_test_data(db)
    db.close()


if __name__ == "__main__":
    run_all()