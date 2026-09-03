from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.trip import (
    TripCreate,
    TripEtaUpdate,
    TripResponse,
    TripStatusUpdate,
)

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.post("/", response_model=TripResponse)
def create_trip(
    trip: TripCreate,
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == trip.vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    db_trip = Trip(
        vehicle_id=trip.vehicle_id,
        origin=trip.origin,
        destination=trip.destination,
        cargo_type=trip.cargo_type,
        priority=trip.priority,
        status=trip.status,
        eta_minutes=trip.eta_minutes,
        route_distance_km=trip.route_distance_km,
        route_duration_minutes=trip.route_duration_minutes,
    )

    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)

    vehicle.current_trip_id = db_trip.id

    if vehicle.status == "idle":
        vehicle.status = "in_transit"

    db.commit()

    return db_trip


@router.get("/", response_model=list[TripResponse])
def get_trips(db: Session = Depends(get_db)):
    return db.query(Trip).order_by(Trip.id.desc()).all()


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter(
        Trip.id == trip_id
    ).first()

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    return trip


@router.patch(
    "/{trip_id}/status",
    response_model=TripResponse
)
def update_trip_status(
    trip_id: int,
    status_update: TripStatusUpdate,
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter(
        Trip.id == trip_id
    ).first()

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    allowed_statuses = {
        "planned",
        "active",
        "delayed",
        "rerouting",
        "completed",
        "cancelled",
    }

    new_status = status_update.status.lower()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {sorted(allowed_statuses)}"
        )

    trip.status = new_status

    db.commit()
    db.refresh(trip)

    return trip


@router.patch(
    "/{trip_id}/eta",
    response_model=TripResponse
)
def update_trip_eta(
    trip_id: int,
    eta_update: TripEtaUpdate,
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter(
        Trip.id == trip_id
    ).first()

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    trip.eta_minutes = eta_update.eta_minutes

    db.commit()
    db.refresh(trip)

    return trip