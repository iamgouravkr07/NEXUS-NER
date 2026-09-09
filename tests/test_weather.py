import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone

# Ensure backend package is in python path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.weather import WeatherRecord
from app.models.alert import Alert
from app.services.weather_service import (
    MockWeatherProvider,
    set_weather_provider,
    get_weather_provider,
    evaluate_deterministic_weather_risk,
    check_and_generate_weather_alert,
    get_weather_for_route,
    OpenMeteoProvider,
)
from app.services.risk import calculate_route_risk, calculate_route_risk_with_weather
from app.schemas.weather import WeatherCurrentResponse, WeatherForecastItem


class WeatherSubsystemTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Enforce MockWeatherProvider for deterministic, offline testing
        cls.mock_provider = MockWeatherProvider()
        set_weather_provider(cls.mock_provider)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def setUp(self):
        # Reset any overrides or simulated failures before each test
        self.mock_provider.clear_overrides()

    # -----------------------------------------------------------------------
    # 1. Valid Current Weather Request & Normalized Schemas
    # -----------------------------------------------------------------------
    def test_01_valid_current_weather(self):
        res = self.client.get("/weather/current?latitude=26.15&longitude=91.75")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["latitude"], 26.15)
        self.assertEqual(data["longitude"], 91.75)
        self.assertIn("temperature_c", data)
        self.assertIn("precipitation_mm", data)
        self.assertIn("rainfall_mm", data)
        self.assertEqual(data["precipitation_mm"], data["rainfall_mm"])
        self.assertIn("wind_speed_kmh", data)
        self.assertIn("visibility_km", data)
        self.assertIn("weather_condition", data)
        self.assertIn("observed_at", data)
        self.assertIn(data["source"], ["mock", "open-meteo"])


        # Verify deterministic risk signal metadata
        risk_sig = data.get("risk_signal")
        self.assertIsNotNone(risk_sig)
        self.assertEqual(risk_sig["signal_type"], "DETERMINISTIC_WEATHER_RISK")
        self.assertIn(risk_sig["risk_level"], ["Low", "Moderate", "High", "Critical"])
        self.assertGreaterEqual(risk_sig["risk_score"], 0.0)
        self.assertLessEqual(risk_sig["risk_score"], 100.0)

    # -----------------------------------------------------------------------
    # 2. Invalid Latitude Validation Rejection
    # -----------------------------------------------------------------------
    def test_02_invalid_latitude_rejection(self):
        # Latitude < 20.0 (below operational NER bounds)
        res_low = self.client.get("/weather/current?latitude=19.99&longitude=91.75")
        self.assertEqual(res_low.status_code, 422)

        # Latitude > 30.0 (above operational NER bounds)
        res_high = self.client.get("/weather/current?latitude=30.01&longitude=91.75")
        self.assertEqual(res_high.status_code, 422)

    # -----------------------------------------------------------------------
    # 3. Invalid Longitude Validation Rejection
    # -----------------------------------------------------------------------
    def test_03_invalid_longitude_rejection(self):
        # Longitude < 88.0 (west of operational NER bounds)
        res_west = self.client.get("/weather/current?latitude=26.0&longitude=87.99")
        self.assertEqual(res_west.status_code, 422)

        # Longitude > 98.0 (east of operational NER bounds)
        res_east = self.client.get("/weather/current?latitude=26.0&longitude=98.01")
        self.assertEqual(res_east.status_code, 422)

    # -----------------------------------------------------------------------
    # 4. NER Boundary Extremes Acceptance
    # -----------------------------------------------------------------------
    def test_04_ner_boundary_extremes_accepted(self):
        # Exact south-west boundary (20.0, 88.0)
        res_sw = self.client.get("/weather/current?latitude=20.0&longitude=88.0")
        self.assertEqual(res_sw.status_code, 200)

        # Exact north-east boundary (30.0, 98.0)
        res_ne = self.client.get("/weather/current?latitude=30.0&longitude=98.0")
        self.assertEqual(res_ne.status_code, 200)

    # -----------------------------------------------------------------------
    # 5. Outside NER Coordinates Cleanly Rejected
    # -----------------------------------------------------------------------
    def test_05_outside_ner_cities_rejected(self):
        # New Delhi (28.61, 77.20) - longitude 77.20 is outside NER bounds
        res_delhi = self.client.get("/weather/current?latitude=28.61&longitude=77.20")
        self.assertEqual(res_delhi.status_code, 422)

        # Bengaluru (12.97, 77.59) - latitude 12.97 is outside NER bounds
        res_blr = self.client.get("/weather/current?latitude=12.97&longitude=77.59")
        self.assertEqual(res_blr.status_code, 422)

    # -----------------------------------------------------------------------
    # 6. Provider Normalization & Interpretation
    # -----------------------------------------------------------------------
    def test_06_provider_normalization(self):
        open_meteo = OpenMeteoProvider()
        self.assertEqual(open_meteo._interpret_wmo(0), "Clear sky")
        self.assertEqual(open_meteo._interpret_wmo(45), "Fog")
        self.assertEqual(open_meteo._interpret_wmo(65), "Heavy rain")
        self.assertEqual(open_meteo._interpret_wmo(95), "Thunderstorm")
        self.assertEqual(open_meteo._interpret_wmo(None), "Unknown")

        # Set specific mock observation values
        self.mock_provider.set_current_override(
            temperature_c=25.2,
            feels_like_c=27.4,
            humidity_percent=82.0,
            rainfall_mm=16.5,
            precipitation_probability=90.0,
            wind_speed_kmh=38.0,
            wind_gust_kmh=52.0,
            pressure_hpa=1008.0,
            visibility_km=3.2,
            weather_condition="Heavy rain",
        )
        res = self.client.get("/weather/current?latitude=25.57&longitude=91.89")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["temperature_c"], 25.2)
        self.assertEqual(data["rainfall_mm"], 16.5)
        self.assertEqual(data["wind_speed_kmh"], 38.0)
        self.assertEqual(data["weather_condition"], "Heavy rain")

    # -----------------------------------------------------------------------
    # 7. Provider Failure Graceful Handling (No 500 crashes / No secret leaks)
    # -----------------------------------------------------------------------
    def test_07_provider_failure_handling(self):
        # Case A: Coordinate with NO cached record -> must return 503
        self.mock_provider.inject_failure(True)
        res_no_cache = self.client.get("/weather/current?latitude=29.85&longitude=96.85")
        self.assertEqual(res_no_cache.status_code, 503)
        self.assertIn("temporarily unavailable", res_no_cache.json()["detail"])
        self.mock_provider.inject_failure(False)

        # Case B: Coordinate WITH cached record -> provider failure falls back to cached record
        cached_lat, cached_lon = 26.55, 92.55
        res_seed = self.client.get(f"/weather/current?latitude={cached_lat}&longitude={cached_lon}")
        self.assertEqual(res_seed.status_code, 200)

        # Now inject failure: must return cached response instead of failing
        self.mock_provider.inject_failure(True)
        res_fallback = self.client.get(f"/weather/current?latitude={cached_lat}&longitude={cached_lon}")
        self.assertEqual(res_fallback.status_code, 200)
        self.assertTrue(res_fallback.json()["cached"])
        self.mock_provider.inject_failure(False)


    # -----------------------------------------------------------------------
    # 8. Missing Configuration / Fallback Handling
    # -----------------------------------------------------------------------
    def test_08_missing_configuration_handling(self):
        provider = get_weather_provider()
        self.assertIsNotNone(provider)
        # Verify provider object handles query without crashing
        obs = provider.get_current_weather(26.15, 91.75)
        self.assertIsInstance(obs, WeatherCurrentResponse)

    # -----------------------------------------------------------------------
    # 9. Database Persistence of Weather Observations
    # -----------------------------------------------------------------------
    def test_09_database_persistence(self):
        test_lat, test_lon = 27.45, 94.85
        res = self.client.get(f"/weather/current?latitude={test_lat}&longitude={test_lon}")
        self.assertEqual(res.status_code, 200)

        # Verify row persisted in weather_records
        record = (
            self.db.query(WeatherRecord)
            .filter(
                WeatherRecord.latitude == test_lat,
                WeatherRecord.longitude == test_lon,
            )
            .order_by(WeatherRecord.id.desc())
            .first()
        )
        self.assertIsNotNone(record)
        self.assertEqual(record.latitude, test_lat)
        self.assertEqual(record.longitude, test_lon)
        self.assertEqual(record.source, "mock")
        self.assertFalse(record.is_forecast)

    # -----------------------------------------------------------------------
    # 10. Database Caching (Second Call Hits Cache)
    # -----------------------------------------------------------------------
    def test_10_database_caching(self):
        test_lat, test_lon = 26.72, 93.35
        # First call: populates cache
        res1 = self.client.get(f"/weather/current?latitude={test_lat}&longitude={test_lon}")
        self.assertEqual(res1.status_code, 200)

        # Second call immediately within TTL: must be served from cache
        res2 = self.client.get(f"/weather/current?latitude={test_lat}&longitude={test_lon}")
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json()["cached"])

    # -----------------------------------------------------------------------
    # 11. Deterministic Weather Risk Evaluation (Strictly Deterministic, NOT ML)
    # -----------------------------------------------------------------------
    def test_11_deterministic_weather_risk_signals(self):
        now = datetime.now(timezone.utc)

        # Low risk scenario
        low_obs = WeatherCurrentResponse(
            latitude=26.0, longitude=91.0, rainfall_mm=0.0,
            wind_speed_kmh=10.0, visibility_km=10.0, weather_condition="Clear sky",
            observed_at=now, source="mock",
        )
        low_signal = evaluate_deterministic_weather_risk(low_obs)
        self.assertEqual(low_signal.risk_level, "Low")
        self.assertEqual(low_signal.risk_score, 0.0)
        self.assertEqual(low_signal.signal_type, "DETERMINISTIC_WEATHER_RISK")

        # Moderate risk scenario (moderate rain)
        mod_obs = WeatherCurrentResponse(
            latitude=26.0, longitude=91.0, rainfall_mm=8.0,
            wind_speed_kmh=15.0, visibility_km=7.0, weather_condition="Moderate rain",
            observed_at=now, source="mock",
        )
        mod_signal = evaluate_deterministic_weather_risk(mod_obs)
        self.assertEqual(mod_signal.risk_level, "Moderate")
        self.assertGreaterEqual(mod_signal.risk_score, 10.0)

        # High risk scenario (heavy rain, fog)
        high_obs = WeatherCurrentResponse(
            latitude=26.0, longitude=91.0, rainfall_mm=25.0,
            wind_speed_kmh=48.0, visibility_km=1.2, weather_condition="Heavy rain",
            observed_at=now, source="mock",
        )
        high_signal = evaluate_deterministic_weather_risk(high_obs)
        self.assertIn(high_signal.risk_level, ["High", "Critical"])
        self.assertGreaterEqual(high_signal.risk_score, 50.0)
        self.assertTrue(any("Heavy rainfall" in f for f in high_signal.factors))

        # Critical risk scenario (extreme rain > 50mm, gale wind > 70km/h)
        crit_obs = WeatherCurrentResponse(
            latitude=26.0, longitude=91.0, rainfall_mm=65.0,
            wind_speed_kmh=75.0, visibility_km=0.5, weather_condition="Severe Thunderstorm",
            observed_at=now, source="mock",
        )
        crit_signal = evaluate_deterministic_weather_risk(crit_obs)
        self.assertEqual(crit_signal.risk_level, "Critical")
        self.assertGreaterEqual(crit_signal.risk_score, 80.0)
        self.assertTrue(any("flash flood" in w.lower() for w in crit_signal.warnings))

    # -----------------------------------------------------------------------
    # 12. Weather Alert Creation Reusing Alert Service
    # -----------------------------------------------------------------------
    def test_12_weather_alert_creation(self):
        now = datetime.now(timezone.utc)
        severe_obs = WeatherCurrentResponse(
            latitude=25.80,
            longitude=92.10,
            rainfall_mm=55.0,
            wind_speed_kmh=65.0,
            weather_condition="Thunderstorm with heavy rain",
            observed_at=now,
            source="mock",
        )
        severe_obs.risk_signal = evaluate_deterministic_weather_risk(severe_obs)

        alert = check_and_generate_weather_alert(
            self.db,
            severe_obs,
            location_name="NH-6 Jowai Mountain Corridor",
        )
        self.assertIsNotNone(alert)
        self.assertEqual(alert.alert_type, "weather")
        self.assertEqual(alert.severity, "critical")
        self.assertIn("Jowai", alert.location)
        self.assertTrue(alert.dedup_key.startswith("weather:25.8:92.1:extreme_weather"))

    # -----------------------------------------------------------------------
    # 13. Weather Alert Deduplication Suppression
    # -----------------------------------------------------------------------
    def test_13_weather_alert_deduplication(self):
        now = datetime.now(timezone.utc)
        alert_obs = WeatherCurrentResponse(
            latitude=27.20,
            longitude=93.60,
            rainfall_mm=22.0,
            wind_speed_kmh=35.0,
            weather_condition="Heavy rain",
            observed_at=now,
            source="mock",
        )
        alert_obs.risk_signal = evaluate_deterministic_weather_risk(alert_obs)

        alert1 = check_and_generate_weather_alert(self.db, alert_obs)
        self.assertIsNotNone(alert1)

        # Second evaluation with identical coordinate grid within suppression window
        alert2 = check_and_generate_weather_alert(self.db, alert_obs)
        self.assertIsNotNone(alert2)

        # Must return the SAME alert id, not a newly inserted duplicate
        self.assertEqual(alert1.id, alert2.id)

    # -----------------------------------------------------------------------
    # 14. Route Weather Sampling Across Corridors
    # -----------------------------------------------------------------------
    def test_14_route_weather_sampling(self):
        # Simulated GeoJSON route geometry (Guwahati -> Shillong -> Jowai)
        sample_geometry = {
            "type": "LineString",
            "coordinates": [
                [91.7362, 26.1445],  # Guwahati
                [91.8000, 25.9000],  # Midpoint 1
                [91.8933, 25.5788],  # Shillong
                [92.2000, 25.5000],  # Jowai
            ],
        }

        res = self.client.post(
            "/weather/route",
            json={"route_geometry": sample_geometry, "interval_km": 30.0},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertGreater(data["distance_km"], 0.0)
        self.assertGreaterEqual(data["sampled_points_count"], 2)
        self.assertIn("waypoints", data)
        self.assertIn("composite_risk_signal", data)
        self.assertEqual(data["composite_risk_signal"]["signal_type"], "DETERMINISTIC_WEATHER_RISK")

    # -----------------------------------------------------------------------
    # 15. Forecast API Endpoint
    # -----------------------------------------------------------------------
    def test_15_forecast_endpoint(self):
        res = self.client.get("/weather/forecast?latitude=26.15&longitude=91.75&hours=12")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["latitude"], 26.15)
        self.assertEqual(data["longitude"], 91.75)
        self.assertEqual(data["horizon_hours"], 12)
        self.assertEqual(len(data["forecast"]), 12)
        item0 = data["forecast"][0]
        self.assertIn("forecast_timestamp", item0)
        self.assertIn("hourly_precipitation_mm", item0)
        self.assertIn("precipitation_mm", item0)
        self.assertIn("precipitation_probability", item0)
        self.assertEqual(item0["hourly_precipitation_mm"], item0["precipitation_mm"])

    # -----------------------------------------------------------------------
    # 16. Existing Risk Service Backward Compatibility
    # -----------------------------------------------------------------------
    def test_16_risk_service_backward_compatibility(self):
        test_geom = {
            "type": "LineString",
            "coordinates": [
                [91.7362, 26.1445],
                [93.6053, 27.0844],
            ],
        }

        # Default call (include_weather=False): exact existing schema without regression
        risk_base = calculate_route_risk(self.db, test_geom)
        self.assertIn("risk_score", risk_base)
        self.assertIn("risk_level", risk_base)
        self.assertIn("reroute_required", risk_base)
        self.assertIn("warnings", risk_base)
        self.assertIn("blocked_road_ids", risk_base)
        self.assertNotIn("weather_risk_signal", risk_base)

        # Extended call (include_weather=True)
        risk_weather = calculate_route_risk_with_weather(self.db, test_geom)
        self.assertIn("weather_risk_signal", risk_weather)
        self.assertIsNotNone(risk_weather["weather_risk_signal"])

    # -----------------------------------------------------------------------
    # 17. Precipitation Semantics & Configurable Risk Thresholds
    # -----------------------------------------------------------------------
    def test_17_precipitation_semantics_and_configurable_thresholds(self):
        from app import config
        now = datetime.now(timezone.utc)

        # 1. Verification of schema field synchronization
        resp_from_precip = WeatherCurrentResponse(
            latitude=26.0, longitude=91.0, precipitation_mm=12.5,
            observed_at=now, source="mock"
        )
        self.assertEqual(resp_from_precip.precipitation_mm, 12.5)
        self.assertEqual(resp_from_precip.rainfall_mm, 12.5)

        resp_from_rain = WeatherCurrentResponse(
            latitude=26.0, longitude=91.0, rainfall_mm=8.2,
            observed_at=now, source="mock"
        )
        self.assertEqual(resp_from_rain.precipitation_mm, 8.2)
        self.assertEqual(resp_from_rain.rainfall_mm, 8.2)

        # 2. Hourly forecast precipitation item
        fc_item = WeatherForecastItem(
            forecast_timestamp=now,
            hourly_precipitation_mm=4.0,
            precipitation_probability=65.0,
        )
        self.assertEqual(fc_item.hourly_precipitation_mm, 4.0)
        self.assertEqual(fc_item.precipitation_mm, 4.0)
        self.assertEqual(fc_item.rainfall_mm, 4.0)
        self.assertEqual(fc_item.precipitation_probability, 65.0)

        # 3. Configurable threshold overrides
        orig_heavy = config.WEATHER_RISK_THRESHOLDS["precipitation_mm"]["heavy"]
        try:
            # Temporarily lower heavy rain threshold from 15.0 to 10.0 mm
            config.WEATHER_RISK_THRESHOLDS["precipitation_mm"]["heavy"] = 10.0
            test_obs = WeatherCurrentResponse(
                latitude=26.0, longitude=91.0, precipitation_mm=11.0,
                observed_at=now, source="mock"
            )
            sig = evaluate_deterministic_weather_risk(test_obs)
            self.assertEqual(sig.signal_type, "DETERMINISTIC_WEATHER_RISK")
            self.assertGreaterEqual(sig.risk_score, 30.0)
            self.assertTrue(any("Heavy rainfall" in f for f in sig.factors))
            self.assertTrue(any("preceding 1h sum" in f for f in sig.factors))
        finally:
            config.WEATHER_RISK_THRESHOLDS["precipitation_mm"]["heavy"] = orig_heavy


if __name__ == "__main__":
    unittest.main()
