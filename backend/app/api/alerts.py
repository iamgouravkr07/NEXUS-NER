from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.alert import (
    AlertCreate,
    AlertResponse,
    AlertSummary,
    AlertStatusUpdate
)
from app.services import alert_service

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"]
)


@router.get("/", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity (critical, high, medium, low)"),
    status: Optional[str] = Query(None, description="Filter by status (active, acknowledged, resolved)"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    search: Optional[str] = Query(None, description="Search term in title, description, or location"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve operational alerts with optional multi-criteria filters."""
    return alert_service.get_alerts(
        db=db,
        severity=severity,
        status=status,
        alert_type=alert_type,
        search=search,
        limit=limit,
        offset=offset
    )


@router.get("/summary", response_model=AlertSummary)
def get_alerts_summary(
    db: Session = Depends(get_db)
):
    """Retrieve aggregated counts across severities and lifecycle states."""
    return alert_service.get_alert_summary(db=db)


@router.post("/", response_model=AlertResponse, status_code=201)
def create_manual_alert(
    alert_in: AlertCreate,
    db: Session = Depends(get_db)
):
    """Create a new alert with duplicate suppression."""
    return alert_service.create_alert(
        db=db,
        title=alert_in.title,
        description=alert_in.description,
        severity=alert_in.severity,
        alert_type=alert_in.alert_type,
        location=alert_in.location,
        latitude=alert_in.latitude,
        longitude=alert_in.longitude,
        source_entity=alert_in.source_entity,
        source_entity_id=alert_in.source_entity_id,
        dedup_key=alert_in.dedup_key
    )


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert_endpoint(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Mark an alert as acknowledged by an operator."""
    alert = alert_service.acknowledge_alert(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert_endpoint(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Mark an alert as resolved."""
    alert = alert_service.resolve_alert(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Fetch single alert by ID."""
    from app.models.alert import Alert
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
