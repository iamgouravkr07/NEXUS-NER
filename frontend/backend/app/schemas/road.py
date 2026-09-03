from pydantic import BaseModel, Field


class RoadCreate(BaseModel):
    road_name: str
    road_type: str
    status: str = Field(default="open")
    risk_score: float = Field(default=0, ge=0, le=100)
    latitude: float = Field(..., ge=20, le=30)
    longitude: float = Field(..., ge=88, le=98)


class RoadStatusUpdate(BaseModel):
    status: str


class RoadResponse(RoadCreate):
    id: int