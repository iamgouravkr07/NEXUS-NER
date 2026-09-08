import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.incidents import router as incidents_router
from app.api.roads import router as roads_router
from app.api.vehicles import router as vehicles_router
from app.api.trips import router as trips_router
from app.api.routes import router as routes_router
from app.api.risk import router as risk_router
from app.api.alerts import router as alerts_router
from app.database import Base, engine
from app.models.incident import Incident
from app.models.road import Road
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.alert import Alert

logger = logging.getLogger("nexus_ner")

# Create the database tables if database is reachable
try:
    Base.metadata.create_all(bind=engine)
    from app.database import SessionLocal
    from app.services.alert_service import seed_initial_alerts_if_empty
    _db = SessionLocal()
    seed_initial_alerts_if_empty(_db)
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(incidents_router)
app.include_router(roads_router)
app.include_router(vehicles_router)
app.include_router(trips_router)
app.include_router(routes_router)
app.include_router(risk_router)
app.include_router(alerts_router)

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