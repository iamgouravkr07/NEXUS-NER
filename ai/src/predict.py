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
# FINAL MODEL FEATURES
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
# LOAD MODEL
# ============================================================

with open(MODEL_FILE, "rb") as file:
    model = pickle.load(file)


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_risk(data: dict) -> dict:
    """
    Predict landslide risk for a location.

    Parameters
    ----------
    data : dict
        Dictionary containing the 11 required model features.

    Returns
    -------
    dict
        Prediction, probabilities and risk level.
    """

    # Create input DataFrame
    X = pd.DataFrame([data])

    # Ensure required features exist
    missing_features = [
        feature
        for feature in FEATURES
        if feature not in X.columns
    ]

    if missing_features:
        raise ValueError(
            f"Missing required features: {missing_features}"
        )

    # Keep only model features in correct order
    X = X[FEATURES]

    # Model prediction
    prediction = int(
        model.predict(X)[0]
    )

    # Prediction probabilities
    probabilities = model.predict_proba(X)[0]

    no_landslide_probability = float(
        probabilities[0]
    )

    landslide_probability = float(
        probabilities[1]
    )

    # Risk classification
    if landslide_probability >= 0.70:
        risk_level = "HIGH"

    elif landslide_probability >= 0.40:
        risk_level = "MEDIUM"

    else:
        risk_level = "LOW"

    return {
        "prediction": prediction,
        "landslide_probability": landslide_probability,
        "no_landslide_probability": no_landslide_probability,
        "risk_level": risk_level,
    }


# ============================================================
# LOCAL TEST
# ============================================================

if __name__ == "__main__":

    sample = {
        "latitude": 25.2,
        "longitude": 93.05,
        "elevation": 900,
        "slope": 28,
        "temperature_avg": 23.2,
        "temperature_max": 32.1,
        "temperature_min": 10.9,
        "rainfall_avg": 4.7,
        "rainfall_max": 151.3,
        "humidity_avg": 79.6,
        "landslide_density": 0.165,
    }

    result = predict_risk(sample)

    print("=" * 60)
    print("LANDSLIDE RISK PREDICTION")
    print("=" * 60)

    print(f"\nPrediction: {result['prediction']}")

    print(
        f"Landslide probability: "
        f"{result['landslide_probability']:.2%}"
    )

    print(
        f"No-landslide probability: "
        f"{result['no_landslide_probability']:.2%}"
    )

    print(
        f"Risk level: "
        f"{result['risk_level']}"
    )

    print("=" * 60)

