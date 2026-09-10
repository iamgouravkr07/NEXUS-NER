import asyncio
import os
import sys
import unittest
from fastapi.testclient import TestClient

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.services import auth_service
from app.services.websocket_manager import manager


class TestWebSockets(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_ws_1_unauthenticated_rejected(self):
        """WS-1: WebSocket connection without token is rejected."""
        with self.assertRaises(Exception):
            with self.client.websocket_connect("/ws") as ws:
                pass

    def test_ws_2_invalid_token_rejected(self):
        """WS-2: WebSocket connection with invalid token is rejected."""
        with self.assertRaises(Exception):
            with self.client.websocket_connect("/ws?token=invalid.jwt.token") as ws:
                pass

    def test_ws_3_authenticated_operator_and_heartbeat(self):
        """WS-3: Authenticated CONTROL_OPERATOR connects and receives acknowledgment and pong."""
        token = auth_service.create_access_token({
            "sub": "2",
            "username": "operator",
            "role": "CONTROL_OPERATOR",
        })

        with self.client.websocket_connect(f"/ws?token={token}") as ws:
            ack = ws.receive_json()
            self.assertEqual(ack["type"], "connection.acknowledged")
            self.assertEqual(ack["data"]["role"], "CONTROL_OPERATOR")
            self.assertEqual(ack["data"]["user_id"], 2)
            self.assertEqual(ack["data"]["status"], "connected")

            # Test heartbeat ping -> pong
            ws.send_json({"type": "ping"})
            pong = ws.receive_json()
            self.assertEqual(pong["type"], "pong")
            self.assertIn("timestamp", pong)

    def test_ws_4_role_filtering_driver(self):
        """
        WS-4: Role filtering ensures DRIVER receives assigned vehicle events
        and does NOT receive events for other vehicles.
        """
        driver_token = auth_service.create_access_token({
            "sub": "4",
            "username": "driver1",
            "role": "DRIVER",
        })

        # Driver assigned to Vehicle #1
        with self.client.websocket_connect(f"/ws?token={driver_token}&vehicle_id=1") as ws:
            ack = ws.receive_json()
            self.assertEqual(ack["type"], "connection.acknowledged")

            # Broadcast event for vehicle #2 (should NOT reach driver of vehicle #1)
            asyncio.run(manager.broadcast(
                event_type="vehicle.position.updated",
                data={"vehicle_id": 2, "latitude": 26.1, "longitude": 91.7},
                target_vehicle_id=2,
            ))

            # Broadcast event for vehicle #1 (SHOULD reach driver of vehicle #1)
            asyncio.run(manager.broadcast(
                event_type="vehicle.position.updated",
                data={"vehicle_id": 1, "latitude": 26.5, "longitude": 91.8},
                target_vehicle_id=1,
            ))

            # The driver should receive ONLY the event for vehicle #1
            msg = ws.receive_json()
            self.assertEqual(msg["type"], "vehicle.position.updated")
            self.assertEqual(msg["data"]["vehicle_id"], 1)

    def test_ws_5_admin_receives_all_fleet_events(self):
        """WS-5: ADMIN receives events for any vehicle in the fleet."""
        admin_token = auth_service.create_access_token({
            "sub": "1",
            "username": "admin",
            "role": "ADMIN",
        })

        with self.client.websocket_connect(f"/ws?token={admin_token}") as ws:
            ack = ws.receive_json()
            self.assertEqual(ack["type"], "connection.acknowledged")

            asyncio.run(manager.broadcast(
                event_type="vehicle.position.updated",
                data={"vehicle_id": 99, "latitude": 27.1, "longitude": 93.2},
                target_vehicle_id=99,
            ))

            msg = ws.receive_json()
            self.assertEqual(msg["type"], "vehicle.position.updated")
            self.assertEqual(msg["data"]["vehicle_id"], 99)

    def test_ws_6_disconnect_cleanup(self):
        """WS-6: Disconnected sockets are removed from ConnectionManager."""
        token = auth_service.create_access_token({
            "sub": "2",
            "username": "operator",
            "role": "CONTROL_OPERATOR",
        })

        initial_count = manager.count_connections()
        with self.client.websocket_connect(f"/ws?token={token}") as ws:
            _ = ws.receive_json()
            self.assertEqual(manager.count_connections(), initial_count + 1)

        # After exiting with block, socket is disconnected
        self.assertEqual(manager.count_connections(), initial_count)


if __name__ == "__main__":
    unittest.main()
