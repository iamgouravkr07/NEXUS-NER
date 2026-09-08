
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleLocationResponse,
    VehicleLocationUpdate,
    VehicleResponse,
    VehicleStatusUpdate,
)

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
    db: Session = Depends(get_db)
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


def _apply_location_update(
    vehicle: Vehicle,
    location_update: VehicleLocationUpdate,
    db: Session
) -> Vehicle:
    vehicle.latitude = location_update.latitude
    vehicle.longitude = location_update.longitude
    vehicle.last_gps_timestamp = (
        location_update.timestamp
        if location_update.timestamp is not None
        else datetime.now(timezone.utc)
    )

    if location_update.status is not None:
        normalized_status = location_update.status.lower()
        if normalized_status in ALLOWED_STATUSES:
            vehicle.status = normalized_status

    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch(
    "/{vehicle_id}/location",
    response_model=VehicleResponse
)
def update_vehicle_location_patch(
    vehicle_id: int,
    location_update: VehicleLocationUpdate,
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

    return _apply_location_update(vehicle, location_update, db)


@router.post(
    "/{vehicle_id}/location",
    response_model=VehicleResponse
)
def update_vehicle_location_post(
    vehicle_id: int,
    location_update: VehicleLocationUpdate,
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

