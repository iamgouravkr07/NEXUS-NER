from typing import Optional

from pydantic import BaseModel, Field


class TripCreate(BaseModel):
    vehicle_id: int

    origin: str
    destination: str

    cargo_type: str
    priority: str = "normal"

    status: str = "planned"

    eta_minutes: Optional[int] = Field(default=None, ge=0)

    route_distance_km: Optional[float] = Field(default=None, ge=0)
    route_duration_minutes: Optional[int] = Field(default=None, ge=0)


class TripStatusUpdate(BaseModel):
    status: str


class TripEtaUpdate(BaseModel):
    eta_minutes: int = Field(..., ge=0)


class TripResponse(TripCreate):
    id: int