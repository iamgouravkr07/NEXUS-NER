import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger("nexus_ner.websocket")


class ConnectionManager:
    """
    In-memory connection manager for real-time WebSocket clients.
    Maintains active connections, associates them with authenticated user context
    (user ID, role, assigned vehicle), and enforces RBAC on event broadcasting.
    """

    def __init__(self):
        # List of active client descriptor dicts:
        # {"ws": WebSocket, "user_id": int, "role": str, "assigned_vehicle_id": Optional[int]}
        self.active_connections: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int,
        role: str,
        assigned_vehicle_id: Optional[int] = None,
    ) -> None:
        """Accept WebSocket handshake and register client in connection pool."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append({
                "ws": websocket,
                "user_id": user_id,
                "role": role.upper().strip(),
                "assigned_vehicle_id": assigned_vehicle_id,
            })
        logger.info(
            "WebSocket client connected: user_id=%d, role=%s (active: %d)",
            user_id,
            role,
            len(self.active_connections),
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Safely remove disconnected client from pool."""
        async with self._lock:
            self.active_connections = [
                conn for conn in self.active_connections if conn["ws"] != websocket
            ]
        logger.info(
            "WebSocket client disconnected (remaining: %d)",
            len(self.active_connections),
        )

    def count_connections(self) -> int:
        """Return total active WebSocket connections."""
        return len(self.active_connections)

    async def broadcast(
        self,
        event_type: str,
        data: Dict[str, Any],
        target_vehicle_id: Optional[int] = None,
    ) -> int:
        """
        Broadcast a structured event to connected clients subject to RBAC:
        - ADMIN, CONTROL_OPERATOR, FIELD_OFFICER: receive all fleet events.
        - DRIVER: only receives events specifically matching their assigned vehicle.
        Returns count of clients to which the message was successfully dispatched.
        """
        payload = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        json_str = json.dumps(payload, default=str)

        async with self._lock:
            snapshot = list(self.active_connections)

        dispatched = 0
        stale_sockets = []

        for conn in snapshot:
            role = conn["role"]
            driver_veh_id = conn["assigned_vehicle_id"]

            # Role-based filtering for DRIVER
            if role == "DRIVER":
                if target_vehicle_id is not None and driver_veh_id != target_vehicle_id:
                    # Do not leak other vehicles' telemetry or anomalies to driver
                    continue

            ws: WebSocket = conn["ws"]
            try:
                await ws.send_text(json_str)
                dispatched += 1
            except Exception as err:
                logger.warning("Failed to send to WebSocket client: %s", err)
                stale_sockets.append(ws)

        if stale_sockets:
            async with self._lock:
                self.active_connections = [
                    conn for conn in self.active_connections if conn["ws"] not in stale_sockets
                ]

        return dispatched


# Global singleton instance
manager = ConnectionManager()
