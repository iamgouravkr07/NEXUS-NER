from pydantic import BaseModel, Field
from typing import Optional


class IncidentCreate(BaseModel):
    incident_type: str = Field(..., examples=["landslide"])
    severity: str = Field(..., examples=["high"])
    description: str
    latitude: float = Field(..., ge=20, le=30)
    longitude: float = Field(..., ge=88, le=98)
    road_status: Optional[str] = "unknown"


class IncidentStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        examples=["verified"]
    )


class IncidentResponse(IncidentCreate):
    id: int
    status: str
    risk_score: float