
import logging
import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert
from app.models.vehicle import Vehicle
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleLocationResponse,
    VehicleLocationUpdate,
    VehicleResponse,
    VehicleStatusUpdate,
)
from app.api.auth import require_roles, get_current_user
from app.services.vehicle_anomaly_service import VehicleAnomalyService, haversine_km
from app.services.websocket_manager import manager

logger = logging.getLogger("nexus_ner.vehicles")

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

ALLOWED_STATUSES = {
    "idle",
    "in_transit",
    "delayed",
    "stopped",
    "delivered",
    "offline",
}


@router.post("/", response_model=VehicleResponse)
def create_vehicle(
    vehicle: VehicleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("ADMIN")),
):
    existing = db.query(Vehicle).filter(
        Vehicle.vehicle_number == vehicle.vehicle_number
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Vehicle number already exists"
        )

    last_gps = vehicle.last_gps_timestamp
    if last_gps is None and vehicle.latitude is not None and vehicle.longitude is not None:
        last_gps = datetime.now(timezone.utc)

    db_vehicle = Vehicle(
        vehicle_number=vehicle.vehicle_number,
        vehicle_type=vehicle.vehicle_type,
        cargo_type=vehicle.cargo_type,
        cargo_priority=vehicle.cargo_priority,
        status=vehicle.status,
        latitude=vehicle.latitude,
        longitude=vehicle.longitude,
        last_gps_timestamp=last_gps,
        current_trip_id=vehicle.current_trip_id,
    )

    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)

    return db_vehicle


@router.get("/", response_model=list[VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).order_by(Vehicle.id.desc()).all()


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    return vehicle


@router.get(
    "/{vehicle_id}/location",
    response_model=VehicleLocationResponse
)
def get_vehicle_location(
    vehicle_id: int,
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    if vehicle.latitude is None or vehicle.longitude is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle GPS coordinates not available"
        )

    return VehicleLocationResponse(
        vehicle_id=vehicle.id,
        vehicle_number=vehicle.vehicle_number,
        latitude=vehicle.latitude,
        longitude=vehicle.longitude,
        timestamp=vehicle.last_gps_timestamp,
        status=vehicle.status,
        current_trip_id=vehicle.current_trip_id,
    )


def _broadcast_sync(event_type: str, data: dict, target_vehicle_id: Optional[int] = None):
    """Safely dispatch WebSocket event from synchronous API context."""
    try:
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                manager.broadcast(event_type, data, target_vehicle_id),
                loop,
            )
        else:
            asyncio.run(manager.broadcast(event_type, data, target_vehicle_id))
    except Exception as err:
        logger.warning("Could not broadcast WebSocket event %s: %s", event_type, err)


def _apply_location_update(
    vehicle: Vehicle,
    location_update: VehicleLocationUpdate,
    db: Session
) -> Vehicle:
    prev_lat = vehicle.latitude
    prev_lon = vehicle.longitude
    prev_time = vehicle.last_gps_timestamp

    new_time = (
        location_update.timestamp
        if location_update.timestamp is not None
        else datetime.now(timezone.utc)
    )

    # 1. Anomaly evaluation before state mutation
    anomaly = None
    try:
        anomaly = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=location_update.latitude,
            new_lon=location_update.longitude,
            new_timestamp=new_time,
            new_status=location_update.status,
            db=db,
        )
    except Exception as err:
        logger.warning("Anomaly evaluation failed for vehicle #%d: %s", vehicle.id, err)

    # 2. Compute speed and heading for telemetry broadcast
    speed_kmh = 0.0
    heading_deg = 0.0
    if prev_lat is not None and prev_lon is not None and prev_time is not None:
        c_new = new_time if new_time.tzinfo else new_time.replace(tzinfo=timezone.utc)
        c_prev = prev_time if prev_time.tzinfo else prev_time.replace(tzinfo=timezone.utc)
        dt = (c_new - c_prev).total_seconds()
        if dt > 0.5:
            d_km = haversine_km(prev_lat, prev_lon, location_update.latitude, location_update.longitude)
            speed_kmh = round((d_km / dt) * 3600.0, 1)

            phi1 = math.radians(prev_lat)
            phi2 = math.radians(location_update.latitude)
            dlambda = math.radians(location_update.longitude - prev_lon)
            y = math.sin(dlambda) * math.cos(phi2)
            x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
            heading_deg = round((math.degrees(math.atan2(y, x)) + 360.0) % 360.0, 1)

    # 3. Apply state mutation and persist
    vehicle.latitude = location_update.latitude
    vehicle.longitude = location_update.longitude
    vehicle.last_gps_timestamp = new_time

    if location_update.status is not None:
        normalized_status = location_update.status.lower()
        if normalized_status in ALLOWED_STATUSES:
            vehicle.status = normalized_status

    db.commit()
    db.refresh(vehicle)

    # 4. Broadcast live position update
    position_payload = {
        "vehicle_id": vehicle.id,
        "vehicle_number": vehicle.vehicle_number,
        "latitude": vehicle.latitude,
        "longitude": vehicle.longitude,
        "speed_kmh": speed_kmh,
        "heading_deg": heading_deg,
        "status": vehicle.status,
        "current_trip_id": vehicle.current_trip_id,
    }
    _broadcast_sync("vehicle.position.updated", position_payload, target_vehicle_id=vehicle.id)

    # 5. Broadcast anomaly & alert events if detected
    if anomaly is not None:
        anomaly_payload = {
            "anomaly_id": anomaly.anomaly_id,
            "vehicle_id": anomaly.vehicle_id,
            "vehicle_number": anomaly.vehicle_number,
            "anomaly_type": anomaly.anomaly_type.value,
            "severity": anomaly.severity.value,
            "confidence": anomaly.confidence,
            "description": anomaly.description,
            "telemetry": anomaly.telemetry.model_dump(),
            "alert_id": anomaly.alert_id,
        }
        _broadcast_sync("vehicle.anomaly.detected", anomaly_payload, target_vehicle_id=vehicle.id)

        if anomaly.alert_id:
            alert = db.query(Alert).filter(Alert.id == anomaly.alert_id).first()
            if alert:
                alert_payload = {
                    "id": alert.id,
                    "title": alert.title,
                    "description": alert.description,
                    "severity": alert.severity,
                    "alert_type": alert.alert_type,
                    "location": alert.location,
                    "status": alert.status,
                    "created_at": alert.created_at.isoformat() if alert.created_at else None,
                }
                _broadcast_sync("alert.created", alert_payload)

    return vehicle


@router.patch(
    "/{vehicle_id}/location",
    response_model=VehicleResponse
)
def update_vehicle_location_patch(
    vehicle_id: int,
    location_update: VehicleLocationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    return _apply_location_update(vehicle, location_update, db)


@router.post(
    "/{vehicle_id}/location",
    response_model=VehicleResponse
)
def update_vehicle_location_post(
    vehicle_id: int,
    location_update: VehicleLocationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    return _apply_location_update(vehicle, location_update, db)


@router.patch(
    "/{vehicle_id}/status",
    response_model=VehicleResponse
)
def update_vehicle_status(
    vehicle_id: int,
    status_update: VehicleStatusUpdate,
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    new_status = status_update.status.lower()

    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {sorted(ALLOWED_STATUSES)}"
        )

    vehicle.status = new_status

    db.commit()
    db.refresh(vehicle)

    return vehicle

