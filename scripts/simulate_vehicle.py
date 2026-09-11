#!/usr/bin/env python3
"""
Deterministic GPS Vehicle Simulator for NEXUS-NER Development and Testing.
Produces repeatable, predictable vehicle movement along road corridors without hardware.
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
import urllib.request
import urllib.error

# Ensure backend modules can be imported if run directly
project_root = Path(__file__).resolve().parents[0]
if (project_root / "backend").exists():
    sys.path.insert(0, str(project_root / "backend"))
elif (project_root.parent / "backend").exists():
    sys.path.insert(0, str(project_root.parent / "backend"))

try:
    from app.services.gps_simulator import DeterministicGPSSimulator
except ImportError:
    # Fallback to local import if path resolution varies
    sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))
    from app.services.gps_simulator import DeterministicGPSSimulator


def get_auth_token(api_url: str, username: str = "driver", password: str = "Driver@Nexus2026") -> str | None:
    """Fetch JWT token from /auth/login for authenticated telemetry ingestion."""
    try:
        url = f"{api_url.rstrip('/')}/auth/login"
        payload = json.dumps({"username": username, "password": password}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "NEXUS-NER-GPS-Simulator/1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("access_token")
    except Exception:
        return None


def send_location_update(
    api_url: str,
    vehicle_id: int,
    latitude: float,
    longitude: float,
    timestamp: str,
    status: str = "in_transit",
    token: str | None = None,
) -> dict:
    url = f"{api_url.rstrip('/')}/vehicles/{vehicle_id}/location"
    payload = json.dumps({
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": timestamp,
        "status": status,
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "NEXUS-NER-GPS-Simulator/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        url,
        data=payload,
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description="NEXUS-NER Deterministic Vehicle GPS Simulator")
    parser.add_argument("--vehicle-id", type=int, default=1, help="Vehicle ID to simulate (default: 1)")
    parser.add_argument("--start-lat", type=float, default=26.1445, help="Starting latitude (default: 26.1445 Guwahati)")
    parser.add_argument("--start-lon", type=float, default=91.7362, help="Starting longitude (default: 91.7362 Guwahati)")
    parser.add_argument("--end-lat", type=float, default=26.6528, help="Destination latitude (default: 26.6528 Tezpur)")
    parser.add_argument("--end-lon", type=float, default=92.7926, help="Destination longitude (default: 92.7926 Tezpur)")
    parser.add_argument("--steps", type=int, default=20, help="Total steps across the journey (default: 20)")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval seconds between steps (default: 2.0s)")
    parser.add_argument("--api-url", type=str, default="http://127.0.0.1:8000", help="FastAPI backend URL")
    parser.add_argument("--token", type=str, default=None, help="Explicit JWT bearer token")
    parser.add_argument("--username", type=str, default="driver", help="Demo user for authentication (default: driver)")
    parser.add_argument("--password", type=str, default="Driver@Nexus2026", help="Demo password for authentication")
    parser.add_argument("--dry-run", action="store_true", help="Print steps without sending API calls")
    parser.add_argument("--loop", action="store_true", help="Loop journey repeatedly")

    args = parser.parse_args()

    print("==================================================")
    print("NEXUS-NER DETERMINISTIC GPS VEHICLE SIMULATOR")
    print("==================================================")
    print(f"Vehicle ID:      {args.vehicle_id}")
    print(f"Origin:          ({args.start_lat}, {args.start_lon})")
    print(f"Destination:     ({args.end_lat}, {args.end_lon})")
    print(f"Total Steps:     {args.steps}")
    print(f"Step Interval:   {args.interval}s")
    print(f"Backend Target:  {args.api_url}")
    print(f"Dry Run Mode:    {args.dry_run}")
    print("==================================================")

    simulator = DeterministicGPSSimulator(
        start_point=(args.start_lat, args.start_lon),
        end_point=(args.end_lat, args.end_lon),
        total_steps=args.steps,
        interval_seconds=args.interval,
    )

    token = args.token
    if not token and not args.dry_run:
        token = get_auth_token(args.api_url, args.username, args.password)
        if token:
            print(f"Authenticated as: {args.username} (JWT acquired)")
        else:
            print(f"Notice: Could not acquire JWT token for {args.username}; sending unauthenticated")

    steps = simulator.generate_all_steps()

    iteration = 1
    while True:
        if args.loop:
            print(f"\n--- Starting Iteration #{iteration} ---")

        for s in steps:
            step_num = s["step"]
            total = s["total_steps"]
            pct = s["progress_pct"]
            lat = s["latitude"]
            lon = s["longitude"]
            iso_time = s["timestamp"]
            dist_km = s["distance_traveled_km"]

            status_str = "in_transit" if step_num < total else "idle"

            if not args.dry_run:
                try:
                    res = send_location_update(
                        api_url=args.api_url,
                        vehicle_id=args.vehicle_id,
                        latitude=lat,
                        longitude=lon,
                        timestamp=iso_time,
                        status=status_str,
                        token=token,
                    )
                    server_status = f"HTTP 200 (status: {res.get('status')})"
                except Exception as e:
                    server_status = f"ERROR: {e}"
            else:
                server_status = "DRY-RUN (no request sent)"

            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] "
                f"Step {step_num:2d}/{total:2d} ({pct:5.1f}%) | "
                f"Pos: ({lat:.5f}, {lon:.5f}) | "
                f"Dist: {dist_km:.2f} km | {server_status}"
            )

            if step_num < total:
                time.sleep(args.interval)

        print(f"\nReached destination for Vehicle #{args.vehicle_id}!")

        if not args.loop:
            break

        iteration += 1
        time.sleep(args.interval * 2)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSimulation stopped by user.")
        sys.exit(0)
