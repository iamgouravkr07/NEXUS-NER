import os
import secrets
import logging

logger = logging.getLogger("nexus_ner.security")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
raw_jwt_secret = os.getenv("JWT_SECRET_KEY")

if raw_jwt_secret:
    if len(raw_jwt_secret) < 32:
        raise ValueError(
            "JWT_SECRET_KEY must be at least 32 characters (256 bits of entropy) for security compliance."
        )
    JWT_SECRET_KEY = raw_jwt_secret
else:
    if ENVIRONMENT in ("production", "staging"):
        raise RuntimeError(
            "FATAL CONFIGURATION ERROR: JWT_SECRET_KEY must be explicitly configured in production/staging environments."
        )
    # Cryptographically random ephemeral secret per process startup for local development only
    JWT_SECRET_KEY = secrets.token_hex(32)
    logger.warning(
        "WARNING: JWT_SECRET_KEY is not set. Generated cryptographically random ephemeral secret for this session. "
        "User sessions will invalidate across server restarts. Set JWT_SECRET_KEY in environment for persistent sessions."
    )

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours

# CORS Configuration
raw_cors = os.getenv("CORS_ORIGINS", "")
if raw_cors:
    CORS_ORIGINS = [orig.strip() for orig in raw_cors.split(",") if orig.strip()]
else:
    if ENVIRONMENT in ("production", "staging"):
        CORS_ORIGINS = ["https://nexus-ner.gov.in"]
    else:
        CORS_ORIGINS = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "capacitor://localhost",
            "http://localhost",
        ]

# Demo / Bootstrap credentials (isolated for SIH development / demonstration only)
BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin@Nexus2026")
BOOTSTRAP_OPERATOR_PASSWORD = os.getenv("BOOTSTRAP_OPERATOR_PASSWORD", "Operator@Nexus2026")
BOOTSTRAP_FIELD_PASSWORD = os.getenv("BOOTSTRAP_FIELD_PASSWORD", "Field@Nexus2026")
BOOTSTRAP_DRIVER_PASSWORD = os.getenv("BOOTSTRAP_DRIVER_PASSWORD", "Driver@Nexus2026")

# Weather Integration Configuration
WEATHER_PROVIDER = os.getenv("WEATHER_PROVIDER", "open-meteo").lower()
WEATHER_CACHE_TTL_MINUTES = int(os.getenv("WEATHER_CACHE_TTL_MINUTES", "15"))
WEATHER_REQUEST_TIMEOUT_SECONDS = int(os.getenv("WEATHER_REQUEST_TIMEOUT_SECONDS", "10"))

# Operational NER Bounding Box (Engineering reference boundary for regional filtering)
NER_BOUNDS = {
    "min_lat": 20.0,
    "max_lat": 30.0,
    "min_lon": 88.0,
    "max_lon": 98.0,
}

# Deterministic Weather Risk Configuration
# Operational heuristic thresholds for transport safety (NOT scientifically calibrated or ML models)
WEATHER_RISK_THRESHOLDS = {
    "precipitation_mm": {
        "moderate": float(os.getenv("WEATHER_THRESHOLD_RAIN_MODERATE", "5.0")),    # >= 5.0 mm preceding 1-hour sum
        "heavy": float(os.getenv("WEATHER_THRESHOLD_RAIN_HEAVY", "15.0")),          # >= 15.0 mm preceding 1-hour sum
        "extreme": float(os.getenv("WEATHER_THRESHOLD_RAIN_EXTREME", "50.0")),      # >= 50.0 mm preceding 1-hour sum
    },
    "wind_kmh": {
        "strong": float(os.getenv("WEATHER_THRESHOLD_WIND_STRONG", "45.0")),        # >= 45.0 km/h sustained or 60 gust
        "gale": float(os.getenv("WEATHER_THRESHOLD_WIND_GALE", "70.0")),            # >= 70.0 km/h sustained or 85 gust
    },
    "visibility_km": {
        "dense_fog": float(os.getenv("WEATHER_THRESHOLD_VIS_DENSE_FOG", "0.8")),    # <= 0.8 km dense fog / severely impaired
        "fog": float(os.getenv("WEATHER_THRESHOLD_VIS_FOG", "2.0")),                # <= 2.0 km reduced visibility
    },
}

# AI / NLP Incident Intelligence Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
NLP_PROVIDER = os.getenv("NLP_PROVIDER", "gemini" if GEMINI_API_KEY else "fallback").lower()
NLP_REQUEST_TIMEOUT_SECONDS = int(os.getenv("NLP_REQUEST_TIMEOUT_SECONDS", "12"))
