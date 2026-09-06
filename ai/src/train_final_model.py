from pathlib import Path
import pickle

import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    BASE_DIR
    / "data"
    / "processed"
    / "ml_samples_risk.csv"
)

MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_FILE = (
    MODEL_DIR
    / "final_landslide_risk_model.pkl"
)


# ============================================================
# FINAL FEATURES
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

TARGET = "target"


# ============================================================
# START
# ============================================================

print("=" * 70)
print("FINAL LANDSLIDE RISK MODEL TRAINING")
print("=" * 70)

print(f"\nInput: {INPUT_FILE}")


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(INPUT_FILE)

print(f"\nDataset shape: {df.shape}")

X = df[FEATURES]
y = df[TARGET]


# ============================================================
# DATA SUMMARY
# ============================================================

print("\nFinal features:")

for feature in FEATURES:
    print(f"- {feature}")

print("\nTarget distribution:")
print(y.value_counts())


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

print("\nTrain samples:", len(X_train))
print("Test samples :", len(X_test))


# ============================================================
# PREPROCESSING
# ============================================================

numeric_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="median"),
        ),
        (
            "scaler",
            StandardScaler(),
        ),
    ]
)


preprocessor = ColumnTransformer(
    transformers=[
        (
            "numeric",
            numeric_pipeline,
            FEATURES,
        )
    ]
)


# ============================================================
# FINAL MODEL
# ============================================================

model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    n_jobs=-1,
    class_weight="balanced",
)


pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor,
        ),
        (
            "model",
            model,
        ),
    ]
)


# ============================================================
# TRAIN
# ============================================================

print("\n" + "=" * 70)
print("TRAINING FINAL RANDOM FOREST")
print("=" * 70)

print("\nTraining...")

pipeline.fit(
    X_train,
    y_train,
)


# ============================================================
# PREDICTION
# ============================================================

predictions = pipeline.predict(X_test)

probabilities = pipeline.predict_proba(
    X_test
)[:, 1]


# ============================================================
# EVALUATION
# ============================================================

accuracy = accuracy_score(
    y_test,
    predictions,
)

precision = precision_score(
    y_test,
    predictions,
    zero_division=0,
)

recall = recall_score(
    y_test,
    predictions,
    zero_division=0,
)

f1 = f1_score(
    y_test,
    predictions,
    zero_division=0,
)

roc_auc = roc_auc_score(
    y_test,
    probabilities,
)


# ============================================================
# RESULTS
# ============================================================

print("\n" + "=" * 70)
print("FINAL MODEL RESULTS")
print("=" * 70)

print(f"\nAccuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")
print(f"ROC-AUC  : {roc_auc:.4f}")


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0,
    )
)


print("Confusion Matrix:")

print(
    confusion_matrix(
        y_test,
        predictions,
    )
)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

print("\n" + "=" * 70)
print("FEATURE IMPORTANCE")
print("=" * 70)

trained_model = pipeline.named_steps["model"]

importance = pd.Series(
    trained_model.feature_importances_,
    index=FEATURES,
).sort_values(
    ascending=False
)

print(
    importance.to_string()
)


# ============================================================
# SAVE MODEL
# ============================================================

with open(
    MODEL_FILE,
    "wb",
) as file:

    pickle.dump(
        pipeline,
        file,
    )


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("FINAL MODEL SAVED")
print("=" * 70)

print(f"\nModel: Random Forest")
print("Features:", len(FEATURES))
print(f"Model file:\n{MODEL_FILE}")

print("\n" + "=" * 70)
print("FINAL MODEL TRAINING COMPLETE")
print("=" * 70)