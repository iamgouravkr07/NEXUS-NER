from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator


class WeatherRiskSignal(BaseModel):
    """
    Deterministic weather risk assessment signal.
    Explicitly computed using physical atmospheric thresholds (NOT Machine Learning).
    """
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Deterministic risk score between 0 and 100")
    risk_level: str = Field(..., description="Deterministic risk classification: Low, Moderate, High, Critical")
    signal_type: str = Field(default="DETERMINISTIC_WEATHER_RISK", description="Explicit signal designation")
    factors: List[str] = Field(default_factory=list, description="Specific atmospheric factors driving the risk score")
    warnings: List[str] = Field(default_factory=list, description="Operational warnings for logistics fleet")
    recommendations: List[str] = Field(default_factory=list, description="Guidance for route planning and dispatch")


class WeatherCurrentResponse(BaseModel):
    """Normalized real-time weather observation for an operational coordinate."""
    latitude: float
    longitude: float
    temperature_c: Optional[float] = None
    feels_like_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    precipitation_mm: float = Field(default=0.0, description="Preceding 1-hour accumulated precipitation sum in millimeters (mm)")
    rainfall_mm: float = Field(default=0.0, description="Preceding 1-hour accumulated precipitation in mm (backward-compatible alias)")
    precipitation_probability: Optional[float] = Field(default=None, description="Precipitation probability in percent (0-100%)")
    wind_speed_kmh: Optional[float] = None
    wind_gust_kmh: Optional[float] = None
    pressure_hpa: Optional[float] = None
    visibility_km: Optional[float] = None
    weather_condition: str = "Unknown"
    observed_at: datetime
    source: str
    cached: bool = False
    risk_signal: Optional[WeatherRiskSignal] = None

    @model_validator(mode="before")
    @classmethod
    def _sync_precipitation_fields(cls, data: any) -> any:
        if isinstance(data, dict):
            if "precipitation_mm" in data and "rainfall_mm" not in data:
                data["rainfall_mm"] = data["precipitation_mm"]
            elif "rainfall_mm" in data and "precipitation_mm" not in data:
                data["precipitation_mm"] = data["rainfall_mm"]
        return data

    class Config:
        from_attributes = True


class WeatherForecastItem(BaseModel):
    """Normalized interval/hourly forecast item."""
    forecast_timestamp: datetime
    temperature_c: Optional[float] = None
    feels_like_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    hourly_precipitation_mm: float = Field(default=0.0, description="Preceding 1-hour accumulated precipitation sum in millimeters (mm)")
    precipitation_mm: float = Field(default=0.0, description="Preceding 1-hour accumulated precipitation sum in millimeters (mm)")
    rainfall_mm: float = Field(default=0.0, description="Preceding 1-hour accumulated precipitation in mm (backward-compatible alias)")
    precipitation_probability: Optional[float] = Field(default=None, description="Precipitation probability in percent (0-100%)")
    wind_speed_kmh: Optional[float] = None
    visibility_km: Optional[float] = None
    weather_condition: str = "Unknown"

    @model_validator(mode="before")
    @classmethod
    def _sync_forecast_precipitation_fields(cls, data: any) -> any:
        if isinstance(data, dict):
            val = data.get("hourly_precipitation_mm") or data.get("precipitation_mm") or data.get("rainfall_mm") or 0.0
            data.setdefault("hourly_precipitation_mm", val)
            data.setdefault("precipitation_mm", val)
            data.setdefault("rainfall_mm", val)
        return data


class WeatherForecastResponse(BaseModel):
    """Normalized weather forecast response for an operational coordinate."""
    latitude: float
    longitude: float
    horizon_hours: int
    generated_at: datetime
    source: str
    cached: bool = False
    forecast: List[WeatherForecastItem]


class RouteWeatherWaypoint(BaseModel):
    """Sampled waypoint along a transport corridor with associated weather observation."""
    waypoint_index: int
    latitude: float
    longitude: float
    distance_along_route_km: float
    weather: WeatherCurrentResponse


class RouteWeatherResponse(BaseModel):
    """Weather and deterministic risk signal evaluated across a corridor or route."""
    distance_km: float
    sampled_points_count: int
    waypoints: List[RouteWeatherWaypoint]
    composite_risk_signal: WeatherRiskSignal
