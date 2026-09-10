import json
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import SessionLocal
from app.models.alert import Alert
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.anomaly import AnomalySeverity, AnomalyType
from app.services.vehicle_anomaly_service import (
    THRESHOLD_ROUTE_DEVIATION_KM,
    THRESHOLD_SPEED_ABNORMAL_KMH,
    VehicleAnomalyService,
    haversine_km,
)


class TestVehicleAnomaly(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        # Clean up synthetic test records
        self.db.query(Alert).filter(Alert.dedup_key.like("anomaly:%:vehicle:9999%")).delete(synchronize_session=False)
        self.db.query(Trip).filter(Trip.origin == "TEST_ANOMALY_ORIGIN").delete(synchronize_session=False)
        self.db.query(Vehicle).filter(Vehicle.id.in_([99991, 99992, 99993, 99994, 99995])).delete(synchronize_session=False)
        self.db.commit()

    def tearDown(self):
        self.db.query(Alert).filter(Alert.dedup_key.like("anomaly:%:vehicle:9999%")).delete(synchronize_session=False)
        self.db.query(Trip).filter(Trip.origin == "TEST_ANOMALY_ORIGIN").delete(synchronize_session=False)
        self.db.query(Vehicle).filter(Vehicle.id.in_([99991, 99992, 99993, 99994, 99995])).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def test_ad_1_normal_movement_no_anomaly(self):
        """AD-1: Normal movement along route corridor produces zero anomalies."""
        now = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        vehicle = Vehicle(
            id=99991,
            vehicle_number="TEST-NORMAL-1",
            vehicle_type="Truck",
            cargo_type="General",
            status="in_transit",
            latitude=26.1445,
            longitude=91.7362,
            last_gps_timestamp=now - timedelta(seconds=60),
        )
        self.db.add(vehicle)
        self.db.commit()

        # Moves 0.5 km in 60s (~30 km/h)
        new_lat = 26.1480
        new_lon = 91.7390
        anomaly = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=new_lat,
            new_lon=new_lon,
            new_timestamp=now,
            new_status="in_transit",
            db=self.db,
        )
        self.assertIsNone(anomaly, "Expected no anomaly for normal movement")

    def test_ad_2_route_deviation_detected(self):
        """AD-2: Route deviation > 5.0 km flags ROUTE_DEVIATION anomaly and creates alert."""
        now = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        route_geom = {
            "type": "LineString",
            "coordinates": [
                [91.7362, 26.1445],  # Guwahati [lon, lat]
                [92.7926, 26.6528],  # Tezpur
            ],
        }
        trip = Trip(
            vehicle_id=99992,
            origin="TEST_ANOMALY_ORIGIN",
            destination="TEST_ANOMALY_DEST",
            current_route_geometry=json.dumps(route_geom),
            status="active",
            cargo_type="Medical",
            priority="critical",
        )
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)

        vehicle = Vehicle(
            id=99992,
            vehicle_number="TEST-DEV-2",
            vehicle_type="Truck",
            cargo_type="Medical",
            cargo_priority="critical",
            status="in_transit",
            latitude=26.1445,
            longitude=91.7362,
            current_trip_id=trip.id,
            last_gps_timestamp=now - timedelta(minutes=10),
        )
        self.db.add(vehicle)
        self.db.commit()

        # 6.6 km South of Guwahati, off the corridor (threshold is 5.0 km)
        # 6.6 km in 10 minutes = ~40 km/h (realistic normal driving speed)
        off_route_lat = 26.0850
        off_route_lon = 91.7362

        anomaly = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=off_route_lat,
            new_lon=off_route_lon,
            new_timestamp=now,
            new_status="in_transit",
            db=self.db,
        )

        self.assertIsNotNone(anomaly)
        self.assertEqual(anomaly.anomaly_type, AnomalyType.ROUTE_DEVIATION)
        self.assertEqual(anomaly.severity, AnomalySeverity.CRITICAL)
        self.assertGreater(anomaly.telemetry.observed_value, THRESHOLD_ROUTE_DEVIATION_KM)
        self.assertIsNotNone(anomaly.alert_id)

        # Verify alert exists in database
        saved_alert = self.db.query(Alert).filter(Alert.id == anomaly.alert_id).first()
        self.assertIsNotNone(saved_alert)
        self.assertEqual(saved_alert.severity, "critical")
        self.assertEqual(saved_alert.alert_type, "vehicle")

    def test_ad_3_prolonged_stop_detected(self):
        """AD-3: Vehicle halted in transit for >= 15 min flags PROLONGED_STOP."""
        base_time = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        vehicle = Vehicle(
            id=99993,
            vehicle_number="TEST-STOP-3",
            vehicle_type="Truck",
            cargo_type="Fuel",
            cargo_priority="high",
            status="in_transit",
            latitude=26.3000,
            longitude=91.8000,
            last_gps_timestamp=base_time,
        )
        self.db.add(vehicle)
        self.db.commit()

        # Update 18 minutes later at practically the same point (10 meters displacement)
        update_time = base_time + timedelta(minutes=18)
        anomaly = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=26.30005,
            new_lon=91.80005,
            new_timestamp=update_time,
            new_status="in_transit",
            db=self.db,
        )

        self.assertIsNotNone(anomaly)
        self.assertEqual(anomaly.anomaly_type, AnomalyType.PROLONGED_STOP)
        self.assertEqual(anomaly.severity, AnomalySeverity.HIGH)
        self.assertGreaterEqual(anomaly.telemetry.observed_value, 15.0)

    def test_ad_4_gps_data_gap_detected(self):
        """AD-4: Telemetry silence > 20 min flags GPS_DATA_GAP."""
        base_time = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        vehicle = Vehicle(
            id=99994,
            vehicle_number="TEST-GAP-4",
            vehicle_type="Truck",
            cargo_type="General",
            status="in_transit",
            latitude=26.2000,
            longitude=91.7500,
            last_gps_timestamp=base_time,
        )
        self.db.add(vehicle)
        self.db.commit()

        # 25 minutes gap
        update_time = base_time + timedelta(minutes=25)
        anomaly = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=26.2500,
            new_lon=91.7800,
            new_timestamp=update_time,
            new_status="in_transit",
            db=self.db,
        )

        self.assertIsNotNone(anomaly)
        self.assertEqual(anomaly.anomaly_type, AnomalyType.GPS_DATA_GAP)
        self.assertEqual(anomaly.severity, AnomalySeverity.MEDIUM)
        self.assertGreaterEqual(anomaly.telemetry.observed_value, 20.0)

    def test_ad_5_abnormal_speed_and_glitch(self):
        """AD-5: Speed > 90 km/h flags ABNORMAL_SPEED; > 160 km/h flags SENSOR_GLITCH."""
        base_time = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        vehicle = Vehicle(
            id=99995,
            vehicle_number="TEST-SPEED-5",
            vehicle_type="Truck",
            cargo_type="General",
            status="in_transit",
            latitude=26.0000,
            longitude=91.5000,
            last_gps_timestamp=base_time,
        )
        self.db.add(vehicle)
        self.db.commit()

        # 1. Test speeding: 2 km in 60 seconds = 120 km/h (> 90 km/h, <= 160 km/h)
        # 2 km North in latitude is ~ 2.0 / 111.0 = ~0.018 degrees
        t1 = base_time + timedelta(seconds=60)
        speed_anomaly = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=26.0180,
            new_lon=91.5000,
            new_timestamp=t1,
            new_status="in_transit",
            db=self.db,
        )
        self.assertIsNotNone(speed_anomaly)
        self.assertEqual(speed_anomaly.anomaly_type, AnomalyType.ABNORMAL_SPEED)
        self.assertEqual(speed_anomaly.severity, AnomalySeverity.HIGH)
        self.assertGreater(speed_anomaly.telemetry.speed_kmh, THRESHOLD_SPEED_ABNORMAL_KMH)
        self.assertLessEqual(speed_anomaly.telemetry.speed_kmh, 160.0)

        # 2. Test sensor glitch: 10 km jump in 10 seconds = 3600 km/h (> 160 km/h)
        t2 = t1 + timedelta(seconds=10)
        glitch_anomaly = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=26.1080,
            new_lon=91.5000,
            new_timestamp=t2,
            new_status="in_transit",
            db=self.db,
        )
        self.assertIsNotNone(glitch_anomaly)
        self.assertEqual(glitch_anomaly.anomaly_type, AnomalyType.SENSOR_GLITCH)
        self.assertEqual(glitch_anomaly.severity, AnomalySeverity.LOW)
        self.assertIsNone(glitch_anomaly.alert_id, "Sensor glitch should be diagnostic only, not create operational alert")

    def test_ad_6_deduplication_cooldown(self):
        """AD-6: Consecutive anomalies within cooldown window suppress duplicate alerts."""
        now = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        vehicle = Vehicle(
            id=99991,
            vehicle_number="TEST-DEDUP-1",
            vehicle_type="Truck",
            cargo_type="General",
            status="in_transit",
            latitude=26.0000,
            longitude=91.0000,
            last_gps_timestamp=now - timedelta(minutes=25),
        )
        self.db.add(vehicle)
        self.db.commit()

        # First gap alert
        anomaly1 = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=26.0500,
            new_lon=91.0500,
            new_timestamp=now,
            new_status="in_transit",
            db=self.db,
        )
        self.assertIsNotNone(anomaly1)
        alert1_id = anomaly1.alert_id
        self.assertIsNotNone(alert1_id)

        # Immediate follow-up (still in 60 min cooldown)
        anomaly2 = VehicleAnomalyService.evaluate_telemetry(
            vehicle=vehicle,
            new_lat=26.0510,
            new_lon=91.0510,
            new_timestamp=now + timedelta(minutes=5),
            new_status="in_transit",
            db=self.db,
        )
        # Should link to existing alert rather than generating a new one
        self.assertIsNotNone(anomaly2)
        self.assertEqual(anomaly2.alert_id, alert1_id, "Expected deduplication to return existing alert ID")


if __name__ == "__main__":
    unittest.main()
