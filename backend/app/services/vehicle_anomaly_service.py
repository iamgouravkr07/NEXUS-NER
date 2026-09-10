import json
import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.anomaly import (
    AnomalySeverity,
    AnomalyType,
    TelemetrySnapshot,
    VehicleAnomaly,
)
from app.services import alert_service

logger = logging.getLogger("nexus_ner.anomaly")

# Operational thresholds for North Eastern Region mountain logistics
THRESHOLD_ROUTE_DEVIATION_KM = 5.0
THRESHOLD_PROLONGED_STOP_SECONDS = 15 * 60  # 15 minutes
THRESHOLD_PROLONGED_STOP_DISPLACEMENT_KM = 0.05  # 50 meters
THRESHOLD_GPS_GAP_SECONDS = 20 * 60  # 20 minutes
THRESHOLD_SPEED_ABNORMAL_KMH = 90.0
THRESHOLD_SPEED_GLITCH_KMH = 160.0

COOLDOWN_ROUTE_DEVIATION_MIN = 30
COOLDOWN_PROLONGED_STOP_MIN = 30
COOLDOWN_GPS_GAP_MIN = 60
COOLDOWN_SPEED_MIN = 15


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    radius_earth_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius_earth_km * c


def calculate_min_route_distance_km(
    lat: float,
    lon: float,
    route_geometry_raw: Optional[str],
) -> Optional[float]:
    """
    Calculate the minimum haversine distance in km from a vehicle coordinate
    to any vertex of the assigned route geometry.
    Supports GeoJSON dict or serialized JSON string with coordinates: [[lon, lat], ...].
    """
    if not route_geometry_raw:
        return None

    try:
        geom = json.loads(route_geometry_raw) if isinstance(route_geometry_raw, str) else route_geometry_raw
        coords = geom.get("coordinates", [])
        if not coords:
            return None

        # GeoJSON is [longitude, latitude]
        min_dist = min(
            haversine_km(lat, lon, pt[1], pt[0]) for pt in coords
        )
        return round(min_dist, 3)
    except Exception as err:
        logger.warning("Failed to parse route geometry for cross-track distance: %s", err)
        return None


class VehicleAnomalyService:
    """
    Deterministic, explainable vehicle telemetry anomaly detection engine.
    Monitors vehicle GPS stream and flags operational discrepancies:
    1. ROUTE_DEVIATION
    2. PROLONGED_STOP
    3. GPS_DATA_GAP
    4. ABNORMAL_SPEED / SENSOR_GLITCH
    """

    @classmethod
    def evaluate_telemetry(
        cls,
        vehicle: Vehicle,
        new_lat: float,
        new_lon: float,
        new_timestamp: Optional[datetime],
        new_status: Optional[str],
        db: Session,
    ) -> Optional[VehicleAnomaly]:
        """
        Evaluate new telemetry against previous vehicle state.
        If an anomaly is detected, creates a persistent operational alert
        via alert_service (with deduplication) and returns the VehicleAnomaly.
        """
        now = new_timestamp or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        prev_lat = vehicle.latitude
        prev_lon = vehicle.longitude
        prev_timestamp = vehicle.last_gps_timestamp
        if prev_timestamp and prev_timestamp.tzinfo is None:
            prev_timestamp = prev_timestamp.replace(tzinfo=timezone.utc)

        active_status = (new_status or vehicle.status or "").lower()

        # -------------------------------------------------------------
        # 1. GPS DATA GAP CHECK
        # -------------------------------------------------------------
        if active_status == "in_transit" and prev_timestamp is not None:
            gap_seconds = (now - prev_timestamp).total_seconds()
            if gap_seconds > THRESHOLD_GPS_GAP_SECONDS:
                gap_minutes = round(gap_seconds / 60.0, 1)
                anomaly = VehicleAnomaly(
                    anomaly_id=f"gap-{vehicle.id}-{int(now.timestamp())}",
                    vehicle_id=vehicle.id,
                    vehicle_number=vehicle.vehicle_number,
                    anomaly_type=AnomalyType.GPS_DATA_GAP,
                    severity=AnomalySeverity.MEDIUM,
                    confidence=0.80,
                    description=(
                        f"Telemetry gap of {gap_minutes} min detected for vehicle {vehicle.vehicle_number} "
                        f"(threshold: {THRESHOLD_GPS_GAP_SECONDS // 60} min)."
                    ),
                    telemetry=TelemetrySnapshot(
                        latitude=new_lat,
                        longitude=new_lon,
                        observed_value=gap_minutes,
                        threshold_value=THRESHOLD_GPS_GAP_SECONDS / 60.0,
                    ),
                    timestamp=now,
                )
                return cls._dispatch_alert(anomaly, db, vehicle, COOLDOWN_GPS_GAP_MIN)

        # -------------------------------------------------------------
        # 2. SPEED CHECKS (ABNORMAL_SPEED & SENSOR_GLITCH)
        # -------------------------------------------------------------
        if prev_lat is not None and prev_lon is not None and prev_timestamp is not None:
            dt_seconds = (now - prev_timestamp).total_seconds()
            if dt_seconds > 0.5:  # Avoid division by microsecond noise
                displacement_km = haversine_km(prev_lat, prev_lon, new_lat, new_lon)
                speed_kmh = round((displacement_km / dt_seconds) * 3600.0, 1)

                if speed_kmh > THRESHOLD_SPEED_GLITCH_KMH:
                    # Sensor glitch / GPS jump (teleportation) - diagnostic warning
                    anomaly = VehicleAnomaly(
                        anomaly_id=f"glitch-{vehicle.id}-{int(now.timestamp())}",
                        vehicle_id=vehicle.id,
                        vehicle_number=vehicle.vehicle_number,
                        anomaly_type=AnomalyType.SENSOR_GLITCH,
                        severity=AnomalySeverity.LOW,
                        confidence=0.95,
                        description=(
                            f"Sensor glitch / teleportation jump ({speed_kmh} km/h over {round(dt_seconds, 1)}s) "
                            f"detected for vehicle {vehicle.vehicle_number}."
                        ),
                        telemetry=TelemetrySnapshot(
                            latitude=new_lat,
                            longitude=new_lon,
                            speed_kmh=speed_kmh,
                            observed_value=speed_kmh,
                            threshold_value=THRESHOLD_SPEED_GLITCH_KMH,
                        ),
                        timestamp=now,
                    )
                    # Sensor glitches are diagnostic; do not dispatch high-priority alerts
                    return anomaly

                elif speed_kmh > THRESHOLD_SPEED_ABNORMAL_KMH:
                    # Hazardous speeding in mountain terrain
                    anomaly = VehicleAnomaly(
                        anomaly_id=f"speed-{vehicle.id}-{int(now.timestamp())}",
                        vehicle_id=vehicle.id,
                        vehicle_number=vehicle.vehicle_number,
                        anomaly_type=AnomalyType.ABNORMAL_SPEED,
                        severity=AnomalySeverity.HIGH,
                        confidence=0.92,
                        description=(
                            f"Excessive speed ({speed_kmh} km/h) on mountain corridor detected "
                            f"for vehicle {vehicle.vehicle_number} (limit: {THRESHOLD_SPEED_ABNORMAL_KMH} km/h)."
                        ),
                        telemetry=TelemetrySnapshot(
                            latitude=new_lat,
                            longitude=new_lon,
                            speed_kmh=speed_kmh,
                            observed_value=speed_kmh,
                            threshold_value=THRESHOLD_SPEED_ABNORMAL_KMH,
                        ),
                        timestamp=now,
                    )
                    return cls._dispatch_alert(anomaly, db, vehicle, COOLDOWN_SPEED_MIN)

        # -------------------------------------------------------------
        # 3. PROLONGED STOP CHECK
        # -------------------------------------------------------------
        if active_status == "in_transit" and prev_lat is not None and prev_lon is not None and prev_timestamp is not None:
            displacement = haversine_km(prev_lat, prev_lon, new_lat, new_lon)
            time_stopped = (now - prev_timestamp).total_seconds()

            if displacement < THRESHOLD_PROLONGED_STOP_DISPLACEMENT_KM and time_stopped >= THRESHOLD_PROLONGED_STOP_SECONDS:
                is_high_priority = (
                    (vehicle.cargo_priority or "").lower() == "critical"
                    or (vehicle.cargo_type or "").lower() in ["medical", "perishables", "fuel", "relief supplies"]
                )
                severity = AnomalySeverity.HIGH if is_high_priority else AnomalySeverity.MEDIUM
                stop_mins = round(time_stopped / 60.0, 1)

                anomaly = VehicleAnomaly(
                    anomaly_id=f"stop-{vehicle.id}-{int(now.timestamp())}",
                    vehicle_id=vehicle.id,
                    vehicle_number=vehicle.vehicle_number,
                    anomaly_type=AnomalyType.PROLONGED_STOP,
                    severity=severity,
                    confidence=0.85,
                    description=(
                        f"Prolonged stationary stop ({stop_mins} min) while in transit detected "
                        f"for vehicle {vehicle.vehicle_number}."
                    ),
                    telemetry=TelemetrySnapshot(
                        latitude=new_lat,
                        longitude=new_lon,
                        observed_value=stop_mins,
                        threshold_value=THRESHOLD_PROLONGED_STOP_SECONDS / 60.0,
                    ),
                    timestamp=now,
                )
                return cls._dispatch_alert(anomaly, db, vehicle, COOLDOWN_PROLONGED_STOP_MIN)

        # -------------------------------------------------------------
        # 4. ROUTE DEVIATION CHECK
        # -------------------------------------------------------------
        if vehicle.current_trip_id:
            trip = db.query(Trip).filter(Trip.id == vehicle.current_trip_id).first()
            if trip and trip.current_route_geometry:
                min_route_dist = calculate_min_route_distance_km(new_lat, new_lon, trip.current_route_geometry)
                if min_route_dist is not None and min_route_dist > THRESHOLD_ROUTE_DEVIATION_KM:
                    is_critical = (
                        (vehicle.cargo_priority or "").lower() == "critical"
                        or (trip.priority or "").lower() == "critical"
                    )
                    severity = AnomalySeverity.CRITICAL if is_critical else AnomalySeverity.HIGH

                    anomaly = VehicleAnomaly(
                        anomaly_id=f"dev-{vehicle.id}-{int(now.timestamp())}",
                        vehicle_id=vehicle.id,
                        vehicle_number=vehicle.vehicle_number,
                        anomaly_type=AnomalyType.ROUTE_DEVIATION,
                        severity=severity,
                        confidence=0.90,
                        description=(
                            f"Vehicle {vehicle.vehicle_number} deviated {min_route_dist} km from assigned route corridor "
                            f"(threshold: {THRESHOLD_ROUTE_DEVIATION_KM} km)."
                        ),
                        telemetry=TelemetrySnapshot(
                            latitude=new_lat,
                            longitude=new_lon,
                            observed_value=min_route_dist,
                            threshold_value=THRESHOLD_ROUTE_DEVIATION_KM,
                        ),
                        timestamp=now,
                    )
                    return cls._dispatch_alert(anomaly, db, vehicle, COOLDOWN_ROUTE_DEVIATION_MIN)

        return None

    @classmethod
    def _dispatch_alert(
        cls,
        anomaly: VehicleAnomaly,
        db: Session,
        vehicle: Vehicle,
        cooldown_minutes: int,
    ) -> VehicleAnomaly:
        """Create a persistent operational alert with deduplication and link its ID."""
        try:
            alert = alert_service.create_alert(
                db=db,
                title=f"Vehicle Anomaly: {anomaly.anomaly_type.value} ({vehicle.vehicle_number})",
                description=anomaly.description,
                severity=anomaly.severity.value,
                alert_type="vehicle",
                location=f"Vehicle #{vehicle.id} ({round(anomaly.telemetry.latitude, 4)}, {round(anomaly.telemetry.longitude, 4)})",
                latitude=anomaly.telemetry.latitude,
                longitude=anomaly.telemetry.longitude,
                source_entity="vehicle",
                source_entity_id=vehicle.id,
                dedup_key=f"anomaly:{anomaly.anomaly_type.value.lower()}:vehicle:{vehicle.id}",
                suppress_window_minutes=cooldown_minutes,
            )
            if alert:
                anomaly.alert_id = alert.id
        except Exception as err:
            logger.warning("Could not persist alert for anomaly %s: %s", anomaly.anomaly_id, err)

        return anomaly
