from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.database import get_db
from app.models.road import Road
from app.schemas.road import (
    RoadCreate,
    RoadResponse,
    RoadStatusUpdate
)


router = APIRouter(
    prefix="/roads",
    tags=["Roads"]
)


@router.post("/", response_model=RoadResponse)
def create_road(
    road: RoadCreate,
    db: Session = Depends(get_db)
):
    db_road = Road(
        road_name=road.road_name,
        road_type=road.road_type,
        status=road.status,
        risk_score=road.risk_score,
        latitude=road.latitude,
        longitude=road.longitude,
        location=WKTElement(
            f"POINT({road.longitude} {road.latitude})",
            srid=4326
        )
    )

    db.add(db_road)
    db.commit()
    db.refresh(db_road)

    return db_road


@router.get("/", response_model=list[RoadResponse])
def get_roads(
    db: Session = Depends(get_db)
):
    return db.query(Road).order_by(Road.id.desc()).all()


@router.get("/{road_id}", response_model=RoadResponse)
def get_road(
    road_id: int,
    db: Session = Depends(get_db)
):
    road = db.query(Road).filter(
        Road.id == road_id
    ).first()

    if not road:
        raise HTTPException(
            status_code=404,
            detail="Road not found"
        )

    return road


@router.patch("/{road_id}/status", response_model=RoadResponse)
def update_road_status(
    road_id: int,
    status_update: RoadStatusUpdate,
    db: Session = Depends(get_db)
):
    road = db.query(Road).filter(
        Road.id == road_id
    ).first()

    if not road:
        raise HTTPException(
            status_code=404,
            detail="Road not found"
        )

    allowed_statuses = {
        "open",
        "restricted",
        "blocked",
        "under_repair"
    }

    new_status = status_update.status.lower()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {sorted(allowed_statuses)}"
        )

    road.status = new_status

    # Basic deterministic risk mapping for now.
    road.risk_score = {
        "open": 0,
        "restricted": 50,
        "blocked": 95,
        "under_repair": 70
    }[new_status]

    db.commit()
    db.refresh(road)

    return road