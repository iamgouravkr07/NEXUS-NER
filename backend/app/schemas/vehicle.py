
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class VehicleCreate(BaseModel):
    vehicle_number: str
    vehicle_type: str
    cargo_type: str
    cargo_priority: str = "normal"
    status: str = "idle"

    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    last_gps_timestamp: Optional[datetime] = None

    current_trip_id: Optional[int] = None


class VehicleLocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees (-180 to 180)")
    timestamp: Optional[datetime] = Field(default=None, description="ISO-8601 GPS timestamp")
    status: Optional[str] = Field(default=None, description="Optional vehicle status update")


class VehicleStatusUpdate(BaseModel):
    status: str


class VehicleResponse(VehicleCreate):
    id: int
    last_gps_timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class VehicleLocationResponse(BaseModel):
    vehicle_id: int
    vehicle_number: str
    latitude: float
    longitude: float
    timestamp: Optional[datetime] = None
    status: str
    current_trip_id: Optional[int] = None

    class Config:
        from_attributes = True
