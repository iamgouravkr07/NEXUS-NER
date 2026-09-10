import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.services import auth_service
from app.services.websocket_manager import manager

logger = logging.getLogger("nexus_ner.websocket")

router = APIRouter(tags=["WebSocket Real-Time"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    vehicle_id: Optional[int] = Query(None),
):
    """
    Authenticated real-time WebSocket connection endpoint.
    Expects JWT access token via query parameter `?token=<token>`.
    Drivers may optionally pass `?vehicle_id=<id>` to identify assigned vehicle.
    Rejects unauthenticated or invalid tokens with close code 4001 (Unauthorized).
    """
    if not token:
        logger.warning("WebSocket connection rejected: Missing token")
        await websocket.close(code=4001, reason="Authentication token required")
        return

    payload = auth_service.decode_access_token(token)
    if not payload:
        logger.warning("WebSocket connection rejected: Invalid or expired token")
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id_str = payload.get("sub")
    role = payload.get("role", "DRIVER").upper().strip()

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        logger.warning("WebSocket connection rejected: Malformed user ID in token")
        await websocket.close(code=4001, reason="Malformed token subject")
        return

    # Validated connection: register in ConnectionManager
    await manager.connect(
        websocket=websocket,
        user_id=user_id,
        role=role,
        assigned_vehicle_id=vehicle_id,
    )

    # Send initial connection acknowledgment event
    ack_event = {
        "type": "connection.acknowledged",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "user_id": user_id,
            "role": role,
            "assigned_vehicle_id": vehicle_id,
            "status": "connected",
        },
    }
    await websocket.send_text(json.dumps(ack_event))

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                msg = json.loads(raw_text)
            except Exception:
                continue

            # Heartbeat ping/pong
            if isinstance(msg, dict) and msg.get("type") == "ping":
                pong_reply = {
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await websocket.send_text(json.dumps(pong_reply))

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as err:
        logger.warning("WebSocket communication error: %s", err)
        await manager.disconnect(websocket)
