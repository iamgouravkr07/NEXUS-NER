from sqlalchemy import Column, Integer, String, Float
from geoalchemy2 import Geometry

from app.database import Base


class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)

    road_name = Column(String(100), nullable=False)
    road_type = Column(String(50), nullable=False)

    status = Column(String(30), default="open", nullable=False)
    risk_score = Column(Float, default=0, nullable=False)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    location = Column(
        Geometry(
            geometry_type="POINT",
            srid=4326
        ),
        nullable=False
    )