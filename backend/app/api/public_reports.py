import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import require_roles
from app.database import get_db
from app.models.user import User
from app.schemas.public_report import (
    PublicReportCreate,
    PublicReportReject,
    PublicReportResponse,
    PublicReportSummary,
    PublicReportVerify,
)
from app.services.public_report_service import PublicReportService

logger = logging.getLogger("nexus_ner.api.public_reports")

router = APIRouter()


@router.post(
    "/",
    response_model=PublicReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a public citizen report (PUBLIC only)",
)
def submit_public_report(
    payload: PublicReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PUBLIC")),
):
    """
    Citizens submit field observations into the UNVERIFIED queue.
    The reporter identity is strictly bound to the authenticated user token.
    """
    return PublicReportService.create_report(
        db=db,
        reporter_id=current_user.id,
        payload=payload,
    )


@router.get(
    "/mine",
    response_model=List[PublicReportResponse],
    summary="List citizen's own submitted reports (PUBLIC only)",
)
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("PUBLIC")),
):
    """
    Citizens can track the review status of their own reports.
    Access to reports submitted by other citizens is strictly prohibited.
    """
    return PublicReportService.get_user_reports(db=db, user_id=current_user.id)


@router.get(
    "/summary",
    response_model=PublicReportSummary,
    summary="Get citizen reports summary metrics (Operational roles only)",
)
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER")),
):
    """
    Provides aggregated status counts for Control Tower and Field Command.
    """
    return PublicReportService.get_summary(db=db)


@router.get(
    "/{report_id}",
    response_model=PublicReportResponse,
    summary="Get public report detail with ownership enforcement",
)
def get_public_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "PUBLIC")
    ),
):
    """
    Retrieves a single public report.
    - PUBLIC users can only view their own submitted reports.
    - Operational staff (ADMIN, CONTROL_OPERATOR, FIELD_OFFICER) can review all reports.
    - DRIVER accounts have no access to public report queues.
    """
    report = PublicReportService.get_report_by_id(db=db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Public report #{report_id} not found."
        )

    # Enforce horizontal privacy for PUBLIC role
    if current_user.role == "PUBLIC" and report.reporter_user_id != current_user.id:
        logger.warning(
            "Citizen User #%d attempted unauthorized access to report #%d owned by User #%d",
            current_user.id,
            report_id,
            report.reporter_user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view another citizen's report."
        )

    return PublicReportService._to_response(report, db, public_view=True)


@router.get(
    "/",
    response_model=List[PublicReportResponse],
    summary="List incoming public reports for review (Operational roles only)",
)
def list_public_reports(
    status_filter: Optional[str] = Query(None, description="Filter by status: UNVERIFIED, VERIFIED, REJECTED"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER")),
):
    """
    Operational queue of public reports for review, verification, or rejection.
    """
    return PublicReportService.list_reports(
        db=db, status_filter=status_filter, limit=limit
    )


@router.patch(
    "/{report_id}/verify",
    response_model=PublicReportResponse,
    summary="Verify citizen report and link to official incident (Operational roles only)",
)
def verify_public_report(
    report_id: int,
    payload: PublicReportVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER")),
):
    """
    Transitions report from UNVERIFIED to VERIFIED, creating or linking an official
    Incident with operational alerts and risk assessment.
    """
    return PublicReportService.verify_report(
        db=db,
        report_id=report_id,
        reviewer_id=current_user.id,
        payload=payload,
    )


@router.patch(
    "/{report_id}/reject",
    response_model=PublicReportResponse,
    summary="Reject public report with recorded reason (Operational roles only)",
)
def reject_public_report(
    report_id: int,
    payload: PublicReportReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER")),
):
    """
    Transitions report from UNVERIFIED to REJECTED. The report remains stored in the database
    with reviewer timestamp and rejection reason for auditability.
    """
    return PublicReportService.reject_report(
        db=db,
        report_id=report_id,
        reviewer_id=current_user.id,
        payload=payload,
    )
