from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AlertBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: str
    severity: str = Field(..., examples=["critical", "high", "medium", "low"])
    alert_type: str = Field(..., examples=["road_incident", "road_risk", "reroute", "trip_delay", "vehicle", "weather"])
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_entity: Optional[str] = None
    source_entity_id: Optional[int] = None
    dedup_key: Optional[str] = None


class AlertCreate(AlertBase):
    pass


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., examples=["acknowledged", "resolved", "active"])


class AlertResponse(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


class AlertSummary(BaseModel):
    total: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    active: int = 0
    acknowledged: int = 0
    resolved: int = 0
