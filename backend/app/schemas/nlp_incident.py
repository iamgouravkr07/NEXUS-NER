from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class IncidentTypeEnum(str, Enum):
    LANDSLIDE = "landslide"
    FLOOD = "flood"
    HEAVY_RAIN = "heavy_rain"
    ROAD_DAMAGE = "road_damage"
    BRIDGE_DAMAGE = "bridge_damage"
    TRAFFIC_CONGESTION = "traffic_congestion"
    ACCIDENT = "accident"
    BLOCKAGE = "blockage"
    OTHER = "other"


class SeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ExtractionStatusEnum(str, Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class IncidentExtractionRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=3,
        max_length=5000,
        description="Unstructured natural language incident report or dispatch text.",
        examples=["Heavy landslide reported near NH-15 between Guwahati and Tezpur. Road completely blocked."],
    )


class IncidentExtractionData(BaseModel):
    incident_type: IncidentTypeEnum = Field(
        default=IncidentTypeEnum.OTHER,
        description="Categorized incident classification.",
    )
    severity: SeverityEnum = Field(
        default=SeverityEnum.MEDIUM,
        description="Assessed incident severity level.",
    )
    description: str = Field(
        ...,
        description="Cleaned, normalized incident description.",
    )
    location_text: Optional[str] = Field(
        default=None,
        description="Extracted natural language location reference, town, or landmark.",
    )
    latitude: Optional[float] = Field(
        default=None,
        ge=20.0,
        le=30.0,
        description="Extracted latitude coordinate (within North Eastern Region bounds), or null if not explicitly mentioned.",
    )
    longitude: Optional[float] = Field(
        default=None,
        ge=88.0,
        le=98.0,
        description="Extracted longitude coordinate (within North Eastern Region bounds), or null if not explicitly mentioned.",
    )
    road_corridor: Optional[str] = Field(
        default=None,
        description="Extracted highway or corridor reference (e.g. NH-15, NH-415, NH-10).",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Calibrated confidence score of the AI/NLP extraction (0.0 to 1.0).",
    )
    reported_time: Optional[datetime] = Field(
        default=None,
        description="Extracted or referenced incident occurrence timestamp, if mentioned in text.",
    )
    source: str = Field(
        default="nlp_extraction",
        description="Origin marker for the incident record.",
    )
    extracted_entities: Dict[str, Any] = Field(
        default_factory=dict,
        description="Structured key-value entities detected (hazards, casualties, blockage status, vehicles).",
    )
    extraction_status: ExtractionStatusEnum = Field(
        default=ExtractionStatusEnum.SUCCESS,
        description="Overall status of the NLP extraction.",
    )


class IncidentExtractionResponse(BaseModel):
    success: bool = Field(
        ...,
        description="True if extraction was successfully performed.",
    )
    provider: str = Field(
        ...,
        description="Active intelligence provider used ('gemini' or 'fallback').",
    )
    extraction: IncidentExtractionData = Field(
        ...,
        description="Extracted candidate incident payload for operator review.",
    )
    warning: Optional[str] = Field(
        default=None,
        description="Advisory notice or degradation warning, if applicable.",
    )
