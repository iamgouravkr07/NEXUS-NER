from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.incidents import router as incidents_router
from app.api.roads import router as roads_router
from app.database import Base, engine
from app.models.incident import Incident
from app.api.vehicles import router as vehicles_router
from app.api.trips import router as trips_router


# Create the database tables
Base.metadata.create_all(bind=engine)
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