from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_number = Column(String(50), nullable=False, unique=True)
    vehicle_type = Column(String(50), nullable=False)

    cargo_type = Column(String(100), nullable=False)
    cargo_priority = Column(String(20), nullable=False, default="normal")

    status = Column(String(30), nullable=False, default="idle")

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    current_trip_id = Column(Integer, nullable=True)
