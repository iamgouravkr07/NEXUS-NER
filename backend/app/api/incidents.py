from fastapi import APIRouter
from app.schemas.incident import IncidentCreate, IncidentResponse

router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"]
)

incidents = []
next_id = 1


@router.post("/", response_model=IncidentResponse)
def create_incident(incident: IncidentCreate):
    global next_id

    risk_score = {
        "low": 25,
        "medium": 50,
        "high": 75,
        "critical": 95
    }.get(incident.severity.lower(), 50)

    new_incident = {
        "id": next_id,
        **incident.model_dump(),
        "status": "reported",
        "risk_score": risk_score
    }

    incidents.append(new_incident)
    next_id += 1

    return new_incident


@router.get("/", response_model=list[IncidentResponse])
def get_incidents():
    return incidents
