import logging
from pathlib import Path

from dotenv import load_dotenv

# Load the project-root .env before importing any app modules
ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from app import config

from app.api.incidents import router as incidents_router
from app.api.roads import router as roads_router
from app.api.vehicles import router as vehicles_router
from app.api.trips import router as trips_router
from app.api.routes import router as routes_router
from app.api.risk import router as risk_router
from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.sync import router as sync_router
from app.api.weather import router as weather_router
from app.api.ml import router as ml_router
from app.api.analytics import router as analytics_router
from app.api.websocket import router as websocket_router
from app.api.assignments import router as assignments_router
from app.api.public_reports import router as public_reports_router
from app.database import Base, engine
from app.models.incident import Incident
from app.models.road import Road
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.alert import Alert
from app.models.user import User
from app.models.sync_event import SyncEvent
from app.models.weather import WeatherRecord
from app.models.assignment import DriverVehicleAssignment
from app.models.public_report import PublicReport

logger = logging.getLogger("nexus_ner")


# Create the database tables if database is reachable
try:
    Base.metadata.create_all(bind=engine)
    from app.database import SessionLocal
    from app.services.alert_service import seed_initial_alerts_if_empty
    from app.services.auth_service import seed_initial_users_if_empty
    _db = SessionLocal()
    seed_initial_alerts_if_empty(_db)
    seed_initial_users_if_empty(_db)
    _db.close()
except Exception as err:
    logger.warning("Database connection failed during table initialization: %s", err)

is_production = config.ENVIRONMENT in ("production", "staging")

app = FastAPI(
    title="NEXUS-NER API",
    description="AI-powered logistics and accessibility intelligence platform for North Eastern Region",
    version="0.1.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
    if request.url.scheme == "https" or is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


app.include_router(auth_router)
app.include_router(sync_router)
app.include_router(incidents_router)
app.include_router(roads_router)
app.include_router(vehicles_router)
app.include_router(trips_router)
app.include_router(routes_router)
app.include_router(risk_router)
app.include_router(alerts_router)
app.include_router(weather_router)
app.include_router(ml_router)
app.include_router(analytics_router)
app.include_router(websocket_router)
app.include_router(assignments_router, prefix="/assignments", tags=["Assignments"])
app.include_router(public_reports_router, prefix="/public-reports", tags=["Public Reports"])

# Secure uploads directory for persisted report evidence
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/uploads/{file_path:path}", summary="Secure report evidence retrieval")
def get_secure_upload(
    file_path: str,
    request: Request,
):
    safe_path = Path(UPLOADS_DIR / file_path).resolve()
    if not safe_path.is_relative_to(UPLOADS_DIR.resolve()) or not safe_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested file not found.")

    allowed_exts = {".jpg", ".jpeg", ".png", ".webp"}
    if safe_path.suffix.lower() not in allowed_exts:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to non-image assets is forbidden.")

    return FileResponse(safe_path)

@app.get("/")

def root():
    return {
        "name": "NEXUS-NER",
        "status": "online",
        "version": "0.1.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }