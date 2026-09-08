from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, index=True)  # critical, high, medium, low
    alert_type = Column(String(50), nullable=False, index=True)  # road_incident, road_risk, reroute, trip_delay, vehicle, weather
    status = Column(String(30), nullable=False, default="active", index=True)  # active, acknowledged, resolved

    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    source_entity = Column(String(50), nullable=True)  # incident, trip, road, vehicle
    source_entity_id = Column(Integer, nullable=True)

    dedup_key = Column(String(255), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
