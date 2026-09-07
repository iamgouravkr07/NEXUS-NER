from pathlib import Path
import pickle
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_FILE = (
    BASE_DIR
    / "models"
    / "final_landslide_risk_model.pkl"
)


# ============================================================
# LOAD MODEL
# ============================================================

with open(MODEL_FILE, "rb") as file:
    model = pickle.load(file)


# ============================================================
# REQUIRED ML FEATURES
# ============================================================

FEATURES = [
    "latitude",
    "longitude",
    "elevation",
    "slope",
    "temperature_avg",
    "temperature_max",
    "temperature_min",
    "rainfall_avg",
    "rainfall_max",
    "humidity_avg",
    "landslide_density",
]


# ============================================================
# INCIDENT RISK ADJUSTMENTS
# ============================================================

INCIDENT_ADJUSTMENTS = {
    "LANDSLIDE": {
        "LOW": 0.05,
        "MEDIUM": 0.10,
        "HIGH": 0.15,
    },

    "FLOOD": {
        "LOW": 0.03,
        "MEDIUM": 0.07,
        "HIGH": 0.12,
    },

    "ROAD_DAMAGE": {
        "LOW": 0.02,
        "MEDIUM": 0.04,
        "HIGH": 0.07,
    },

    "ROAD_BLOCKAGE": {
        "LOW": 0.02,
        "MEDIUM": 0.04,
        "HIGH": 0.06,
    },

    "ACCIDENT": {
        "LOW": 0.02,
        "MEDIUM": 0.04,
        "HIGH": 0.06,
    },

    "FIRE": {
        "LOW": 0.02,
        "MEDIUM": 0.04,
        "HIGH": 0.07,
    },
}


# ============================================================
# RISK LEVEL
# ============================================================

def get_risk_level(probability: float) -> str:

    if probability >= 0.70:
        return "HIGH"

    if probability >= 0.40:
        return "MEDIUM"

    return "LOW"


# ============================================================
# RISK PREDICTION
# ============================================================

def predict_risk(
    road_segment: dict,
    conditions: dict,
    incident: dict | None = None,
) -> dict:
    """
    Predict landslide risk.

    ML model:
        Environmental + historical features
        ↓
        Random Forest
        ↓
        Base risk

    Optional incident:
        Incident AI
        ↓
        Incident adjustment
        ↓
        Final risk
    """

    # --------------------------------------------------------
    # Combine input data
    # --------------------------------------------------------

    data = {}

    data.update(road_segment)
    data.update(conditions)

    # --------------------------------------------------------
    # Create DataFrame
    # --------------------------------------------------------

    X = pd.DataFrame([data])

    # Ensure exact feature order
    X = X[FEATURES]

    # --------------------------------------------------------
    # ML prediction
    # --------------------------------------------------------

    probabilities = model.predict_proba(X)[0]

    probability_not_landslide = float(
        probabilities[0]
    )

    base_risk = float(
        probabilities[1]
    )

    # --------------------------------------------------------
    # Incident adjustment
    # --------------------------------------------------------

    incident_adjustment = 0.0

    if incident:

        incident_type = incident.get(
            "incident_type",
            "UNKNOWN",
        )

        severity = incident.get(
            "severity",
            "LOW",
        )

        incident_confidence = float(
            incident.get(
                "confidence",
                1.0,
            )
        )

        adjustment = INCIDENT_ADJUSTMENTS.get(
            incident_type,
            {},
        ).get(
            severity,
            0.0,
        )

        # Scale adjustment using incident confidence.
        incident_adjustment = (
            adjustment * incident_confidence
        )

    # --------------------------------------------------------
    # Final risk
    # --------------------------------------------------------

    final_risk = min(
        base_risk + incident_adjustment,
        1.0,
    )

    risk_level = get_risk_level(
        final_risk
    )

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "base_risk": round(
            base_risk,
            4,
        ),

        "incident_adjustment": round(
            incident_adjustment,
            4,
        ),

        "risk": round(
            final_risk,
            4,
        ),

        "level": risk_level,

        "confidence": round(
            base_risk,
            4,
        ),

        "no_landslide_probability": round(
            probability_not_landslide,
            4,
        ),
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    road_segment = {
        "latitude": 25.2,
        "longitude": 93.05,
        "elevation": 900,
        "slope": 28,
    }

    conditions = {
        "temperature_avg": 23.2,
        "temperature_max": 32.1,
        "temperature_min": 10.9,
        "rainfall_avg": 4.7,
        "rainfall_max": 151.3,
        "humidity_avg": 79.6,
        "landslide_density": 0.165,
    }

    incident = {
        "incident_type": "LANDSLIDE",
        "severity": "HIGH",
        "confidence": 0.70,
    }

    result = predict_risk(
        road_segment,
        conditions,
        incident,
    )

    print("=" * 60)
    print("INTEGRATED LANDSLIDE RISK ENGINE")
    print("=" * 60)

    print("\nRoad segment:")
    print(road_segment)

    print("\nEnvironmental conditions:")
    print(conditions)

    print("\nIncident:")
    print(incident)

    print("\nPrediction:")
    print(result)

    print("=" * 60)