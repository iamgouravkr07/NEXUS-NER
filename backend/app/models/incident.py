from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)

    incident_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    location = Column(
        Geometry(
            geometry_type="POINT",
            srid=4326
        ),
        nullable=False
    )

    road_status = Column(String(30), default="unknown")
    status = Column(String(30), default="reported")
    risk_score = Column(Float, default=0)

    affected_road_id = Column(
        Integer,
        nullable=True
    )

    reported_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)