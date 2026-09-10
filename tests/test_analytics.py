import sys
import unittest
from pathlib import Path

# Ensure backend package is in python path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app


class AnalyticsEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_get_analytics_summary_success(self):
        """Test that GET /analytics/summary returns 200 and has all required top-level keys."""
        res = self.client.get("/analytics/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        required_keys = [
            "kpis",
            "incident_trend",
            "delivery_trend",
            "regional_data",
            "risk_data",
            "operational_insights",
            "trips_summary",
            "vehicles_summary",
            "incidents_summary",
            "roads_summary",
            "alerts_summary",
        ]
        for key in required_keys:
            self.assertIn(key, data, f"Missing required key: {key}")

    def test_02_kpis_structure(self):
        """Verify KPI cards list contains 4 valid metric cards with required fields."""
        res = self.client.get("/analytics/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        kpis = data["kpis"]

        self.assertEqual(len(kpis), 4)
        expected_titles = {"Routes Completed", "Average ETA", "Active Vehicles", "Road Accessibility"}
        actual_titles = {card["title"] for card in kpis}
        self.assertEqual(expected_titles, actual_titles)

        for card in kpis:
            self.assertIn("value", card)
            self.assertIn("change", card)
            self.assertIn("trend", card)
            self.assertIn(card["trend"], ("up", "down"))
            self.assertIn("description", card)
            self.assertIn("icon", card)
            self.assertIn("iconClass", card)

    def test_03_time_window_parameter(self):
        """Verify days parameter validation."""
        # Valid 30 days
        res = self.client.get("/analytics/summary?days=30")
        self.assertEqual(res.status_code, 200)

        # Invalid: days=0 (below minimum of 1)
        res_invalid = self.client.get("/analytics/summary?days=0")
        self.assertEqual(res_invalid.status_code, 422)

        # Invalid: days=100 (above maximum of 90)
        res_invalid2 = self.client.get("/analytics/summary?days=100")
        self.assertEqual(res_invalid2.status_code, 422)

    def test_04_operational_insights(self):
        """Verify operational insights percentages are bounded between 0 and 100."""
        res = self.client.get("/analytics/summary")
        self.assertEqual(res.status_code, 200)
        insights = res.json()["operational_insights"]

        for metric in ("fleet_utilization", "route_safety", "incident_resolution"):
            self.assertIn(metric, insights)
            val = insights[metric]
            self.assertIsInstance(val, int)
            self.assertGreaterEqual(val, 0)
            self.assertLessEqual(val, 100)

    def test_05_risk_distribution_categories(self):
        """Verify risk data covers Critical, High, Medium, Low."""
        res = self.client.get("/analytics/summary")
        self.assertEqual(res.status_code, 200)
        risk_data = res.json()["risk_data"]

        names = [item["name"] for item in risk_data]
        self.assertEqual(names, ["Critical", "High", "Medium", "Low"])

        for item in risk_data:
            self.assertGreaterEqual(item["value"], 0)
            self.assertGreaterEqual(item["percentage"], 0.0)
            self.assertIn("color_class", item)


if __name__ == "__main__":
    unittest.main()
