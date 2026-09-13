from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

VALID_REPORT_TYPES = {
    "LANDSLIDE",
    "FLOOD",
    "ROAD_DAMAGE",
    "ROAD_BLOCKAGE",
    "ACCIDENT",
    "DEBRIS",
    "BRIDGE_DAMAGE",
    "HEAVY_CONGESTION",
    "OTHER",
}

VALID_SEVERITIES = {"low", "medium", "high", "critical"}


class PublicReportCreate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    report_type: str = Field(..., description="Controlled category of incident")
    description: str = Field(..., min_length=5, max_length=2000, description="Detailed description of problem")
    road_id: Optional[int] = Field(None, description="Optional affected road identifier")
    severity_hint: Optional[str] = Field(None, description="Citizen-perceived severity level")

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, v: str) -> str:
        normalized = v.strip().upper().replace(" ", "_")
        if normalized not in VALID_REPORT_TYPES:
            raise ValueError(f"Invalid report_type '{v}'. Must be one of: {sorted(VALID_REPORT_TYPES)}")
        return normalized

    @field_validator("severity_hint")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        normalized = v.strip().lower()
        if normalized not in VALID_SEVERITIES:
            raise ValueError(f"Invalid severity_hint '{v}'. Must be one of: {sorted(VALID_SEVERITIES)}")
        return normalized


class PublicReportVerify(BaseModel):
    verification_notes: Optional[str] = Field(None, max_length=1000, description="Reviewer notes")
    severity: Optional[str] = Field("high", description="Official incident severity: low, medium, high, critical")
    link_to_existing_incident_id: Optional[int] = Field(None, description="Link report to existing canonical incident")

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return "high"
        normalized = v.strip().lower()
        if normalized not in VALID_SEVERITIES:
            raise ValueError(f"Invalid severity '{v}'. Must be one of: {sorted(VALID_SEVERITIES)}")
        return normalized


class PublicReportReject(BaseModel):
    rejection_reason: Optional[str] = Field(None, max_length=1000, description="Reason for rejecting the public report")


class PublicReportResponse(BaseModel):
    id: int
    reporter_user_id: int
    latitude: float
    longitude: float
    road_id: Optional[int] = None
    road_name: Optional[str] = None
    report_type: str
    description: str
    severity_hint: Optional[str] = None
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by_user_id: Optional[int] = None
    converted_incident_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    verification_notes: Optional[str] = None

    class Config:
        from_attributes = True


class PublicReportSummary(BaseModel):
    unverified: int
    verified: int
    rejected: int
    total: int
