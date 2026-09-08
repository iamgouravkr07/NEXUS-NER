import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)

def run_tests():
    print("Running Phase 0 Backend Tests...\n")
    
    # 1. GET /
    res = client.get("/")
    assert res.status_code == 200, f"GET / failed: {res.status_code} {res.text}"
    data = res.json()
    assert data["name"] == "NEXUS-NER"
    print("PASS: GET / ->", data)

    # 2. GET /health
    res = client.get("/health")
    assert res.status_code == 200, f"GET /health failed: {res.status_code} {res.text}"
    print("PASS: GET /health ->", res.json())

    # 3. GET /incidents/
    res = client.get("/incidents/")
    assert res.status_code == 200, f"GET /incidents/ failed: {res.status_code} {res.text}"
    print(f"PASS: GET /incidents/ -> {len(res.json())} incident(s)")

    # 4. GET /roads/
    res = client.get("/roads/")
    assert res.status_code == 200, f"GET /roads/ failed: {res.status_code} {res.text}"
    print(f"PASS: GET /roads/ -> {len(res.json())} road(s)")

    # 5. GET /vehicles/
    res = client.get("/vehicles/")
    assert res.status_code == 200, f"GET /vehicles/ failed: {res.status_code} {res.text}"
    print(f"PASS: GET /vehicles/ -> {len(res.json())} vehicle(s)")

    # 6. GET /trips/
    res = client.get("/trips/")
    assert res.status_code == 200, f"GET /trips/ failed: {res.status_code} {res.text}"
    print(f"PASS: GET /trips/ -> {len(res.json())} trip(s)")

    # 7. GET /risk/
    res = client.get("/risk/")
    assert res.status_code == 200, f"GET /risk/ failed: {res.status_code} {res.text}"
    risks = res.json()
    assert len(risks) > 0, "GET /risk/ returned empty list"
    assert "road" in risks[0] and "risk_score" in risks[0]
    print(f"PASS: GET /risk/ -> {len(risks)} monitored corridor(s), top: {risks[0]['road']} (Risk: {risks[0]['risk_score']})")

    # 8. POST /routes/calculate
    payload = {
        "origin_lat": 26.1445,
        "origin_lon": 91.7362,
        "destination_lat": 27.0844,
        "destination_lon": 93.6053,
    }
    res = client.post("/routes/calculate", json=payload)
    assert res.status_code == 200, f"POST /routes/calculate failed: {res.status_code} {res.text}"
    route = res.json()
    assert "distance_km" in route and "duration_minutes" in route and "geometry" in route
    print(f"PASS: POST /routes/calculate -> {route['distance_km']} km, {route['duration_minutes']} min, geometry points: {len(route['geometry']['coordinates'])}")

    print("\nALL 8 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()