from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AssignmentBase(BaseModel):
    driver_id: int = Field(..., description="ID of the DRIVER user")
    vehicle_id: int = Field(..., description="ID of the Vehicle")


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentReassign(BaseModel):
    new_vehicle_id: Optional[int] = Field(None, description="New vehicle ID to assign to this driver")
    new_driver_id: Optional[int] = Field(None, description="New driver ID to assign to this vehicle")


class AssignmentResponse(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    driver_username: Optional[str] = None
    vehicle_number: Optional[str] = None
