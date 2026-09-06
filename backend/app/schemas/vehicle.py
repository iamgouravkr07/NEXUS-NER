
from typing import Optional

from pydantic import BaseModel, Field


class VehicleCreate(BaseModel):
    vehicle_number: str
    vehicle_type: str
    cargo_type: str
    cargo_priority: str = "normal"
    status: str = "idle"

    latitude: Optional[float] = Field(default=None, ge=20, le=30)
    longitude: Optional[float] = Field(default=None, ge=88, le=98)

    current_trip_id: Optional[int] = None


class VehicleLocationUpdate(BaseModel):
    latitude: float = Field(..., ge=20, le=30)
    longitude: float = Field(..., ge=88, le=98)


class VehicleStatusUpdate(BaseModel):
    status: str


class VehicleResponse(VehicleCreate):
    id: int
