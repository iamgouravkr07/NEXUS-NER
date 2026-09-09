import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple

import requests
from sqlalchemy.orm import Session

from app import config
from app.models.alert import Alert
from app.models.weather import WeatherRecord
from app.schemas.weather import (
    WeatherRiskSignal,
    WeatherCurrentResponse,
    WeatherForecastItem,
    WeatherForecastResponse,
    RouteWeatherWaypoint,
    RouteWeatherResponse,
)
from app.services.alert_service import create_alert
from app.services.risk import haversine_distance_km

logger = logging.getLogger("nexus_ner.weather")


class WeatherProviderError(RuntimeError):
    """Raised when an external weather provider fails or cannot be reached."""
    pass


# ---------------------------------------------------------------------------
# Provider Abstraction Interface
# ---------------------------------------------------------------------------

class WeatherProvider(ABC):
    """Abstract interface for atmospheric weather providers."""

    @abstractmethod
    def get_current_weather(self, latitude: float, longitude: float) -> WeatherCurrentResponse:
        """Fetch normalized current weather observation for a coordinate."""
        pass

    @abstractmethod
    def get_forecast(self, latitude: float, longitude: float, hours: int = 24) -> WeatherForecastResponse:
        """Fetch normalized hourly forecast for a coordinate."""
        pass


# ---------------------------------------------------------------------------
# Open-Meteo Provider (Backend-only integration, No API Key required)
# ---------------------------------------------------------------------------

WMO_WEATHER_CODES: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


class OpenMeteoProvider(WeatherProvider):
    """
    Open-Meteo live atmospheric provider.
    Accessed exclusively from the backend; exposes no credentials to clients.
    """
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self, timeout_seconds: int = 10):
        self.timeout_seconds = timeout_seconds

    def _interpret_wmo(self, code: Optional[int]) -> str:
        if code is None:
            return "Unknown"
        return WMO_WEATHER_CODES.get(code, f"Weather code {code}")

    def get_current_weather(self, latitude: float, longitude: float) -> WeatherCurrentResponse:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": (
                "temperature_2m,relative_humidity_2m,apparent_temperature,"
                "precipitation,wind_speed_10m,wind_gusts_10m,"
                "surface_pressure,visibility,weather_code"
            ),
            "timezone": "UTC",
        }
        headers = {"User-Agent": "NEXUS-NER-WeatherService/1.0 (India SIH2026 Emergency Logistics)"}

        try:
            resp = requests.get(
                self.BASE_URL,
                params=params,
                headers=headers,
                timeout=self.timeout_seconds,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as err:
            logger.warning("Open-Meteo current weather request failed for (%.4f, %.4f): %s", latitude, longitude, err)
            raise WeatherProviderError(f"External weather service unavailable: {err}") from err

        current = data.get("current", {})
        time_str = current.get("time")
        observed_at = (
            datetime.fromisoformat(time_str).replace(tzinfo=timezone.utc)
            if time_str
            else datetime.now(timezone.utc)
        )

        raw_visibility = current.get("visibility")
        visibility_km = round(raw_visibility / 1000.0, 2) if raw_visibility is not None else None
        precip_current = float(current.get("precipitation") or 0.0)

        return WeatherCurrentResponse(
            latitude=latitude,
            longitude=longitude,
            temperature_c=current.get("temperature_2m"),
            feels_like_c=current.get("apparent_temperature"),
            humidity_percent=current.get("relative_humidity_2m"),
            precipitation_mm=precip_current,
            rainfall_mm=precip_current,
            precipitation_probability=None,
            wind_speed_kmh=current.get("wind_speed_10m"),
            wind_gust_kmh=current.get("wind_gusts_10m"),
            pressure_hpa=current.get("surface_pressure"),
            visibility_km=visibility_km,
            weather_condition=self._interpret_wmo(current.get("weather_code")),
            observed_at=observed_at,
            source="open-meteo",
            cached=False,
        )

    def get_forecast(self, latitude: float, longitude: float, hours: int = 24) -> WeatherForecastResponse:
        forecast_hours = max(1, min(hours, 72))
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": (
                "temperature_2m,apparent_temperature,relative_humidity_2m,"
                "precipitation,precipitation_probability,wind_speed_10m,"
                "visibility,weather_code"
            ),
            "forecast_hours": forecast_hours,
            "timezone": "UTC",
        }
        headers = {"User-Agent": "NEXUS-NER-WeatherService/1.0 (India SIH2026 Emergency Logistics)"}

        try:
            resp = requests.get(
                self.BASE_URL,
                params=params,
                headers=headers,
                timeout=self.timeout_seconds,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as err:
            logger.warning("Open-Meteo forecast request failed for (%.4f, %.4f): %s", latitude, longitude, err)
            raise WeatherProviderError(f"External weather service unavailable: {err}") from err

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        feels = hourly.get("apparent_temperature", [])
        humids = hourly.get("relative_humidity_2m", [])
        precips = hourly.get("precipitation", [])
        precip_probs = hourly.get("precipitation_probability", [])
        winds = hourly.get("wind_speed_10m", [])
        visibilities = hourly.get("visibility", [])
        codes = hourly.get("weather_code", [])

        forecast_items: List[WeatherForecastItem] = []
        for i in range(min(len(times), forecast_hours)):
            t_str = times[i]
            t_dt = (
                datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
                if t_str
                else datetime.now(timezone.utc)
            )
            raw_v = visibilities[i] if i < len(visibilities) else None
            v_km = round(raw_v / 1000.0, 2) if raw_v is not None else None
            code = codes[i] if i < len(codes) else None
            p_hourly = float(precips[i] or 0.0) if i < len(precips) else 0.0

            forecast_items.append(
                WeatherForecastItem(
                    forecast_timestamp=t_dt,
                    temperature_c=temps[i] if i < len(temps) else None,
                    feels_like_c=feels[i] if i < len(feels) else None,
                    humidity_percent=humids[i] if i < len(humids) else None,
                    hourly_precipitation_mm=p_hourly,
                    precipitation_mm=p_hourly,
                    rainfall_mm=p_hourly,
                    precipitation_probability=(
                        float(precip_probs[i])
                        if i < len(precip_probs) and precip_probs[i] is not None
                        else None
                    ),
                    wind_speed_kmh=winds[i] if i < len(winds) else None,
                    visibility_km=v_km,
                    weather_condition=self._interpret_wmo(code),
                )
            )

        return WeatherForecastResponse(
            latitude=latitude,
            longitude=longitude,
            horizon_hours=forecast_hours,
            generated_at=datetime.now(timezone.utc),
            source="open-meteo",
            cached=False,
            forecast=forecast_items,
        )


# ---------------------------------------------------------------------------
# Mock Weather Provider (Deterministic, Offline, and Unit Testing)
# ---------------------------------------------------------------------------

class MockWeatherProvider(WeatherProvider):
    """
    Deterministic mock weather provider for offline execution and test suites.
    Supports preset injection for testing extreme rain, wind, fog, and alerts.
    """

    def __init__(self):
        self._preset_current: Optional[Dict[str, Any]] = None
        self._preset_forecast: Optional[List[Dict[str, Any]]] = None
        self._fail_next_call: bool = False

    def inject_failure(self, fail: bool = True):
        self._fail_next_call = fail

    def set_current_override(self, **kwargs):
        """Set specific atmospheric variables to return on subsequent current weather queries."""
        self._preset_current = kwargs

    def clear_overrides(self):
        self._preset_current = None
        self._preset_forecast = None
        self._fail_next_call = False

    def get_current_weather(self, latitude: float, longitude: float) -> WeatherCurrentResponse:
        if self._fail_next_call:
            raise WeatherProviderError("Simulated mock weather provider connection failure")

        now = datetime.now(timezone.utc)

        if self._preset_current:
            c = self._preset_current
            precip_val = float(c.get("precipitation_mm", c.get("rainfall_mm", 0.0)))
            return WeatherCurrentResponse(
                latitude=latitude,
                longitude=longitude,
                temperature_c=c.get("temperature_c", 24.5),
                feels_like_c=c.get("feels_like_c", 26.0),
                humidity_percent=c.get("humidity_percent", 78.0),
                precipitation_mm=precip_val,
                rainfall_mm=precip_val,
                precipitation_probability=c.get("precipitation_probability", 10.0),
                wind_speed_kmh=c.get("wind_speed_kmh", 14.0),
                wind_gust_kmh=c.get("wind_gusts_kmh", c.get("wind_gust_kmh", 20.0)),
                pressure_hpa=c.get("pressure_hpa", 1012.0),
                visibility_km=c.get("visibility_km", 10.0),
                weather_condition=c.get("weather_condition", "Partly cloudy"),
                observed_at=c.get("observed_at", now),
                source="mock",
                cached=False,
            )

        # Coordinate-derived deterministic baseline for NER region
        lat_offset = (latitude - 20.0) / 10.0  # 0.0 - 1.0
        lon_offset = (longitude - 88.0) / 10.0  # 0.0 - 1.0

        temp = round(28.0 - (lat_offset * 10.0), 1)
        rain = round(max(0.0, (lon_offset - 0.5) * 4.0), 1)

        return WeatherCurrentResponse(
            latitude=latitude,
            longitude=longitude,
            temperature_c=temp,
            feels_like_c=round(temp + 2.0, 1),
            humidity_percent=round(65.0 + (lat_offset * 20.0), 1),
            precipitation_mm=rain,
            rainfall_mm=rain,
            precipitation_probability=round(rain * 15.0, 1),
            wind_speed_kmh=round(12.0 + (lon_offset * 10.0), 1),
            wind_gust_kmh=round(18.0 + (lon_offset * 12.0), 1),
            pressure_hpa=1012.0,
            visibility_km=round(max(2.0, 10.0 - (rain * 1.5)), 1),
            weather_condition="Slight rain" if rain > 0 else "Partly cloudy",
            observed_at=now,
            source="mock",
            cached=False,
        )

    def get_forecast(self, latitude: float, longitude: float, hours: int = 24) -> WeatherForecastResponse:
        if self._fail_next_call:
            raise WeatherProviderError("Simulated mock forecast provider failure")

        now = datetime.now(timezone.utc)
        forecast_items: List[WeatherForecastItem] = []

        for h in range(hours):
            t_stamp = now + timedelta(hours=h + 1)
            p_val = 0.5 if (h % 4 == 0) else 0.0
            forecast_items.append(
                WeatherForecastItem(
                    forecast_timestamp=t_stamp,
                    temperature_c=22.0 + (h % 5),
                    feels_like_c=23.5 + (h % 5),
                    humidity_percent=70.0 + (h % 15),
                    hourly_precipitation_mm=p_val,
                    precipitation_mm=p_val,
                    rainfall_mm=p_val,
                    precipitation_probability=20.0 if (h % 4 == 0) else 5.0,
                    wind_speed_kmh=12.0 + (h % 8),
                    visibility_km=9.5,
                    weather_condition="Rain showers" if (h % 4 == 0) else "Mainly clear",
                )
            )

        return WeatherForecastResponse(
            latitude=latitude,
            longitude=longitude,
            horizon_hours=hours,
            generated_at=now,
            source="mock",
            cached=False,
            forecast=forecast_items,
        )


# Singleton provider instance management
_ACTIVE_PROVIDER: Optional[WeatherProvider] = None


def get_weather_provider() -> WeatherProvider:
    """Return the configured weather provider singleton."""
    global _ACTIVE_PROVIDER
    if _ACTIVE_PROVIDER is not None:
        return _ACTIVE_PROVIDER

    provider_name = config.WEATHER_PROVIDER
    if provider_name == "mock":
        _ACTIVE_PROVIDER = MockWeatherProvider()
    else:
        _ACTIVE_PROVIDER = OpenMeteoProvider(timeout_seconds=config.WEATHER_REQUEST_TIMEOUT_SECONDS)
    return _ACTIVE_PROVIDER


def set_weather_provider(provider: WeatherProvider):
    """Override active provider (useful for unit test fixture injection)."""
    global _ACTIVE_PROVIDER
    _ACTIVE_PROVIDER = provider


# ---------------------------------------------------------------------------
# Deterministic Weather Risk Evaluation (EXPLICITLY DETERMINISTIC, NOT ML)
# ---------------------------------------------------------------------------

def evaluate_deterministic_weather_risk(weather: WeatherCurrentResponse) -> WeatherRiskSignal:
    """
    Compute a deterministic weather risk score and signal based on physical atmospheric thresholds.
    This signal is strictly deterministic and rule-based (NOT Machine Learning).
    Thresholds are operational heuristic safety rules configured in app.config.WEATHER_RISK_THRESHOLDS.
    Precipitation represents accumulated rainfall/precipitation over the preceding 1-hour window (in mm).
    """
    score = 0.0
    factors: List[str] = []
    warnings: List[str] = []
    recommendations: List[str] = []

    thresholds = getattr(config, "WEATHER_RISK_THRESHOLDS", {})
    p_thresh = thresholds.get("precipitation_mm", {})
    w_thresh = thresholds.get("wind_kmh", {})
    v_thresh = thresholds.get("visibility_km", {})

    t_rain_extreme = p_thresh.get("extreme", 50.0)
    t_rain_heavy = p_thresh.get("heavy", 15.0)
    t_rain_mod = p_thresh.get("moderate", 5.0)

    t_wind_gale = w_thresh.get("gale", 70.0)
    t_wind_strong = w_thresh.get("strong", 45.0)

    t_vis_dense = v_thresh.get("dense_fog", 0.8)
    t_vis_fog = v_thresh.get("fog", 2.0)

    # 1. Rainfall / Precipitation intensity (preceding 1-hour accumulation in mm)
    rain = weather.precipitation_mm if weather.precipitation_mm is not None else (weather.rainfall_mm or 0.0)
    if rain >= t_rain_extreme:
        score += 50.0
        factors.append(f"Extreme rainfall ({rain:.1f} mm preceding 1h sum): high risk of flash floods and severe landslides")
        warnings.append("CRITICAL HAZARD: Impending flash flood / mudslide threat across regional corridors")
        recommendations.append("Halt freight transit across ghat and vulnerable mountain routes immediately")
    elif rain >= t_rain_heavy:
        score += 30.0
        factors.append(f"Heavy rainfall ({rain:.1f} mm preceding 1h sum): road water-logging and slope soil saturation")
        warnings.append("HIGH RISK: Substantial wet road braking distance and localized debris runoff")
        recommendations.append("Reduce speed by 30%; avoid unpaved bypasses")
    elif rain >= t_rain_mod:
        score += 15.0
        factors.append(f"Moderate rainfall ({rain:.1f} mm preceding 1h sum): wet road surface")
        warnings.append("Caution: Wet road conditions")
        recommendations.append("Ensure wipers and headlights are active")

    # 2. Wind speed and gusts (instantaneous / 10m surface winds in km/h)
    wind = weather.wind_speed_kmh or 0.0
    gust = weather.wind_gust_kmh or 0.0
    if wind >= t_wind_gale or gust >= 85.0:
        score += 35.0
        factors.append(f"Gale-force winds ({wind:.1f} km/h, gust {gust:.1f} km/h): vehicle rollover hazard")
        warnings.append("HIGH WIND WARNING: Severe crosswinds along ridge corridors and river bridges")
        recommendations.append("High-sided freight trucks should pause transit until wind speeds moderate")
    elif wind >= t_wind_strong or gust >= 60.0:
        score += 18.0
        factors.append(f"Strong mountain wind gusts ({wind:.1f} km/h)")
        warnings.append("Caution: Gusty crosswinds on elevated highway segments")

    # 3. Visibility impairment (instantaneous surface visibility in km)
    vis = weather.visibility_km
    if vis is not None:
        if vis <= t_vis_dense:
            score += 35.0
            factors.append(f"Dense fog / severely impaired visibility ({vis:.1f} km)")
            warnings.append("CRITICAL VISIBILITY: Mountain pass visibility severely restricted")
            recommendations.append("Use low-beam fog lights and maintain minimum 50m vehicle spacing")
        elif vis <= t_vis_fog:
            score += 18.0
            factors.append(f"Reduced visibility in mountain fog ({vis:.1f} km)")
            warnings.append("Caution: Moderate fog / haze along corridor")

    # 4. Severe weather condition keywords
    cond_lower = (weather.weather_condition or "").lower()
    if any(k in cond_lower for k in ("thunderstorm", "hail", "violent", "squall")):
        score += 25.0
        factors.append(f"Severe atmospheric condition: {weather.weather_condition}")
        warnings.append("Severe storm activity reported along corridor")

    # Clamp composite score [0.0, 100.0]
    final_score = round(min(100.0, max(0.0, score)), 1)

    if final_score >= 75.0:
        level = "Critical"
    elif final_score >= 45.0:
        level = "High"
    elif final_score >= 15.0:
        level = "Moderate"
    else:
        level = "Low"


    return WeatherRiskSignal(
        risk_score=final_score,
        risk_level=level,
        signal_type="DETERMINISTIC_WEATHER_RISK",
        factors=factors,
        warnings=warnings,
        recommendations=recommendations,
    )


# ---------------------------------------------------------------------------
# Alert Engine Integration (Reusing Phase 3 AlertService with Deduplication)
# ---------------------------------------------------------------------------

def check_and_generate_weather_alert(
    db: Session,
    weather: WeatherCurrentResponse,
    location_name: Optional[str] = None,
) -> Optional[Alert]:
    """
    Evaluate whether current weather conditions meet criteria for an operational alert.
    Reuses existing Alert model and create_alert service with stable grid-based deduplication keys.
    """
    risk = weather.risk_signal or evaluate_deterministic_weather_risk(weather)
    rain = weather.precipitation_mm if weather.precipitation_mm is not None else (weather.rainfall_mm or 0.0)
    wind = weather.wind_speed_kmh or 0.0
    vis = weather.visibility_km

    # Criteria for operational weather alerts
    if risk.risk_score >= 80.0 or rain >= 50.0 or wind >= 70.0:
        severity = "critical"
        hazard_key = "extreme_weather"
        title = f"Critical Weather Alert: {weather.weather_condition}"
    elif risk.risk_score >= 50.0 or rain >= 15.0 or wind >= 50.0 or (vis is not None and vis <= 1.0):
        severity = "high"
        hazard_key = "adverse_weather"
        title = f"Weather Warning: {weather.weather_condition}"
    else:
        # Does not warrant an operational alert
        return None

    # Stable deduplication key: rounded to ~0.1 deg (~11 km grid) to avoid alert fatigue
    grid_lat = round(weather.latitude, 1)
    grid_lon = round(weather.longitude, 1)
    dedup_key = f"weather:{grid_lat:.1f}:{grid_lon:.1f}:{hazard_key}"

    description_parts = []
    if risk.factors:
        description_parts.append("; ".join(risk.factors))
    if risk.recommendations:
        description_parts.append("Recommendation: " + "; ".join(risk.recommendations))
    description = ". ".join(description_parts) or f"Severe weather conditions observed: {weather.weather_condition}"

    loc_str = location_name or f"Corridor ({weather.latitude:.2f}, {weather.longitude:.2f})"

    return create_alert(
        db=db,
        title=title,
        description=description,
        severity=severity,
        alert_type="weather",
        location=loc_str,
        latitude=weather.latitude,
        longitude=weather.longitude,
        source_entity="weather",
        dedup_key=dedup_key,
        suppress_window_minutes=60,
    )


# ---------------------------------------------------------------------------
# Database Caching & Persistence Service
# ---------------------------------------------------------------------------

def get_weather_at_coordinate(
    db: Session,
    latitude: float,
    longitude: float,
    use_cache: bool = True,
    check_alerts: bool = False,
    location_name: Optional[str] = None,
) -> WeatherCurrentResponse:
    """
    Retrieve real-time weather for a coordinate.
    Uses PostgreSQL weather_records table as a low-latency coordinate-temporal cache.
    On cache miss, queries active WeatherProvider, persists observation for future ML, and returns normalized data.
    """
    now_utc = datetime.now(timezone.utc)
    ttl_cutoff = now_utc - timedelta(minutes=config.WEATHER_CACHE_TTL_MINUTES)

    # 1. Check local coordinate-temporal cache in database (~0.04 deg approx 4.4km proximity)
    if use_cache:
        cached_record = (
            db.query(WeatherRecord)
            .filter(
                WeatherRecord.latitude.between(latitude - 0.04, latitude + 0.04),
                WeatherRecord.longitude.between(longitude - 0.04, longitude + 0.04),
                WeatherRecord.is_forecast.is_(False),
                WeatherRecord.observed_at >= ttl_cutoff,
            )
            .order_by(WeatherRecord.observed_at.desc())
            .first()
        )

        if cached_record:
            precip_val = float(cached_record.precipitation_mm or cached_record.rainfall_mm or 0.0)
            cached_resp = WeatherCurrentResponse(
                latitude=latitude,
                longitude=longitude,
                temperature_c=cached_record.temperature_c,
                feels_like_c=cached_record.feels_like_c,
                humidity_percent=cached_record.humidity_percent,
                precipitation_mm=precip_val,
                rainfall_mm=precip_val,
                precipitation_probability=cached_record.precipitation_probability,
                wind_speed_kmh=cached_record.wind_speed_kmh,
                wind_gust_kmh=cached_record.wind_gust_kmh,
                pressure_hpa=cached_record.pressure_hpa,
                visibility_km=cached_record.visibility_km,
                weather_condition=cached_record.weather_condition or "Unknown",
                observed_at=cached_record.observed_at,
                source=cached_record.source,
                cached=True,
            )
            cached_resp.risk_signal = evaluate_deterministic_weather_risk(cached_resp)
            if check_alerts:
                check_and_generate_weather_alert(db, cached_resp, location_name)
            return cached_resp

    # 2. Fetch from active weather provider
    provider = get_weather_provider()
    try:
        weather_resp = provider.get_current_weather(latitude, longitude)
    except WeatherProviderError as err:
        if use_cache:
            fallback_record = (
                db.query(WeatherRecord)
                .filter(
                    WeatherRecord.latitude.between(latitude - 0.04, latitude + 0.04),
                    WeatherRecord.longitude.between(longitude - 0.04, longitude + 0.04),
                    WeatherRecord.is_forecast.is_(False),
                )
                .order_by(WeatherRecord.observed_at.desc())
                .first()
            )
            if fallback_record:
                logger.info(
                    "Serving cached weather record for (%.4f, %.4f) following provider failure: %s",
                    latitude,
                    longitude,
                    err,
                )
                fb_precip = float(fallback_record.precipitation_mm or fallback_record.rainfall_mm or 0.0)
                cached_resp = WeatherCurrentResponse(
                    latitude=latitude,
                    longitude=longitude,
                    temperature_c=fallback_record.temperature_c,
                    feels_like_c=fallback_record.feels_like_c,
                    humidity_percent=fallback_record.humidity_percent,
                    precipitation_mm=fb_precip,
                    rainfall_mm=fb_precip,
                    precipitation_probability=fallback_record.precipitation_probability,
                    wind_speed_kmh=fallback_record.wind_speed_kmh,
                    wind_gust_kmh=fallback_record.wind_gust_kmh,
                    pressure_hpa=fallback_record.pressure_hpa,
                    visibility_km=fallback_record.visibility_km,
                    weather_condition=fallback_record.weather_condition or "Unknown",
                    observed_at=fallback_record.observed_at,
                    source=fallback_record.source,
                    cached=True,
                )
                cached_resp.risk_signal = evaluate_deterministic_weather_risk(cached_resp)
                if check_alerts:
                    check_and_generate_weather_alert(db, cached_resp, location_name)
                return cached_resp
        raise

    weather_resp.risk_signal = evaluate_deterministic_weather_risk(weather_resp)

    # 3. Persist to database for future ML training and cache population
    try:
        record = WeatherRecord(
            latitude=latitude,
            longitude=longitude,
            observed_at=weather_resp.observed_at,
            source=weather_resp.source,
            temperature_c=weather_resp.temperature_c,
            feels_like_c=weather_resp.feels_like_c,
            humidity_percent=weather_resp.humidity_percent,
            precipitation_mm=weather_resp.precipitation_mm,
            rainfall_mm=weather_resp.rainfall_mm,
            precipitation_probability=weather_resp.precipitation_probability,
            wind_speed_kmh=weather_resp.wind_speed_kmh,
            wind_gust_kmh=weather_resp.wind_gust_kmh,
            pressure_hpa=weather_resp.pressure_hpa,
            visibility_km=weather_resp.visibility_km,
            weather_condition=weather_resp.weather_condition,
            is_forecast=False,
            raw_metadata={"risk_score": weather_resp.risk_signal.risk_score},
        )
        db.add(record)
        db.commit()
    except Exception as err:
        db.rollback()
        logger.warning("Failed to persist weather record to database: %s", err)

    if check_alerts:
        check_and_generate_weather_alert(db, weather_resp, location_name)

    return weather_resp


def get_forecast_at_coordinate(
    db: Session,
    latitude: float,
    longitude: float,
    hours: int = 24,
) -> WeatherForecastResponse:
    """Fetch hourly weather forecast for an operational coordinate."""
    provider = get_weather_provider()
    return provider.get_forecast(latitude, longitude, hours=hours)


# ---------------------------------------------------------------------------
# Corridor & Route Spatial Weather Sampling
# ---------------------------------------------------------------------------

def get_weather_for_route(
    db: Session,
    route_geometry: Dict[str, Any],
    interval_km: float = 40.0,
) -> RouteWeatherResponse:
    """
    Sample weather along a GeoJSON route LineString without querying every point.
    Calculates composite deterministic weather risk across the corridor.
    Provides a clean, reusable interface for future ML disruption models.
    """
    coordinates = route_geometry.get("coordinates", [])
    if not coordinates:
        return RouteWeatherResponse(
            distance_km=0.0,
            sampled_points_count=0,
            waypoints=[],
            composite_risk_signal=WeatherRiskSignal(
                risk_score=0.0,
                risk_level="Low",
                signal_type="DETERMINISTIC_WEATHER_RISK",
            ),
        )

    # Calculate cumulative distance and select sample points
    sampled_indices: List[Tuple[int, float]] = [(0, 0.0)]
    total_dist_km = 0.0
    last_sample_dist = 0.0

    for i in range(1, len(coordinates)):
        lon1, lat1 = coordinates[i - 1]
        lon2, lat2 = coordinates[i]
        step_km = haversine_distance_km(lat1, lon1, lat2, lon2)
        total_dist_km += step_km

        if (total_dist_km - last_sample_dist) >= interval_km:
            sampled_indices.append((i, total_dist_km))
            last_sample_dist = total_dist_km

    # Ensure destination point is included
    if (len(coordinates) - 1, total_dist_km) not in sampled_indices:
        sampled_indices.append((len(coordinates) - 1, total_dist_km))

    waypoints: List[RouteWeatherWaypoint] = []
    max_risk_score = 0.0
    all_factors: List[str] = []
    all_warnings: List[str] = []
    all_recommendations: List[str] = []

    for wp_idx, (coord_idx, dist_km) in enumerate(sampled_indices):
        lon, lat = coordinates[coord_idx]
        wp_weather = get_weather_at_coordinate(db, lat, lon, use_cache=True)

        if wp_weather.risk_signal:
            sig = wp_weather.risk_signal
            if sig.risk_score > max_risk_score:
                max_risk_score = sig.risk_score
            for f in sig.factors:
                if f not in all_factors:
                    all_factors.append(f)
            for w in sig.warnings:
                if w not in all_warnings:
                    all_warnings.append(w)
            for r in sig.recommendations:
                if r not in all_recommendations:
                    all_recommendations.append(r)

        waypoints.append(
            RouteWeatherWaypoint(
                waypoint_index=wp_idx,
                latitude=lat,
                longitude=lon,
                distance_along_route_km=round(dist_km, 2),
                weather=wp_weather,
            )
        )

    # Composite risk classification
    if max_risk_score >= 80.0:
        comp_level = "Critical"
    elif max_risk_score >= 50.0:
        comp_level = "High"
    elif max_risk_score >= 25.0:
        comp_level = "Moderate"
    else:
        comp_level = "Low"

    composite_signal = WeatherRiskSignal(
        risk_score=max_risk_score,
        risk_level=comp_level,
        signal_type="DETERMINISTIC_WEATHER_RISK",
        factors=all_factors,
        warnings=all_warnings,
        recommendations=all_recommendations,
    )

    return RouteWeatherResponse(
        distance_km=round(total_dist_km, 2),
        sampled_points_count=len(waypoints),
        waypoints=waypoints,
        composite_risk_signal=composite_signal,
    )
