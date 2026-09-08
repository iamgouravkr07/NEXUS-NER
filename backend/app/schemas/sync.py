from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


VALID_EVENT_TYPES = {"incident_report", "vehicle_gps"}


class SyncEventRequest(BaseModel):
    client_id: str = Field(..., min_length=1, max_length=64, description="Unique client event UUID")
    event_type: str = Field(..., description="Type of event: incident_report or vehicle_gps")
    timestamp: datetime = Field(..., description="ISO-8601 client offline capture timestamp")
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Latitude [-90, 90]")
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Longitude [-180, 180]")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event-specific payload")

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in VALID_EVENT_TYPES:
            raise ValueError(f"Unsupported event_type: '{v}'. Must be one of {sorted(VALID_EVENT_TYPES)}")
        return v_clean


class SyncBatchRequest(BaseModel):
    batch_id: Optional[str] = Field(default=None, max_length=64, description="Optional batch UUID")
    client_device_id: Optional[str] = Field(default=None, max_length=64, description="Optional client device ID")
    events: List[SyncEventRequest] = Field(..., min_length=1, max_length=500, description="List of events to synchronize")


class SyncEventResult(BaseModel):
    client_id: str
    event_type: str
    status: str  # "success", "already_synced", "error"
    server_entity_type: Optional[str] = None  # "incident", "vehicle"
    server_entity_id: Optional[int] = None
    error: Optional[str] = None


class SyncBatchResponse(BaseModel):
    batch_id: Optional[str] = None
    processed_count: int
    success_count: int
    duplicate_count: int
    error_count: int
    results: List[SyncEventResult]
