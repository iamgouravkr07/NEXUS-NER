import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import NER_BOUNDS
from app.database import get_db
from app.schemas.weather import (
    WeatherCurrentResponse,
    WeatherForecastResponse,
    RouteWeatherResponse,
)
from app.services.weather_service import (
    WeatherProviderError,
    get_weather_at_coordinate,
    get_forecast_at_coordinate,
    get_weather_for_route,
)

logger = logging.getLogger("nexus_ner.weather")

router = APIRouter(
    prefix="/weather",
    tags=["Weather"],
)


def validate_ner_bounds(latitude: float, longitude: float):
    """
    Validate that coordinates fall within the project's operational NER bounding box.
    [20.0 to 30.0 N, 88.0 to 98.0 E].
    Raises 422 Unprocessable Entity if out of bounds.
    """
    min_lat = NER_BOUNDS["min_lat"]
    max_lat = NER_BOUNDS["max_lat"]
    min_lon = NER_BOUNDS["min_lon"]
    max_lon = NER_BOUNDS["max_lon"]

    if not (min_lat <= latitude <= max_lat and min_lon <= longitude <= max_lon):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Coordinates ({latitude:.4f}, {longitude:.4f}) are outside the operational "
                f"North Eastern Region bounding box [{min_lat}-{max_lat} N, {min_lon}-{max_lon} E]."
            ),
        )


class RouteWeatherRequest(BaseModel):
    """Request payload containing GeoJSON route geometry for corridor weather evaluation."""
    route_geometry: Dict[str, Any] = Field(..., description="GeoJSON LineString containing coordinates")
    interval_km: float = Field(default=40.0, ge=5.0, le=200.0, description="Sampling distance interval in km")


@router.get("/current", response_model=WeatherCurrentResponse)
def get_current_weather_endpoint(
    latitude: float = Query(..., ge=20.0, le=30.0, description="Latitude inside NER bounds [20.0, 30.0]"),
    longitude: float = Query(..., ge=88.0, le=98.0, description="Longitude inside NER bounds [88.0, 98.0]"),
    check_alerts: bool = Query(False, description="Whether to evaluate and generate alerts if severe"),
    location_name: Optional[str] = Query(None, description="Optional corridor or city name"),
    db: Session = Depends(get_db),
):
    """
    Retrieve real-time atmospheric observation and deterministic risk signal for an NER coordinate.
    Caches recent observations in PostgreSQL to avoid unnecessary external API calls.
    """
    validate_ner_bounds(latitude, longitude)

    try:
        return get_weather_at_coordinate(
            db=db,
            latitude=latitude,
            longitude=longitude,
            use_cache=True,
            check_alerts=check_alerts,
            location_name=location_name,
        )
    except WeatherProviderError as err:
        logger.warning("External weather provider error for (%.4f, %.4f): %s", latitude, longitude, err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Atmospheric weather service temporarily unavailable: {err}",
        )
    except Exception as err:
        logger.error("Unexpected error retrieving weather for (%.4f, %.4f): %s", latitude, longitude, err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve weather data.",
        )


@router.get("/forecast", response_model=WeatherForecastResponse)
def get_weather_forecast_endpoint(
    latitude: float = Query(..., ge=20.0, le=30.0, description="Latitude inside NER bounds [20.0, 30.0]"),
    longitude: float = Query(..., ge=88.0, le=98.0, description="Longitude inside NER bounds [88.0, 98.0]"),
    hours: int = Query(24, ge=1, le=72, description="Forecast horizon in hours (1-72)"),
    db: Session = Depends(get_db),
):
    """
    Retrieve hourly weather forecast for an operational coordinate within the NER region.
    """
    validate_ner_bounds(latitude, longitude)

    try:
        return get_forecast_at_coordinate(
            db=db,
            latitude=latitude,
            longitude=longitude,
            hours=hours,
        )
    except WeatherProviderError as err:
        logger.warning("External forecast provider error for (%.4f, %.4f): %s", latitude, longitude, err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Atmospheric forecast service temporarily unavailable: {err}",
        )
    except Exception as err:
        logger.error("Unexpected error retrieving forecast for (%.4f, %.4f): %s", latitude, longitude, err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve weather forecast.",
        )


@router.post("/route", response_model=RouteWeatherResponse)
def evaluate_route_weather_endpoint(
    request: RouteWeatherRequest,
    db: Session = Depends(get_db),
):
    """
    Sample weather and deterministic risk exposure across an entire corridor/route geometry.
    Efficiently samples waypoints along the route rather than querying every individual point.
    """
    coordinates = request.route_geometry.get("coordinates", [])
    if not coordinates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Route geometry contains no coordinates.",
        )

    # Validate first coordinate to ensure route is roughly within NER operating envelope
    first_lon, first_lat = coordinates[0]
    validate_ner_bounds(first_lat, first_lon)

    try:
        return get_weather_for_route(
            db=db,
            route_geometry=request.route_geometry,
            interval_km=request.interval_km,
        )
    except WeatherProviderError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Route weather sampling failed: {err}",
        )
