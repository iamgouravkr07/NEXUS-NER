from sqlalchemy import Column, Integer, String, Float, Text

from app.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_id = Column(Integer, nullable=False, index=True)

    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)

    origin_lat = Column(Float, nullable=True)
    origin_lon = Column(Float, nullable=True)
    destination_lat = Column(Float, nullable=True)
    destination_lon = Column(Float, nullable=True)

    cargo_type = Column(String(100), nullable=False)
    priority = Column(String(20), nullable=False, default="normal")

    status = Column(String(30), nullable=False, default="planned")

    eta_minutes = Column(Integer, nullable=True)

    route_distance_km = Column(Float, nullable=True)
    route_duration_minutes = Column(Integer, nullable=True)

    current_route_geometry = Column(Text, nullable=True)
    reroute_count = Column(Integer, nullable=False, default=0)
    last_reroute_reason = Column(String(255), nullable=True)