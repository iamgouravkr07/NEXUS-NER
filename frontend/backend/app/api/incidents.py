from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement
from app.models.road import Road
from app.database import get_db
from app.models.incident import Incident
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate
)


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"]
)


@router.post("/", response_model=IncidentResponse)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db)
):
    risk_score = {
        "low": 25,
        "medium": 50,
        "high": 75,
        "critical": 95
    }.get(incident.severity.lower(), 50)

    db_incident = Incident(
        incident_type=incident.incident_type,
        severity=incident.severity,
        description=incident.description,
        latitude=incident.latitude,
        longitude=incident.longitude,
        location=WKTElement(
            f"POINT({incident.longitude} {incident.latitude})",
            srid=4326
        ),
        road_status=incident.road_status,
        status="reported",
        risk_score=risk_score,
        affected_road_id=incident.affected_road_id
    )

    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)

    return db_incident


@router.get("/", response_model=list[IncidentResponse])
def get_incidents(
    db: Session = Depends(get_db)
):
    return db.query(Incident).order_by(Incident.id.desc()).all()


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    status_update: IncidentStatusUpdate,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    allowed_statuses = {
        "reported",
        "verified",
        "rejected",
        "resolved"
    }

    new_status = status_update.status.lower()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {sorted(allowed_statuses)}"
        )

    incident.status = new_status

    # When a disruption is verified, update the affected road.
    if new_status == "verified" and incident.affected_road_id:

        road = db.query(Road).filter(
            Road.id == incident.affected_road_id
        ).first()

        if not road:
            raise HTTPException(
                status_code=404,
                detail="Affected road not found"
            )

        if incident.incident_type.lower() in {
            "landslide",
            "flood",
            "road_damage"
        }:
            road.status = "blocked"
            road.risk_score = 95

    db.commit()
    db.refresh(incident)

    return incident