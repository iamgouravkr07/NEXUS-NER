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
from app.schemas.nlp_incident import (
    IncidentExtractionRequest,
    IncidentExtractionResponse,
)
from app.services import alert_service
from app.services.nlp_extraction_service import get_nlp_extraction_service, ExtractionError
from app.api.auth import require_roles


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"]
)


@router.post("/extract-from-text", response_model=IncidentExtractionResponse)
def extract_incident_from_text(
    payload: IncidentExtractionRequest,
    current_user = Depends(require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER")),
):
    """
    Extract structured incident attributes from unstructured natural language reports using AI/NLP.
    Advisory intelligence ingestion only: does NOT write to the database or trigger risk/alert actions.
    """
    service = get_nlp_extraction_service()
    try:
        return service.extract_incident(payload.text)
    except ExtractionError as err:
        raise HTTPException(
            status_code=400,
            detail=str(err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"NLP extraction processing failed: {exc}",
        )


@router.post("/", response_model=IncidentResponse)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER")),
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
        affected_road_id=incident.affected_road_id,
        reported_at=incident.reported_at,
    )

    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)

    if db_incident.severity.lower() in {"critical", "high"}:
        try:
            alert_service.create_alert(
                db=db,
                title=f"{db_incident.severity.title()} Incident: {db_incident.incident_type.replace('_', ' ').title()}",
                description=db_incident.description,
                severity=db_incident.severity.lower(),
                alert_type="road_incident",
                location=f"Lat {db_incident.latitude:.4f}, Lon {db_incident.longitude:.4f}",
                latitude=db_incident.latitude,
                longitude=db_incident.longitude,
                source_entity="incident",
                source_entity_id=db_incident.id,
                dedup_key=f"incident:{db_incident.id}"
            )
        except Exception:
            pass

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
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("ADMIN", "CONTROL_OPERATOR")),
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

        inc_type = incident.incident_type.lower()
        if inc_type in {"landslide", "flood", "flash_flood", "road_damage", "blockage"} or "flood" in inc_type or "landslide" in inc_type:
            road.status = "blocked"
            road.risk_score = 95

            try:
                alert_service.create_alert(
                    db=db,
                    title=f"Corridor Blocked: {road.road_name}",
                    description=f"Corridor {road.road_name} blocked due to verified {incident.incident_type.replace('_', ' ')}. Risk escalated to 95%.",
                    severity="critical",
                    alert_type="road_risk",
                    location=road.road_name,
                    source_entity="road",
                    source_entity_id=road.id,
                    dedup_key=f"road_risk:road:{road.id}:{road.status}"
                )
            except Exception:
                pass

    db.commit()
    db.refresh(incident)

    return incident