import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from app.database import Base, engine
from app.models.incident import Incident
from app.models.road import Road
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.alert import Alert
from app.models.user import User
from app.models.sync_event import SyncEvent
from app.models.weather import WeatherRecord

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

app = FastAPI(
    title="NEXUS-NER API",
    description="AI-powered logistics and accessibility intelligence platform for North Eastern Region",
    version="0.1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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