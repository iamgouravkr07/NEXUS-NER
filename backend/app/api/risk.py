from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.incident import Incident
from app.models.road import Road

router = APIRouter(
    prefix="/risk",
    tags=["Risk"],
)


class RiskItem(BaseModel):
    id: int
    road: str
    highway: str
    state: str
    district: str
    risk_score: float
    risk_level: str
    probability: float
    confidence: float
    material: str
    movement_type: str
    latitude: float
    longitude: float
    surface: str
    smoothness: str


# Reference regional mapping for key NER corridors
CORRIDOR_METADATA = {
    "NH-415": {"state": "Arunachal Pradesh", "district": "Papum Pare", "material": "Rock"},
    "NH-6": {"state": "Mizoram", "district": "Aizawl", "material": "Earth"},
    "NH-10": {"state": "Sikkim", "district": "East Sikkim", "material": "Debris"},
    "NH-27": {"state": "Assam", "district": "Kamrup", "material": "Earth"},
    "NH-15": {"state": "Assam", "district": "Dhemaji", "material": "Debris"},
    "NH-2": {"state": "Manipur", "district": "Imphal East", "material": "Earth"},
    "NH-8": {"state": "Tripura", "district": "West Tripura", "material": "Earth"},
    "NH-29": {"state": "Nagaland", "district": "Dimapur", "material": "Rock"},
}

DEFAULT_CORRIDORS = [
    {
        "id": 1,
        "road": "NH-415",
        "highway": "NH-415",
        "state": "Arunachal Pradesh",
        "district": "Papum Pare",
        "risk_score": 82.0,
        "risk_level": "High",
        "probability": 0.82,
        "confidence": 0.91,
        "material": "Rock",
        "movement_type": "Landslide",
        "latitude": 27.1,
        "longitude": 93.6,
        "surface": "Paved",
        "smoothness": "Poor",
    },
    {
        "id": 2,
        "road": "NH-6",
        "highway": "NH-6",
        "state": "Mizoram",
        "district": "Aizawl",
        "risk_score": 76.0,
        "risk_level": "High",
        "probability": 0.76,
        "confidence": 0.88,
        "material": "Earth",
        "movement_type": "Slope movement",
        "latitude": 23.7,
        "longitude": 92.7,
        "surface": "Paved",
        "smoothness": "Intermediate",
    },
    {
        "id": 3,
        "road": "NH-10",
        "highway": "NH-10",
        "state": "Sikkim",
        "district": "East Sikkim",
        "risk_score": 68.0,
        "risk_level": "Moderate",
        "probability": 0.68,
        "confidence": 0.84,
        "material": "Debris",
        "movement_type": "Rockfall",
        "latitude": 27.3,
        "longitude": 88.6,
        "surface": "Paved",
        "smoothness": "Poor",
    },
    {
        "id": 4,
        "road": "NH-27",
        "highway": "NH-27",
        "state": "Assam",
        "district": "Kamrup",
        "risk_score": 43.0,
        "risk_level": "Moderate",
        "probability": 0.43,
        "confidence": 0.79,
        "material": "Earth",
        "movement_type": "Flooding",
        "latitude": 26.1,
        "longitude": 91.7,
        "surface": "Paved",
        "smoothness": "Intermediate",
    },
    {
        "id": 5,
        "road": "NH-15",
        "highway": "NH-15",
        "state": "Assam",
        "district": "Dhemaji",
        "risk_score": 88.0,
        "risk_level": "Critical",
        "probability": 0.88,
        "confidence": 0.93,
        "material": "Rock",
        "movement_type": "Landslide",
        "latitude": 27.47,
        "longitude": 94.91,
        "surface": "Paved",
        "smoothness": "Poor",
    },
]


def _get_risk_level(score: float) -> str:
    if score >= 85:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


@router.get("/", response_model=list[RiskItem])
def get_road_risks(db: Session = Depends(get_db)):
    roads = db.query(Road).all()

    if not roads:
        return DEFAULT_CORRIDORS

    verified_incidents = (
        db.query(Incident)
        .filter(Incident.status == "verified")
        .all()
    )
    incidents_by_road = {
        inc.affected_road_id: inc
        for inc in verified_incidents
        if inc.affected_road_id
    }

    result = []
    for road in roads:
        meta = CORRIDOR_METADATA.get(road.road_name, {})
        incident = incidents_by_road.get(road.id)

        score = float(road.risk_score or 0.0)
        level = _get_risk_level(score)

        if incident:
            movement_type = incident.incident_type.title()
        elif road.status == "blocked":
            movement_type = "Road Blockage"
        elif road.status == "under_repair":
            movement_type = "Repair Work"
        elif road.status == "restricted":
            movement_type = "Slope movement"
        else:
            movement_type = "Normal"

        smoothness = (
            "Poor"
            if road.status in {"blocked", "under_repair"}
            else ("Intermediate" if road.status == "restricted" else "Good")
        )

        result.append(
            RiskItem(
                id=road.id,
                road=road.road_name,
                highway=road.road_name,
                state=meta.get("state", "Northeast India"),
                district=meta.get("district", "NER Corridor"),
                risk_score=score,
                risk_level=level,
                probability=round(min(1.0, score / 100.0), 2),
                confidence=0.88,
                material=meta.get("material", "Earth"),
                movement_type=movement_type,
                latitude=road.latitude,
                longitude=road.longitude,
                surface="Paved",
                smoothness=smoothness,
            )
        )

    return result