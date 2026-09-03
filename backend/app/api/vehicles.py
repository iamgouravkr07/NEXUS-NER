
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleLocationUpdate,
    VehicleResponse,
    VehicleStatusUpdate,
)

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


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

    db_vehicle = Vehicle(
        vehicle_number=vehicle.vehicle_number,
        vehicle_type=vehicle.vehicle_type,
        cargo_type=vehicle.cargo_type,
        cargo_priority=vehicle.cargo_priority,
        status=vehicle.status,
        latitude=vehicle.latitude,
        longitude=vehicle.longitude,
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


@router.patch(
    "/{vehicle_id}/location",
    response_model=VehicleResponse
)
def update_vehicle_location(
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

    vehicle.latitude = location_update.latitude
    vehicle.longitude = location_update.longitude

    db.commit()
    db.refresh(vehicle)

    return vehicle


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

    allowed_statuses = {
        "idle",
        "in_transit",
        "delayed",
        "stopped",
        "delivered",
        "offline",
    }

    new_status = status_update.status.lower()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {sorted(allowed_statuses)}"
        )

    vehicle.status = new_status

    db.commit()
    db.refresh(vehicle)

    return vehicle
