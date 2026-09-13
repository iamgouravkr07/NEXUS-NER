from datetime import datetime, timezone
import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.assignment import DriverVehicleAssignment
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.assignment import AssignmentResponse

logger = logging.getLogger("nexus_ner.assignment_service")


class AssignmentService:
    @staticmethod
    def _to_response(assignment: DriverVehicleAssignment, db: Session) -> AssignmentResponse:
        driver_username = None
        vehicle_number = None

        if assignment.driver:
            driver_username = assignment.driver.username
        else:
            u = db.query(User.username).filter(User.id == assignment.driver_id).first()
            if u:
                driver_username = u[0]

        if assignment.vehicle:
            vehicle_number = assignment.vehicle.vehicle_number
        else:
            v = db.query(Vehicle.vehicle_number).filter(Vehicle.id == assignment.vehicle_id).first()
            if v:
                vehicle_number = v[0]

        return AssignmentResponse(
            id=assignment.id,
            driver_id=assignment.driver_id,
            vehicle_id=assignment.vehicle_id,
            assigned_at=assignment.assigned_at,
            unassigned_at=assignment.unassigned_at,
            is_active=assignment.is_active,
            created_at=assignment.created_at,
            driver_username=driver_username,
            vehicle_number=vehicle_number,
        )

    @classmethod
    def create_assignment(
        cls, db: Session, driver_id: int, vehicle_id: int
    ) -> AssignmentResponse:
        driver = db.query(User).filter(User.id == driver_id).first()
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Driver user #{driver_id} not found."
            )
        if driver.role != "DRIVER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User #{driver_id} has role '{driver.role}', but assignments require role 'DRIVER'."
            )
        if not driver.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver user #{driver_id} is inactive."
            )

        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle #{vehicle_id} not found."
            )

        # Check existing active assignment for this driver
        existing_driver_assignment = (
            db.query(DriverVehicleAssignment)
            .filter(
                DriverVehicleAssignment.driver_id == driver_id,
                DriverVehicleAssignment.is_active.is_(True),
            )
            .first()
        )
        if existing_driver_assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver #{driver_id} already has an active assignment to vehicle #{existing_driver_assignment.vehicle_id}."
            )

        # Check existing active assignment for this vehicle
        existing_vehicle_assignment = (
            db.query(DriverVehicleAssignment)
            .filter(
                DriverVehicleAssignment.vehicle_id == vehicle_id,
                DriverVehicleAssignment.is_active.is_(True),
            )
            .first()
        )
        if existing_vehicle_assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle #{vehicle_id} is already actively assigned to driver #{existing_vehicle_assignment.driver_id}."
            )

        new_assignment = DriverVehicleAssignment(
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            is_active=True,
            assigned_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_assignment)
        db.commit()
        db.refresh(new_assignment)
        logger.info("Created assignment #%d: Driver #%d -> Vehicle #%d", new_assignment.id, driver_id, vehicle_id)
        return cls._to_response(new_assignment, db)

    @classmethod
    def unassign(cls, db: Session, assignment_id: int) -> AssignmentResponse:
        assignment = (
            db.query(DriverVehicleAssignment)
            .filter(DriverVehicleAssignment.id == assignment_id)
            .first()
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment #{assignment_id} not found."
            )

        if assignment.is_active:
            assignment.is_active = False
            assignment.unassigned_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(assignment)
            logger.info("Deactivated assignment #%d (Driver #%d, Vehicle #%d)", assignment.id, assignment.driver_id, assignment.vehicle_id)

        return cls._to_response(assignment, db)

    @classmethod
    def reassign(
        cls,
        db: Session,
        assignment_id: int,
        new_vehicle_id: Optional[int] = None,
        new_driver_id: Optional[int] = None,
    ) -> AssignmentResponse:
        assignment = (
            db.query(DriverVehicleAssignment)
            .filter(DriverVehicleAssignment.id == assignment_id)
            .first()
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment #{assignment_id} not found."
            )

        if not assignment.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reassign inactive assignment #{assignment_id}."
            )

        target_driver_id = new_driver_id if new_driver_id is not None else assignment.driver_id
        target_vehicle_id = new_vehicle_id if new_vehicle_id is not None else assignment.vehicle_id

        if target_driver_id == assignment.driver_id and target_vehicle_id == assignment.vehicle_id:
            return cls._to_response(assignment, db)

        # Deactivate previous assignment
        assignment.is_active = False
        assignment.unassigned_at = datetime.now(timezone.utc)
        db.flush()

        # Create new assignment using standard validation
        return cls.create_assignment(db, target_driver_id, target_vehicle_id)

    @classmethod
    def get_active_assignment_for_driver(
        cls, db: Session, driver_id: int
    ) -> Optional[DriverVehicleAssignment]:
        return (
            db.query(DriverVehicleAssignment)
            .filter(
                DriverVehicleAssignment.driver_id == driver_id,
                DriverVehicleAssignment.is_active.is_(True),
            )
            .first()
        )

    @classmethod
    def get_active_assignment_for_vehicle(
        cls, db: Session, vehicle_id: int
    ) -> Optional[DriverVehicleAssignment]:
        return (
            db.query(DriverVehicleAssignment)
            .filter(
                DriverVehicleAssignment.vehicle_id == vehicle_id,
                DriverVehicleAssignment.is_active.is_(True),
            )
            .first()
        )

    @classmethod
    def get_assignment_by_id(
        cls, db: Session, assignment_id: int
    ) -> Optional[AssignmentResponse]:
        assignment = (
            db.query(DriverVehicleAssignment)
            .filter(DriverVehicleAssignment.id == assignment_id)
            .first()
        )
        if not assignment:
            return None
        return cls._to_response(assignment, db)

    @classmethod
    def list_assignments(
        cls, db: Session, active_only: bool = False, limit: int = 100
    ) -> List[AssignmentResponse]:
        query = db.query(DriverVehicleAssignment)
        if active_only:
            query = query.filter(DriverVehicleAssignment.is_active.is_(True))
        assignments = query.order_by(DriverVehicleAssignment.id.desc()).limit(limit).all()
        return [cls._to_response(a, db) for a in assignments]
