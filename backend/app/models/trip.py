from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_id = Column(Integer, nullable=False, index=True)

    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)

    cargo_type = Column(String(100), nullable=False)
    priority = Column(String(20), nullable=False, default="normal")

    status = Column(String(30), nullable=False, default="planned")

    eta_minutes = Column(Integer, nullable=True)

    route_distance_km = Column(Float, nullable=True)
    route_duration_minutes = Column(Integer, nullable=True)