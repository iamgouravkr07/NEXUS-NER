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

    origin_lat: Optional[float] = Field(default=None, ge=20, le=30)
    origin_lon: Optional[float] = Field(default=None, ge=88, le=98)
    destination_lat: Optional[float] = Field(default=None, ge=20, le=30)
    destination_lon: Optional[float] = Field(default=None, ge=88, le=98)

    current_route_geometry: Optional[str] = None
    reroute_count: int = 0
    last_reroute_reason: Optional[str] = None


class TripStatusUpdate(BaseModel):
    status: str


class TripEtaUpdate(BaseModel):
    eta_minutes: int = Field(..., ge=0)


class TripResponse(TripCreate):
    id: int