from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class AnomalyType(str, Enum):
    ROUTE_DEVIATION = "ROUTE_DEVIATION"
    PROLONGED_STOP = "PROLONGED_STOP"
    GPS_DATA_GAP = "GPS_DATA_GAP"
    ABNORMAL_SPEED = "ABNORMAL_SPEED"
    SENSOR_GLITCH = "SENSOR_GLITCH"


class AnomalySeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TelemetrySnapshot(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = None
    observed_value: Optional[float] = None
    threshold_value: Optional[float] = None


class VehicleAnomaly(BaseModel):
    anomaly_id: str
    vehicle_id: int
    vehicle_number: str
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    description: str
    telemetry: TelemetrySnapshot
    alert_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VehiclePositionData(BaseModel):
    vehicle_id: int
    vehicle_number: str
    latitude: float
    longitude: float
    speed_kmh: float = 0.0
    heading_deg: float = 0.0
    status: str
    current_trip_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WebSocketEvent(BaseModel):
    type: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data: Dict[str, Any]
