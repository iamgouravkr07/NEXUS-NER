from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class SyncEvent(Base):
    __tablename__ = "sync_events"

    id = Column(Integer, primary_key=True, index=True)

    # Immutable client event UUID generated offline
    client_id = Column(String(64), nullable=False, unique=True, index=True)

    # Optional batch grouping identifier
    batch_id = Column(String(64), nullable=True, index=True)

    # Event type: incident_report, vehicle_gps
    event_type = Column(String(50), nullable=False, index=True)

    # Timestamps
    client_timestamp = Column(DateTime(timezone=True), nullable=False)
    server_timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Geo coordinates if available at event level
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Raw event payload
    payload = Column(JSON, nullable=False)

    # Ingestion status: processed, failed
    status = Column(String(30), nullable=False, default="processed", index=True)

    # Resulting entity pointers
    server_entity_type = Column(String(50), nullable=True)
    server_entity_id = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    # Audit trail of who synced the event
    synced_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
