import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import require_roles
from app.database import get_db
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentReassign, AssignmentResponse
from app.services.assignment_service import AssignmentService

logger = logging.getLogger("nexus_ner.api.assignments")

router = APIRouter()


@router.post(
    "/",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Driver ↔ Vehicle assignment (ADMIN only)",
)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    return AssignmentService.create_assignment(
        db=db,
        driver_id=payload.driver_id,
        vehicle_id=payload.vehicle_id,
    )


@router.patch(
    "/{assignment_id}/unassign",
    response_model=AssignmentResponse,
    summary="Deactivate an assignment (ADMIN only)",
)
def unassign_vehicle(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    return AssignmentService.unassign(db=db, assignment_id=assignment_id)


@router.patch(
    "/{assignment_id}/reassign",
    response_model=AssignmentResponse,
    summary="Reassign driver or vehicle (ADMIN only)",
)
def reassign_assignment(
    assignment_id: int,
    payload: AssignmentReassign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    return AssignmentService.reassign(
        db=db,
        assignment_id=assignment_id,
        new_vehicle_id=payload.new_vehicle_id,
        new_driver_id=payload.new_driver_id,
    )


@router.get(
    "/me",
    response_model=AssignmentResponse,
    summary="Get authenticated driver's active assignment (DRIVER only)",
)
def get_my_active_assignment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("DRIVER")),
):
    assignment = AssignmentService.get_active_assignment_for_driver(
        db=db, driver_id=current_user.id
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active vehicle assignment found for authenticated driver.",
        )
    return AssignmentService._to_response(assignment, db)


@router.get(
    "/vehicle/{vehicle_id}",
    response_model=AssignmentResponse,
    summary="Get active assignment for vehicle (Operational roles)",
)
def get_active_assignment_for_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER")),
):
    assignment = AssignmentService.get_active_assignment_for_vehicle(
        db=db, vehicle_id=vehicle_id
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active driver assignment found for vehicle #{vehicle_id}.",
        )
    return AssignmentService._to_response(assignment, db)


@router.get(
    "/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Get assignment details by ID (ADMIN / CONTROL_OPERATOR)",
)
def get_assignment_by_id(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "CONTROL_OPERATOR")),
):
    assignment = AssignmentService.get_assignment_by_id(
        db=db, assignment_id=assignment_id
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment #{assignment_id} not found.",
        )
    return assignment


@router.get(
    "/",
    response_model=List[AssignmentResponse],
    summary="List assignments (ADMIN / CONTROL_OPERATOR)",
)
def list_assignments(
    active_only: bool = Query(False, description="Filter for active assignments only"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "CONTROL_OPERATOR")),
):
    return AssignmentService.list_assignments(
        db=db, active_only=active_only, limit=limit
    )
