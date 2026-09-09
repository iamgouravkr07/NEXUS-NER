from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Index
from sqlalchemy.sql import func

from app.database import Base


class WeatherRecord(Base):
    """
    Persistent atmospheric and weather observations/forecasts across the North Eastern Region.
    Supports historical logging for future ML disruption models and low-latency coordinate-temporal caching.
    Indexed using coordinate-temporal compound B-tree indexes (latitude, longitude, timestamp).
    """
    __tablename__ = "weather_records"

    id = Column(Integer, primary_key=True, index=True)

    # Geographic coordinates (WGS84 decimal degrees)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)

    # Observation timestamp
    observed_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Provider / DataSource (e.g., "open-meteo", "mock")
    source = Column(String(50), nullable=False)

    # Atmospheric variables
    temperature_c = Column(Float, nullable=True)
    feels_like_c = Column(Float, nullable=True)
    humidity_percent = Column(Float, nullable=True)
    precipitation_mm = Column(Float, nullable=True, default=0.0)  # Preceding 1-hour accumulated precipitation sum
    rainfall_mm = Column(Float, nullable=True, default=0.0)  # Maintained for backward compatibility
    precipitation_probability = Column(Float, nullable=True)
    wind_speed_kmh = Column(Float, nullable=True)
    wind_gust_kmh = Column(Float, nullable=True)
    pressure_hpa = Column(Float, nullable=True)
    visibility_km = Column(Float, nullable=True)
    weather_condition = Column(String(100), nullable=True)

    # Distinction between current real-time observations and future forecasts
    is_forecast = Column(Boolean, nullable=False, default=False, index=True)
    forecast_timestamp = Column(DateTime(timezone=True), nullable=True, index=True)

    # Optional provider metadata or extra attributes (e.g. WMO code, UV index)
    raw_metadata = Column(JSON, nullable=True)

    # Record insertion timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_weather_loc_observed", "latitude", "longitude", "observed_at"),
        Index("ix_weather_loc_forecast", "latitude", "longitude", "forecast_timestamp"),
    )
