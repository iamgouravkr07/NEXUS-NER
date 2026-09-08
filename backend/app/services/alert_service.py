import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.alert import Alert
from app.schemas.alert import AlertSummary

logger = logging.getLogger("nexus_ner.alerts")


def create_alert(
    db: Session,
    title: str,
    description: str,
    severity: str,
    alert_type: str,
    location: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    source_entity: Optional[str] = None,
    source_entity_id: Optional[int] = None,
    dedup_key: Optional[str] = None,
    suppress_window_minutes: int = 60
) -> Alert:
    """
    Create a persistent operational alert with duplicate suppression.
    If an unresolved alert with the same dedup_key exists within
    suppress_window_minutes, returns the existing alert to avoid alert fatigue.
    """
    clean_severity = severity.lower()
    clean_type = alert_type.lower()

    if not dedup_key and source_entity and source_entity_id:
        dedup_key = f"{clean_type}:{source_entity}:{source_entity_id}"

    if dedup_key:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=suppress_window_minutes)
        existing = (
            db.query(Alert)
            .filter(
                Alert.dedup_key == dedup_key,
                Alert.status.in_(["active", "acknowledged"]),
                Alert.created_at >= cutoff
            )
            .order_by(Alert.id.desc())
            .first()
        )
        if existing:
            logger.info("Alert suppressed by dedup_key '%s' (existing ID #%d)", dedup_key, existing.id)
            return existing

    alert = Alert(
        title=title,
        description=description,
        severity=clean_severity,
        alert_type=clean_type,
        status="active",
        location=location,
        latitude=latitude,
        longitude=longitude,
        source_entity=source_entity,
        source_entity_id=source_entity_id,
        dedup_key=dedup_key,
        created_at=datetime.now(timezone.utc)
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)
    logger.info("Created new %s alert #%d: %s", clean_severity.upper(), alert.id, title)
    return alert


def get_alerts(
    db: Session,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    alert_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Alert]:
    """Retrieve operational alerts with multi-criteria filtering."""
    query = db.query(Alert)

    if severity and severity.lower() != "all":
        query = query.filter(Alert.severity == severity.lower())

    if status and status.lower() != "all":
        query = query.filter(Alert.status == status.lower())

    if alert_type and alert_type.lower() != "all":
        query = query.filter(Alert.alert_type == alert_type.lower())

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Alert.title.ilike(search_pattern),
                Alert.description.ilike(search_pattern),
                Alert.location.ilike(search_pattern)
            )
        )

    return query.order_by(Alert.id.desc()).offset(offset).limit(limit).all()


def get_alert_summary(db: Session) -> AlertSummary:
    """Compute aggregate counts by severity and lifecycle status."""
    alerts = db.query(Alert.severity, Alert.status).all()

    summary = AlertSummary(total=len(alerts))
    for sev, stat in alerts:
        s_sev = (sev or "").lower()
        s_stat = (stat or "").lower()

        if s_sev == "critical":
            summary.critical += 1
        elif s_sev == "high":
            summary.high += 1
        elif s_sev == "medium":
            summary.medium += 1
        elif s_sev == "low":
            summary.low += 1

        if s_stat == "active":
            summary.active += 1
        elif s_stat == "acknowledged":
            summary.acknowledged += 1
        elif s_stat == "resolved":
            summary.resolved += 1

    return summary


def acknowledge_alert(db: Session, alert_id: int) -> Optional[Alert]:
    """Transition alert to acknowledged status."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None

    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return alert


def resolve_alert(db: Session, alert_id: int) -> Optional[Alert]:
    """Transition alert to resolved status."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None

    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return alert


def seed_initial_alerts_if_empty(db: Session) -> None:
    """Seed initial operational alerts if table is empty."""
    try:
        if db.query(Alert).count() > 0:
            return

        initial_alerts = [
            {
                "title": "Critical Landslide Warning",
                "description": "Landslide activity reported near an active logistics corridor on NH-15.",
                "severity": "critical",
                "alert_type": "road_incident",
                "location": "NH-15, Dhemaji, Assam",
                "latitude": 27.48,
                "longitude": 94.58,
                "dedup_key": "seed:alert:1"
            },
            {
                "title": "Road Accessibility Reduced",
                "description": "Heavy rainfall has increased disruption probability along the corridor.",
                "severity": "high",
                "alert_type": "road_risk",
                "location": "NH-10, Gangtok, Sikkim",
                "latitude": 27.33,
                "longitude": 88.61,
                "dedup_key": "seed:alert:2"
            },
            {
                "title": "Severe Weather Alert: Heavy Rainfall",
                "description": "Rainfall intensity above warning threshold affecting transport corridors.",
                "severity": "high",
                "alert_type": "weather",
                "location": "East Siang, Arunachal Pradesh",
                "latitude": 28.06,
                "longitude": 95.32,
                "dedup_key": "seed:alert:3"
            },
            {
                "title": "Vehicle Running Behind Schedule",
                "description": "Estimated arrival time increased due to mountain pass bottleneck.",
                "severity": "medium",
                "alert_type": "vehicle",
                "location": "Truck VH-001 · Shillong",
                "latitude": 25.57,
                "longitude": 91.89,
                "dedup_key": "seed:alert:4"
            },
            {
                "title": "Flood Risk Advisory",
                "description": "Water level and rainfall indicators suggest elevated flood risk along lowlands.",
                "severity": "medium",
                "alert_type": "weather",
                "location": "Barak Valley, Assam",
                "latitude": 24.83,
                "longitude": 92.79,
                "dedup_key": "seed:alert:5"
            },
            {
                "title": "Corridor Status Normalized",
                "description": "Previously restricted road segment has returned to normal operation.",
                "severity": "low",
                "alert_type": "road_risk",
                "location": "NH-6, Meghalaya",
                "latitude": 25.50,
                "longitude": 92.20,
                "dedup_key": "seed:alert:6"
            }
        ]
        for a in initial_alerts:
            create_alert(db=db, **a)
    except Exception as err:
        logger.warning("Failed to seed initial alerts: %s", err)

