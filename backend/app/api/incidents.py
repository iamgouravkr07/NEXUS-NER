from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.database import get_db
from app.models.incident import Incident
from app.schemas.incident import IncidentCreate, IncidentResponse


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
        risk_score=risk_score
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