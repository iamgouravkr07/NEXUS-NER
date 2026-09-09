import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.sync_event import SyncEvent
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.alert import Alert
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncEventRequest,
    SyncEventResult,
)
from app.services import alert_service

logger = logging.getLogger("nexus_ner.sync")

ALLOWED_INCIDENT_ROLES = {"ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER"}
ALLOWED_GPS_ROLES = {"ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "DRIVER"}
ALLOWED_VEHICLE_STATUSES = {"moving", "in_transit", "idle", "delayed", "maintenance", "blocked"}


def _normalize_dt(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime has timezone for safe comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _process_incident_report(
    db: Session,
    event: SyncEventRequest,
    current_user: User
) -> Tuple[str, int]:
    """Process offline incident report domain logic."""
    if current_user.role not in ALLOWED_INCIDENT_ROLES:
        raise PermissionError(f"Role '{current_user.role}' is not authorized to submit incident reports")

    payload = event.payload or {}

    # Extract & validate coordinates (fallback from event coordinates to payload)
    lat = event.latitude if event.latitude is not None else payload.get("latitude")
    lon = event.longitude if event.longitude is not None else payload.get("longitude")

    if lat is None or lon is None:
        raise ValueError("Latitude and longitude must be provided for incident_report")

    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        raise ValueError("Latitude and longitude must be valid floating-point numbers")

    if not (20.0 <= lat <= 30.0):
        raise ValueError(f"Latitude {lat} is outside North Eastern Region bounds [20.0, 30.0]")
    if not (88.0 <= lon <= 98.0):
        raise ValueError(f"Longitude {lon} is outside North Eastern Region bounds [88.0, 98.0]")

    incident_type = payload.get("incident_type")
    if not incident_type or not str(incident_type).strip():
        raise ValueError("incident_type is required in payload")
    incident_type = str(incident_type).strip().lower()

    severity = payload.get("severity")
    if not severity or not str(severity).strip():
        raise ValueError("severity is required in payload")
    severity = str(severity).strip().lower()
    if severity not in {"critical", "high", "medium", "low"}:
        raise ValueError(f"Invalid severity '{severity}'. Must be one of critical, high, medium, low")

    description = payload.get("description", "").strip()
    if not description:
        description = f"Offline field report: {incident_type.title()} at ({lat:.4f}, {lon:.4f})"

    road_status = payload.get("road_status", "unknown")
    affected_road_id = payload.get("affected_road_id")

    risk_score = {
        "low": 25,
        "medium": 50,
        "high": 75,
        "critical": 95
    }.get(severity, 50)

    # Preserve client-side offline timestamp
    created_at_dt = _normalize_dt(event.timestamp) or datetime.now(timezone.utc)

    db_incident = Incident(
        incident_type=incident_type,
        severity=severity,
        description=description,
        latitude=lat,
        longitude=lon,
        location=WKTElement(f"POINT({lon} {lat})", srid=4326),
        road_status=road_status,
        status="reported",
        risk_score=risk_score,
        affected_road_id=affected_road_id,
        reported_at=created_at_dt,
        created_at=created_at_dt,
    )

    db.add(db_incident)
    db.flush()  # Flush to obtain db_incident.id within savepoint

    # Trigger critical/high alert generation
    if severity in {"critical", "high"}:
        try:
            dedup_key = f"incident:{db_incident.id}"
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=60)
            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.dedup_key == dedup_key,
                    Alert.status.in_(["active", "acknowledged"]),
                    Alert.created_at >= cutoff
                )
                .first()
            )
            if not existing_alert:
                alert = Alert(
                    title=f"{severity.title()} Incident: {incident_type.replace('_', ' ').title()}",
                    description=description,
                    severity=severity,
                    alert_type="road_incident",
                    status="active",
                    location=f"Lat {lat:.4f}, Lon {lon:.4f}",
                    latitude=lat,
                    longitude=lon,
                    source_entity="incident",
                    source_entity_id=db_incident.id,
                    dedup_key=dedup_key,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(alert)
                db.flush()
                logger.info("Created new %s alert #%d for synced incident #%d", severity.upper(), alert.id, db_incident.id)
        except Exception as alert_err:
            logger.warning("Failed to auto-generate alert for synced incident: %s", alert_err)

    return "incident", db_incident.id


def _process_vehicle_gps(
    db: Session,
    event: SyncEventRequest,
    current_user: User
) -> Tuple[str, int]:
    """Process offline vehicle GPS telemetry domain logic."""
    if current_user.role not in ALLOWED_GPS_ROLES:
        raise PermissionError(f"Role '{current_user.role}' is not authorized to submit vehicle GPS telemetry")

    payload = event.payload or {}

    vehicle_id = payload.get("vehicle_id")
    if vehicle_id is None:
        raise ValueError("vehicle_id is required in payload for vehicle_gps event")

    try:
        vehicle_id = int(vehicle_id)
    except (ValueError, TypeError):
        raise ValueError(f"vehicle_id '{vehicle_id}' must be an integer")

    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise ValueError(f"Vehicle #{vehicle_id} not found")

    lat = event.latitude if event.latitude is not None else payload.get("latitude")
    lon = event.longitude if event.longitude is not None else payload.get("longitude")

    if lat is None or lon is None:
        raise ValueError("Latitude and longitude must be provided for vehicle_gps")

    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        raise ValueError("Latitude and longitude must be valid floating-point numbers")

    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude {lat} is out of valid range [-90.0, 90.0]")
    if not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Longitude {lon} is out of valid range [-180.0, 180.0]")

    event_dt = _normalize_dt(event.timestamp)
    current_last_dt = _normalize_dt(vehicle.last_gps_timestamp)

    # Out-of-order protection: Only overwrite if event timestamp >= current vehicle last_gps_timestamp
    if current_last_dt is None or (event_dt and event_dt >= current_last_dt):
        vehicle.latitude = lat
        vehicle.longitude = lon
        vehicle.last_gps_timestamp = event_dt

        status_update = payload.get("status")
        if status_update:
            normalized_status = str(status_update).strip().lower()
            if normalized_status in ALLOWED_VEHICLE_STATUSES:
                vehicle.status = normalized_status

        db.flush()
    else:
        logger.info(
            "Ignored stale GPS update for Vehicle #%s: event timestamp %s < existing %s",
            vehicle_id, event_dt, current_last_dt
        )

    return "vehicle", vehicle.id


def process_sync_batch(
    db: Session,
    batch_req: SyncBatchRequest,
    current_user: User
) -> SyncBatchResponse:
    """
    Process a batch of offline synchronization events with:
    - Per-event transaction isolation via nested savepoints.
    - Authoritative client_id idempotency.
    - Granular status reporting (success, already_synced, error).
    - Audit tracking of authenticated user.
    """
    results = []
    success_count = 0
    duplicate_count = 0
    error_count = 0

    for event in batch_req.events:
        # Check idempotency first
        existing_event = db.query(SyncEvent).filter(SyncEvent.client_id == event.client_id).first()
        if existing_event:
            if existing_event.status == "processed":
                results.append(SyncEventResult(
                    client_id=event.client_id,
                    event_type=event.event_type,
                    status="already_synced",
                    server_entity_type=existing_event.server_entity_type,
                    server_entity_id=existing_event.server_entity_id,
                    error=None
                ))
                duplicate_count += 1
                continue
            # If previous status was failed, allow retry

        # Process event in an isolated savepoint
        savepoint = db.begin_nested()
        try:
            entity_type = None
            entity_id = None

            if event.event_type == "incident_report":
                entity_type, entity_id = _process_incident_report(db, event, current_user)
            elif event.event_type == "vehicle_gps":
                entity_type, entity_id = _process_vehicle_gps(db, event, current_user)
            else:
                raise ValueError(f"Unsupported event_type: {event.event_type}")

            # Record or update SyncEvent as processed
            if existing_event:
                existing_event.status = "processed"
                existing_event.server_entity_type = entity_type
                existing_event.server_entity_id = entity_id
                existing_event.error_message = None
                existing_event.synced_by_user_id = current_user.id
            else:
                sync_record = SyncEvent(
                    client_id=event.client_id,
                    batch_id=batch_req.batch_id,
                    event_type=event.event_type,
                    client_timestamp=_normalize_dt(event.timestamp),
                    latitude=event.latitude,
                    longitude=event.longitude,
                    payload=event.payload,
                    status="processed",
                    server_entity_type=entity_type,
                    server_entity_id=entity_id,
                    synced_by_user_id=current_user.id
                )
                db.add(sync_record)

            savepoint.commit()

            results.append(SyncEventResult(
                client_id=event.client_id,
                event_type=event.event_type,
                status="success",
                server_entity_type=entity_type,
                server_entity_id=entity_id,
                error=None
            ))
            success_count += 1

        except Exception as exc:
            savepoint.rollback()
            error_msg = str(exc)
            logger.warning("Sync event %s failed: %s", event.client_id, error_msg)

            # Record failure in sync_events via isolated savepoint
            try:
                fail_sp = db.begin_nested()
                if existing_event:
                    existing_event.status = "failed"
                    existing_event.error_message = error_msg
                    existing_event.synced_by_user_id = current_user.id
                else:
                    fail_record = SyncEvent(
                        client_id=event.client_id,
                        batch_id=batch_req.batch_id,
                        event_type=event.event_type,
                        client_timestamp=_normalize_dt(event.timestamp),
                        latitude=event.latitude,
                        longitude=event.longitude,
                        payload=event.payload,
                        status="failed",
                        error_message=error_msg,
                        synced_by_user_id=current_user.id
                    )
                    db.add(fail_record)
                fail_sp.commit()
            except Exception as rec_err:
                logger.error("Failed to record SyncEvent failure for %s: %s", event.client_id, rec_err)

            results.append(SyncEventResult(
                client_id=event.client_id,
                event_type=event.event_type,
                status="error",
                server_entity_type=None,
                server_entity_id=None,
                error=error_msg
            ))
            error_count += 1

    # Commit the overall session changes
    db.commit()

    return SyncBatchResponse(
        batch_id=batch_req.batch_id,
        processed_count=len(batch_req.events),
        success_count=success_count,
        duplicate_count=duplicate_count,
        error_count=error_count,
        results=results
    )
