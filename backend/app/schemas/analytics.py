from typing import List, Optional
from pydantic import BaseModel, Field


class KPICard(BaseModel):
    title: str
    value: str
    change: str
    trend: str = "up"
    description: str
    icon: str
    iconClass: str


class TrendPoint(BaseModel):
    day: str
    incidents: int


class DeliveryPoint(BaseModel):
    day: str
    time: float


class RegionalPoint(BaseModel):
    region: str
    vehicles: int
    incidents: int


class RiskDistributionPoint(BaseModel):
    name: str
    value: int
    percentage: float
    color_class: str


class OperationalInsights(BaseModel):
    fleet_utilization: int
    route_safety: int
    incident_resolution: int


class TripsSummary(BaseModel):
    total: int
    completed: int
    in_progress: int
    planned: int
    rerouted: int
    avg_duration_minutes: float


class VehiclesSummary(BaseModel):
    total: int
    moving: int
    idle: int
    offline: int
    utilization_rate: float


class IncidentsSummary(BaseModel):
    total: int
    reported: int
    verified: int
    resolved: int
    rejected: int
    critical: int
    high: int
    medium: int
    low: int
    resolution_rate: float


class RoadsSummary(BaseModel):
    total: int
    open: int
    restricted: int
    blocked: int
    under_repair: int
    safe_percentage: float


class AlertsSummary(BaseModel):
    total: int
    active: int
    critical: int
    high: int
    medium: int
    low: int


class AnalyticsSummaryResponse(BaseModel):
    kpis: List[KPICard]
    incident_trend: List[TrendPoint]
    delivery_trend: List[DeliveryPoint]
    regional_data: List[RegionalPoint]
    risk_data: List[RiskDistributionPoint]
    operational_insights: OperationalInsights
    trips_summary: TripsSummary
    vehicles_summary: VehiclesSummary
    incidents_summary: IncidentsSummary
    roads_summary: RoadsSummary
    alerts_summary: AlertsSummary
