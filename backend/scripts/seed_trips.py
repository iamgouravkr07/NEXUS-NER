import sys
from pathlib import Path

# ---------------------------------------------------------
# Add backend/ to Python path so "from app..." works
# ---------------------------------------------------------
ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from app.database import SessionLocal
from app.models.trip import Trip
from app.models.vehicle import Vehicle


# ---------------------------------------------------------
# 30 Synthetic NER Trips
# ---------------------------------------------------------
TRIPS = [
    {
        "vehicle_id": 1,
        "origin": "Guwahati, Assam",
        "destination": "Itanagar, Arunachal Pradesh",
        "cargo_type": "Medical Supplies",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 270,
        "route_distance_km": 330.0,
        "route_duration_minutes": 390,
    },
    {
        "vehicle_id": 2,
        "origin": "Gangtok, Sikkim",
        "destination": "Siliguri, West Bengal",
        "cargo_type": "Food Supplies",
        "priority": "high",
        "status": "active",
        "eta_minutes": 210,
        "route_distance_km": 115.0,
        "route_duration_minutes": 240,
    },
    {
        "vehicle_id": 3,
        "origin": "Shillong, Meghalaya",
        "destination": "Guwahati, Assam",
        "cargo_type": "Consumer Goods",
        "priority": "normal",
        "status": "planned",
        "eta_minutes": 165,
        "route_distance_km": 100.0,
        "route_duration_minutes": 180,
    },
    {
        "vehicle_id": 4,
        "origin": "Aizawl, Mizoram",
        "destination": "Silchar, Assam",
        "cargo_type": "Medical Supplies",
        "priority": "critical",
        "status": "delayed",
        "eta_minutes": 360,
        "route_distance_km": 180.0,
        "route_duration_minutes": 300,
    },
    {
        "vehicle_id": 5,
        "origin": "Imphal, Manipur",
        "destination": "Dimapur, Nagaland",
        "cargo_type": "Food Supplies",
        "priority": "high",
        "status": "active",
        "eta_minutes": 300,
        "route_distance_km": 210.0,
        "route_duration_minutes": 330,
    },
    {
        "vehicle_id": 6,
        "origin": "Kohima, Nagaland",
        "destination": "Dimapur, Nagaland",
        "cargo_type": "Fuel",
        "priority": "high",
        "status": "planned",
        "eta_minutes": 120,
        "route_distance_km": 75.0,
        "route_duration_minutes": 120,
    },
    {
        "vehicle_id": 7,
        "origin": "Agartala, Tripura",
        "destination": "Guwahati, Assam",
        "cargo_type": "Electronics",
        "priority": "normal",
        "status": "active",
        "eta_minutes": 480,
        "route_distance_km": 550.0,
        "route_duration_minutes": 600,
    },
    {
        "vehicle_id": 8,
        "origin": "Tawang, Arunachal Pradesh",
        "destination": "Itanagar, Arunachal Pradesh",
        "cargo_type": "Medical Supplies",
        "priority": "critical",
        "status": "delayed",
        "eta_minutes": 600,
        "route_distance_km": 450.0,
        "route_duration_minutes": 660,
    },
    {
        "vehicle_id": 9,
        "origin": "Dibrugarh, Assam",
        "destination": "Pasighat, Arunachal Pradesh",
        "cargo_type": "Food Supplies",
        "priority": "high",
        "status": "active",
        "eta_minutes": 300,
        "route_distance_km": 160.0,
        "route_duration_minutes": 330,
    },
    {
        "vehicle_id": 10,
        "origin": "Tezpur, Assam",
        "destination": "Bomdila, Arunachal Pradesh",
        "cargo_type": "Construction Material",
        "priority": "normal",
        "status": "planned",
        "eta_minutes": 360,
        "route_distance_km": 170.0,
        "route_duration_minutes": 420,
    },
    {
        "vehicle_id": 11,
        "origin": "Guwahati, Assam",
        "destination": "Shillong, Meghalaya",
        "cargo_type": "Pharmaceuticals",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 150,
        "route_distance_km": 100.0,
        "route_duration_minutes": 180,
    },
    {
        "vehicle_id": 12,
        "origin": "Shillong, Meghalaya",
        "destination": "Jowai, Meghalaya",
        "cargo_type": "Food Supplies",
        "priority": "high",
        "status": "planned",
        "eta_minutes": 135,
        "route_distance_km": 65.0,
        "route_duration_minutes": 150,
    },
    {
        "vehicle_id": 13,
        "origin": "Silchar, Assam",
        "destination": "Aizawl, Mizoram",
        "cargo_type": "Medical Supplies",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 300,
        "route_distance_km": 180.0,
        "route_duration_minutes": 330,
    },
    {
        "vehicle_id": 14,
        "origin": "Dimapur, Nagaland",
        "destination": "Kohima, Nagaland",
        "cargo_type": "Consumer Goods",
        "priority": "normal",
        "status": "planned",
        "eta_minutes": 120,
        "route_distance_km": 75.0,
        "route_duration_minutes": 135,
    },
    {
        "vehicle_id": 15,
        "origin": "Imphal, Manipur",
        "destination": "Moreh, Manipur",
        "cargo_type": "Export Goods",
        "priority": "high",
        "status": "delayed",
        "eta_minutes": 240,
        "route_distance_km": 110.0,
        "route_duration_minutes": 180,
    },
    {
        "vehicle_id": 16,
        "origin": "Agartala, Tripura",
        "destination": "Dharmanagar, Tripura",
        "cargo_type": "Food Supplies",
        "priority": "normal",
        "status": "active",
        "eta_minutes": 210,
        "route_distance_km": 190.0,
        "route_duration_minutes": 240,
    },
    {
        "vehicle_id": 17,
        "origin": "Itanagar, Arunachal Pradesh",
        "destination": "Naharlagun, Arunachal Pradesh",
        "cargo_type": "Medical Supplies",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 60,
        "route_distance_km": 25.0,
        "route_duration_minutes": 60,
    },
    {
        "vehicle_id": 18,
        "origin": "Guwahati, Assam",
        "destination": "Dibrugarh, Assam",
        "cargo_type": "Industrial Goods",
        "priority": "normal",
        "status": "planned",
        "eta_minutes": 480,
        "route_distance_km": 440.0,
        "route_duration_minutes": 510,
    },
    {
        "vehicle_id": 19,
        "origin": "Siliguri, West Bengal",
        "destination": "Gangtok, Sikkim",
        "cargo_type": "Food Supplies",
        "priority": "high",
        "status": "active",
        "eta_minutes": 210,
        "route_distance_km": 115.0,
        "route_duration_minutes": 240,
    },
    {
        "vehicle_id": 20,
        "origin": "Pasighat, Arunachal Pradesh",
        "destination": "Dibrugarh, Assam",
        "cargo_type": "Agricultural Products",
        "priority": "normal",
        "status": "planned",
        "eta_minutes": 300,
        "route_distance_km": 160.0,
        "route_duration_minutes": 330,
    },
    {
        "vehicle_id": 21,
        "origin": "Bomdila, Arunachal Pradesh",
        "destination": "Tezpur, Assam",
        "cargo_type": "Construction Material",
        "priority": "normal",
        "status": "delayed",
        "eta_minutes": 390,
        "route_distance_km": 170.0,
        "route_duration_minutes": 450,
    },
    {
        "vehicle_id": 22,
        "origin": "Kohima, Nagaland",
        "destination": "Imphal, Manipur",
        "cargo_type": "Medical Supplies",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 330,
        "route_distance_km": 140.0,
        "route_duration_minutes": 360,
    },
    {
        "vehicle_id": 23,
        "origin": "Aizawl, Mizoram",
        "destination": "Agartala, Tripura",
        "cargo_type": "Consumer Goods",
        "priority": "normal",
        "status": "planned",
        "eta_minutes": 420,
        "route_distance_km": 300.0,
        "route_duration_minutes": 480,
    },
    {
        "vehicle_id": 24,
        "origin": "Shillong, Meghalaya",
        "destination": "Silchar, Assam",
        "cargo_type": "Pharmaceuticals",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 270,
        "route_distance_km": 220.0,
        "route_duration_minutes": 330,
    },
    {
        "vehicle_id": 25,
        "origin": "Guwahati, Assam",
        "destination": "Agartala, Tripura",
        "cargo_type": "Essential Supplies",
        "priority": "high",
        "status": "delayed",
        "eta_minutes": 600,
        "route_distance_km": 550.0,
        "route_duration_minutes": 660,
    },
    {
        "vehicle_id": 26,
        "origin": "Dibrugarh, Assam",
        "destination": "Itanagar, Arunachal Pradesh",
        "cargo_type": "Medical Equipment",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 360,
        "route_distance_km": 300.0,
        "route_duration_minutes": 420,
    },
    {
        "vehicle_id": 27,
        "origin": "Dimapur, Nagaland",
        "destination": "Imphal, Manipur",
        "cargo_type": "Food Supplies",
        "priority": "high",
        "status": "active",
        "eta_minutes": 300,
        "route_distance_km": 210.0,
        "route_duration_minutes": 330,
    },
    {
        "vehicle_id": 28,
        "origin": "Silchar, Assam",
        "destination": "Guwahati, Assam",
        "cargo_type": "Industrial Goods",
        "priority": "normal",
        "status": "planned",
        "eta_minutes": 330,
        "route_distance_km": 250.0,
        "route_duration_minutes": 390,
    },
    {
        "vehicle_id": 29,
        "origin": "Itanagar, Arunachal Pradesh",
        "destination": "Tawang, Arunachal Pradesh",
        "cargo_type": "Essential Supplies",
        "priority": "critical",
        "status": "delayed",
        "eta_minutes": 720,
        "route_distance_km": 450.0,
        "route_duration_minutes": 780,
    },
    {
        "vehicle_id": 30,
        "origin": "Agartala, Tripura",
        "destination": "Aizawl, Mizoram",
        "cargo_type": "Medical Supplies",
        "priority": "critical",
        "status": "active",
        "eta_minutes": 390,
        "route_distance_km": 300.0,
        "route_duration_minutes": 450,
    },
]


def seed_trips():
    db = SessionLocal()

    inserted = 0
    skipped = 0

    try:
        for trip_data in TRIPS:
            vehicle_id = trip_data["vehicle_id"]

            # ---------------------------------------------
            # Check vehicle exists
            # ---------------------------------------------
            vehicle = (
                db.query(Vehicle)
                .filter(Vehicle.id == vehicle_id)
                .first()
            )

            if not vehicle:
                print(
                    f"Skipping vehicle_id={vehicle_id}: "
                    f"vehicle does not exist"
                )
                skipped += 1
                continue

            # ---------------------------------------------
            # Avoid duplicate trips
            # ---------------------------------------------
            existing_trip = (
                db.query(Trip)
                .filter(Trip.vehicle_id == vehicle_id)
                .first()
            )

            if existing_trip:
                print(
                    f"Skipping vehicle_id={vehicle_id}: "
                    f"trip already exists (trip_id={existing_trip.id})"
                )
                skipped += 1
                continue

            # ---------------------------------------------
            # Create trip
            # ---------------------------------------------
            trip = Trip(
                vehicle_id=trip_data["vehicle_id"],
                origin=trip_data["origin"],
                destination=trip_data["destination"],
                cargo_type=trip_data["cargo_type"],
                priority=trip_data["priority"],
                status=trip_data["status"],
                eta_minutes=trip_data["eta_minutes"],
                route_distance_km=trip_data["route_distance_km"],
                route_duration_minutes=trip_data[
                    "route_duration_minutes"
                ],
            )

            db.add(trip)
            db.flush()

            # ---------------------------------------------
            # Connect vehicle to trip
            # ---------------------------------------------
            vehicle.current_trip_id = trip.id

            # Active/delayed trips mean vehicle is currently
            # travelling.
            if trip.status in ["active", "delayed"]:
                vehicle.status = "in_transit"

            db.commit()

            inserted += 1

            print(
                f"Inserted trip #{trip.id}: "
                f"VH-{vehicle_id:03d} | "
                f"{trip.origin} -> {trip.destination}"
            )

        print("\n-----------------------------------------")
        print("Trip seeding completed")
        print("-----------------------------------------")
        print(f"Trips inserted : {inserted}")
        print(f"Trips skipped  : {skipped}")
        print("-----------------------------------------")

    except Exception as error:
        db.rollback()
        print("\nERROR while seeding trips:")
        print(error)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_trips()