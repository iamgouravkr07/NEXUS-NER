from datetime import datetime, timezone
import logging
from typing import List, Optional

from fastapi import HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.public_report import PublicReport
from app.models.road import Road
from app.models.user import User
from app.schemas.public_report import (
    PublicReportCreate,
    PublicReportReject,
    PublicReportResponse,
    PublicReportVerify,
)
from app.services import alert_service
from app.services.websocket_manager import manager
from app.schemas import road

logger = logging.getLogger("nexus_ner.public_report_service")

# NER Geographic Bounding Box: 20.0N to 30.0N, 88.0E to 98.0E
NER_MIN_LAT = 20.0
NER_MAX_LAT = 30.0
NER_MIN_LON = 88.0
NER_MAX_LON = 98.0


class PublicReportService:
    @staticmethod
    def _to_response(
    report: PublicReport,
    db: Session,
    public_view: bool = False,
) -> PublicReportResponse:
        road_name = None

        if report.road:
            road_name = report.road.road_name
        elif report.road_id:
            r = db.query(Road.road_name).filter(Road.id == report.road_id).first()
            if r:
                road_name = r[0]

        return PublicReportResponse(
            id=report.id,
            reporter_user_id=report.reporter_user_id,
            latitude=report.latitude,
            longitude=report.longitude,
            road_id=report.road_id,
            road_name=road_name,
            report_type=report.report_type,
            description=report.description,
            severity_hint=report.severity_hint,
            status=report.status,
            created_at=report.created_at,
            reviewed_at=report.reviewed_at,
            reviewed_by_user_id=None if public_view else report.reviewed_by_user_id,
            converted_incident_id=report.converted_incident_id,
            rejection_reason=report.rejection_reason,
            verification_notes=None if public_view else report.verification_notes,
            photo_url=report.photo_url,
        )

    @classmethod
    def create_report(
        cls,
        db: Session,
        reporter_id: int,
        payload: PublicReportCreate,
        photo_url: Optional[str] = None,
    ) -> PublicReportResponse:
        user = db.query(User).filter(User.id == reporter_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User #{reporter_id} not found."
            )
        if user.role != "PUBLIC":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Citizen reports can only be submitted by users with PUBLIC role. User has role '{user.role}'."
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive."
            )

        # Validate NER geographical boundary
        if not (NER_MIN_LAT <= payload.latitude <= NER_MAX_LAT and NER_MIN_LON <= payload.longitude <= NER_MAX_LON):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Coordinates ({payload.latitude}, {payload.longitude}) outside Northeast India Region bounds [{NER_MIN_LAT}-{NER_MAX_LAT}°N, {NER_MIN_LON}-{NER_MAX_LON}°E]."
            )

        # Validate optional road existence
        if payload.road_id is not None:
            road = db.query(Road).filter(Road.id == payload.road_id).first()
            if not road:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Road #{payload.road_id} not found."
                )

        report = PublicReport(
            reporter_user_id=reporter_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            road_id=payload.road_id,
            report_type=payload.report_type,
            description=payload.description.strip(),
            severity_hint=payload.severity_hint,
            photo_url=photo_url or payload.photo_url,
            status="UNVERIFIED",
            created_at=datetime.now(timezone.utc),
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        logger.info("Public citizen report #%d submitted by User #%d (type=%s, status=UNVERIFIED)", report.id, reporter_id, report.report_type)
        return cls._to_response(report, db)

    @classmethod
    def get_user_reports(
        cls, db: Session, user_id: int
    ) -> List[PublicReportResponse]:
        reports = (
            db.query(PublicReport)
            .filter(PublicReport.reporter_user_id == user_id)
            .order_by(PublicReport.id.desc())
            .all()
        )
        return [cls._to_response(r, db, public_view=True) for r in reports]

    @classmethod
    def get_report_by_id(
        cls, db: Session, report_id: int
    ) -> Optional[PublicReport]:
        return db.query(PublicReport).filter(PublicReport.id == report_id).first()

    @classmethod
    def list_reports(
        cls, db: Session, status_filter: Optional[str] = None, limit: int = 100
    ) -> List[PublicReportResponse]:
        query = db.query(PublicReport)
        if status_filter:
            query = query.filter(PublicReport.status == status_filter.strip().upper())
        reports = query.order_by(PublicReport.id.desc()).limit(limit).all()
        return [cls._to_response(r, db) for r in reports]

    @classmethod
    def verify_report(
        cls, db: Session, report_id: int, reviewer_id: int, payload: PublicReportVerify
    ) -> PublicReportResponse:
        report = db.query(PublicReport).filter(PublicReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Public report #{report_id} not found."
            )

        if report.status == "VERIFIED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Public report #{report_id} is already verified."
            )
        if report.status == "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Public report #{report_id} is already rejected and cannot be verified."
            )

        # 1. Official Incident Integration
        official_incident_id = None
        if payload.link_to_existing_incident_id:
            existing_incident = (
                db.query(Incident)
                .filter(Incident.id == payload.link_to_existing_incident_id)
                .first()
            )
            if not existing_incident:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Target incident #{payload.link_to_existing_incident_id} not found."
                )
            official_incident_id = existing_incident.id
        else:
            # Create official incident via existing Incident model
            severity = payload.severity or report.severity_hint or "high"
            risk_score = {
                "low": 25,
                "medium": 50,
                "high": 75,
                "critical": 95,
            }.get(severity.lower(), 75)

            new_incident = Incident(
                incident_type=report.report_type.lower(),
                severity=severity.lower(),
                description=f"[Verified Citizen Report #{report.id}] {report.description}",
                latitude=report.latitude,
                longitude=report.longitude,
                location=WKTElement(
                    f"POINT({report.longitude} {report.latitude})",
                    srid=4326,
                ),
                road_status="blocked" if severity.lower() in ("critical", "high") else "hazard",
                status="verified",
                risk_score=risk_score,
                affected_road_id=report.road_id,
                reported_at=report.created_at,
                created_at=datetime.now(timezone.utc),
            )
            db.add(new_incident)
            db.flush()
            official_incident_id = new_incident.id

            # Keep the affected road consistent with the canonical incident verification flow.
            if new_incident.affected_road_id and severity.lower() in {"critical", "high"}:
                road = (
                    db.query(Road)
                    .filter(Road.id == new_incident.affected_road_id)
                    .first()
            )

                if road:
                    road.status = "blocked"
                    road.risk_score = 95


            # Create operational alert if critical/high
            if severity.lower() in {"critical", "high"}:
                try:
                    alert_service.create_alert(
                        db=db,
                        title=f"{severity.title()} Hazard: {report.report_type.replace('_', ' ').title()}",
                        description=new_incident.description,
                        severity=severity.lower(),
                        alert_type="citizen_verified",
                        location=f"Lat {report.latitude:.4f}, Lon {report.longitude:.4f}",
                        latitude=report.latitude,
                        longitude=report.longitude,
                        source_entity="incident",
                        source_entity_id=new_incident.id,
                        dedup_key=f"public_report:{report.id}",
                    )
                except Exception as alert_err:
                    logger.warning("Could not create alert for verified report #%d: %s", report.id, alert_err)

            # Broadcast incident.created on WebSocket
            manager.broadcast_sync(
                "incident.created",
                {
                    "id": new_incident.id,
                    "incident_id": new_incident.id,
                    "severity": new_incident.severity,
                    "status": new_incident.status,
                    "affected_road_id": new_incident.affected_road_id,
                },
            )

        # 2. Update PublicReport state
        report.status = "VERIFIED"
        report.reviewed_by_user_id = reviewer_id
        report.reviewed_at = datetime.now(timezone.utc)
        report.verification_notes = payload.verification_notes
        report.converted_incident_id = official_incident_id

        db.commit()
        db.refresh(report)

        logger.info(
            "Public report #%d verified by User #%d -> Official Incident #%s",
            report.id,
            reviewer_id,
            str(official_incident_id),
        )
        return cls._to_response(report, db)

    @classmethod
    def reject_report(
        cls, db: Session, report_id: int, reviewer_id: int, payload: PublicReportReject
    ) -> PublicReportResponse:
        report = db.query(PublicReport).filter(PublicReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Public report #{report_id} not found."
            )

        if report.status == "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Public report #{report_id} is already rejected."
            )
        if report.status == "VERIFIED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Public report #{report_id} is already verified and cannot be rejected."
            )

        report.status = "REJECTED"
        report.reviewed_by_user_id = reviewer_id
        report.reviewed_at = datetime.now(timezone.utc)
        report.rejection_reason = payload.rejection_reason

        db.commit()
        db.refresh(report)

        logger.info("Public report #%d rejected by User #%d (reason=%s)", report.id, reviewer_id, payload.rejection_reason)
        return cls._to_response(report, db)

    @classmethod
    def get_summary(cls, db: Session) -> dict:
        total = db.query(PublicReport).count()
        unverified = db.query(PublicReport).filter(PublicReport.status == "UNVERIFIED").count()
        verified = db.query(PublicReport).filter(PublicReport.status == "VERIFIED").count()
        rejected = db.query(PublicReport).filter(PublicReport.status == "REJECTED").count()
        return {
            "unverified": unverified,
            "verified": verified,
            "rejected": rejected,
            "total": total,
        }
