import json
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import SessionLocal
from app.main import app
from app.models.alert import Alert
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.services import auth_service


class TestPhase8Integration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # Clean up synthetic test data
        self.db.query(Alert).filter(Alert.dedup_key.like("anomaly:%:vehicle:8888%")).delete(synchronize_session=False)
        self.db.query(Trip).filter(Trip.origin == "TEST_P8_ORIGIN").delete(synchronize_session=False)
        self.db.query(Vehicle).filter(Vehicle.id.in_([88881, 88882])).delete(synchronize_session=False)
        self.db.commit()

        # Login as operator for authenticated REST calls
        login_res = self.client.post("/auth/login", json={"username": "operator", "password": "Operator@Nexus2026"})
        self.assertEqual(login_res.status_code, 200)
        self.token = login_res.json()["access_token"]
        self.auth_headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        self.db.query(Alert).filter(Alert.dedup_key.like("anomaly:%:vehicle:8888%")).delete(synchronize_session=False)
        self.db.query(Trip).filter(Trip.origin == "TEST_P8_ORIGIN").delete(synchronize_session=False)
        self.db.query(Vehicle).filter(Vehicle.id.in_([88881, 88882])).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def test_int_1_telemetry_to_websocket_position_broadcast(self):
        """
        INT-1: POST /vehicles/{id}/location broadcasts vehicle.position.updated
        to connected WebSocket client.
        """
        now = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        vehicle = Vehicle(
            id=88881,
            vehicle_number="TEST-P8-VH-1",
            vehicle_type="Truck",
            cargo_type="General",
            status="in_transit",
            latitude=26.1445,
            longitude=91.7362,
            last_gps_timestamp=now - timedelta(seconds=60),
        )
        self.db.add(vehicle)
        self.db.commit()

        # Connect WebSocket as CONTROL_OPERATOR
        with self.client.websocket_connect(f"/ws?token={self.token}") as ws:
            ack = ws.receive_json()
            self.assertEqual(ack["type"], "connection.acknowledged")

            # Post location update via REST API
            update_payload = {
                "latitude": 26.1480,
                "longitude": 91.7390,
                "timestamp": now.isoformat(),
                "status": "in_transit",
            }
            res = self.client.post(
                f"/vehicles/{vehicle.id}/location",
                json=update_payload,
                headers=self.auth_headers,
            )
            self.assertEqual(res.status_code, 200)

            # Check event received over WebSocket
            event = ws.receive_json()
            self.assertEqual(event["type"], "vehicle.position.updated")
            self.assertEqual(event["data"]["vehicle_id"], vehicle.id)
            self.assertEqual(event["data"]["latitude"], 26.1480)
            self.assertEqual(event["data"]["longitude"], 91.7390)
            self.assertEqual(event["data"]["status"], "in_transit")

    def test_int_2_anomaly_triggers_alert_and_websocket_events(self):
        """
        INT-2: Telemetry anomaly generates persistent Alert and broadcasts
        both vehicle.anomaly.detected and alert.created over WebSocket.
        """
        now = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)

        route_geom = {
            "type": "LineString",
            "coordinates": [
                [91.7362, 26.1445],  # Guwahati
                [92.7926, 26.6528],  # Tezpur
            ],
        }
        trip = Trip(
            vehicle_id=88882,
            origin="TEST_P8_ORIGIN",
            destination="TEST_P8_DEST",
            current_route_geometry=json.dumps(route_geom),
            status="active",
            cargo_type="Medical",
            priority="critical",
        )
        self.db.add(trip)
        self.db.commit()

        vehicle = Vehicle(
            id=88882,
            vehicle_number="TEST-P8-VH-2",
            vehicle_type="Truck",
            cargo_type="Medical",
            cargo_priority="critical",
            status="in_transit",
            latitude=26.1445,
            longitude=91.7362,
            current_trip_id=trip.id,
            last_gps_timestamp=now - timedelta(minutes=10),
        )
        self.db.add(vehicle)
        self.db.commit()

        with self.client.websocket_connect(f"/ws?token={self.token}") as ws:
            ack = ws.receive_json()
            self.assertEqual(ack["type"], "connection.acknowledged")

            # Post location update with route deviation (6.6 km off corridor in 10 mins = 40 km/h)
            update_payload = {
                "latitude": 26.0850,
                "longitude": 91.7362,
                "timestamp": now.isoformat(),
                "status": "in_transit",
            }
            res = self.client.post(
                f"/vehicles/{vehicle.id}/location",
                json=update_payload,
                headers=self.auth_headers,
            )
            self.assertEqual(res.status_code, 200)

            # Receive events from WebSocket:
            # 1. vehicle.position.updated
            # 2. vehicle.anomaly.detected
            # 3. alert.created
            received_events = []
            for _ in range(3):
                received_events.append(ws.receive_json())

            event_types = [e["type"] for e in received_events]
            self.assertIn("vehicle.position.updated", event_types)
            self.assertIn("vehicle.anomaly.detected", event_types)
            self.assertIn("alert.created", event_types)

            # Verify the anomaly event details
            anomaly_event = next(e for e in received_events if e["type"] == "vehicle.anomaly.detected")
            self.assertEqual(anomaly_event["data"]["anomaly_type"], "ROUTE_DEVIATION")
            self.assertEqual(anomaly_event["data"]["severity"], "critical")
            self.assertEqual(anomaly_event["data"]["vehicle_id"], vehicle.id)

            # Verify the alert event details and persistence
            alert_event = next(e for e in received_events if e["type"] == "alert.created")
            self.assertIn("Vehicle Anomaly", alert_event["data"]["title"])
            alert_id = alert_event["data"]["id"]

            saved_alert = self.db.query(Alert).filter(Alert.id == alert_id).first()
            self.assertIsNotNone(saved_alert)
            self.assertEqual(saved_alert.alert_type, "vehicle")

    def test_int_3_rest_polling_fallback_independent_of_websocket(self):
        """
        INT-3: REST endpoints (/vehicles/, /alerts/summary) function perfectly
        even when no WebSocket client is connected (REST polling fallback).
        """
        now = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        vehicle = Vehicle(
            id=88881,
            vehicle_number="TEST-P8-VH-1",
            vehicle_type="Truck",
            cargo_type="General",
            status="in_transit",
            latitude=26.1445,
            longitude=91.7362,
            last_gps_timestamp=now,
        )
        self.db.add(vehicle)
        self.db.commit()

        # REST polling fetch vehicles
        res_veh = self.client.get("/vehicles/")
        self.assertEqual(res_veh.status_code, 200)
        vehicles = res_veh.json()
        self.assertTrue(any(v["id"] == 88881 for v in vehicles))

        # REST polling fetch alert summary
        res_alert = self.client.get("/alerts/summary")
        self.assertEqual(res_alert.status_code, 200)
        summary = res_alert.json()
        self.assertIn("total", summary)
        self.assertIn("critical", summary)


if __name__ == "__main__":
    unittest.main()
