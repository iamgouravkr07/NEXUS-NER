import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    radius_earth_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius_earth_km * c


class DeterministicGPSSimulator:
    """
    Deterministic GPS simulator for predictable, repeatable vehicle tracking.
    Supports either precomputed route geometries or direct linear/equidistant
    waypoint sequences between start and end coordinates.
    """

    def __init__(
        self,
        route_coordinates: Optional[List[Tuple[float, float]]] = None,
        start_point: Optional[Tuple[float, float]] = None,
        end_point: Optional[Tuple[float, float]] = None,
        total_steps: int = 20,
        interval_seconds: float = 2.0,
        base_timestamp: Optional[datetime] = None,
    ):
        if total_steps < 2:
            total_steps = 2

        self.total_steps = total_steps
        self.interval_seconds = interval_seconds
        self.base_timestamp = base_timestamp or datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)
        self.current_step = 0

        # Establish base trajectory nodes: (lat, lon)
        if route_coordinates and len(route_coordinates) >= 2:
            self.nodes = [(float(lat), float(lon)) for lat, lon in route_coordinates]
        elif start_point and end_point:
            self.nodes = [
                (float(start_point[0]), float(start_point[1])),
                (float(end_point[0]), float(end_point[1])),
            ]
        else:
            raise ValueError(
                "Either route_coordinates or both start_point and end_point must be provided."
            )

        # Precompute cumulative node distances
        self._cumulative_node_distances: List[float] = [0.0]
        for i in range(1, len(self.nodes)):
            prev_lat, prev_lon = self.nodes[i - 1]
            curr_lat, curr_lon = self.nodes[i]
            d = haversine_km(prev_lat, prev_lon, curr_lat, curr_lon)
            self._cumulative_node_distances.append(
                self._cumulative_node_distances[-1] + d
            )

        self.total_distance_km = self._cumulative_node_distances[-1]

    def get_position_at_step(self, step: int) -> Dict[str, Any]:
        """Return deterministic position for a given step without changing state."""
        clamped_step = max(0, min(step, self.total_steps))
        progress = clamped_step / self.total_steps if self.total_steps > 0 else 1.0
        target_distance = progress * self.total_distance_km

        # Find enclosing node segment
        lat, lon = self.nodes[-1]
        for i in range(1, len(self._cumulative_node_distances)):
            d_prev = self._cumulative_node_distances[i - 1]
            d_curr = self._cumulative_node_distances[i]

            if d_prev <= target_distance <= d_curr:
                segment_len = d_curr - d_prev
                if segment_len > 0:
                    fraction = (target_distance - d_prev) / segment_len
                else:
                    fraction = 0.0

                p1_lat, p1_lon = self.nodes[i - 1]
                p2_lat, p2_lon = self.nodes[i]

                lat = p1_lat + (p2_lat - p1_lat) * fraction
                lon = p1_lon + (p2_lon - p1_lon) * fraction
                break

        timestamp = self.base_timestamp + timedelta(
            seconds=clamped_step * self.interval_seconds
        )

        return {
            "step": clamped_step,
            "total_steps": self.total_steps,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "timestamp": timestamp.isoformat(),
            "progress_pct": round(progress * 100.0, 2),
            "distance_traveled_km": round(target_distance, 3),
            "total_distance_km": round(self.total_distance_km, 3),
            "is_finished": clamped_step >= self.total_steps,
        }

    def step(self) -> Dict[str, Any]:
        """Advance one step and return state."""
        pos = self.get_position_at_step(self.current_step)
        if self.current_step < self.total_steps:
            self.current_step += 1
        return pos

    def reset(self) -> None:
        """Reset simulator to step 0."""
        self.current_step = 0

    def generate_all_steps(self) -> List[Dict[str, Any]]:
        """Generate all deterministic steps from 0 to total_steps."""
        return [self.get_position_at_step(s) for s in range(self.total_steps + 1)]
