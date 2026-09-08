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

# Demo / Bootstrap credentials (isolated for SIH development / demonstration only)
BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin@Nexus2026")
BOOTSTRAP_OPERATOR_PASSWORD = os.getenv("BOOTSTRAP_OPERATOR_PASSWORD", "Operator@Nexus2026")
BOOTSTRAP_FIELD_PASSWORD = os.getenv("BOOTSTRAP_FIELD_PASSWORD", "Field@Nexus2026")
BOOTSTRAP_DRIVER_PASSWORD = os.getenv("BOOTSTRAP_DRIVER_PASSWORD", "Driver@Nexus2026")
