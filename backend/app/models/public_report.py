from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PublicReport(Base):
    __tablename__ = "public_reports"

    id = Column(Integer, primary_key=True, index=True)

    reporter_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    road_id = Column(
        Integer,
        ForeignKey("roads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    report_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    severity_hint = Column(String(20), nullable=True)

    status = Column(String(20), default="UNVERIFIED", nullable=False, index=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    rejection_reason = Column(Text, nullable=True)
    verification_notes = Column(Text, nullable=True)

    converted_incident_id = Column(
        Integer,
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id])
    road = relationship("Road", foreign_keys=[road_id])
    converted_incident = relationship("Incident", foreign_keys=[converted_incident_id])
