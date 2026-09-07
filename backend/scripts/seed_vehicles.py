import sys
from pathlib import Path

# Allow importing the backend app package
ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from app.database import SessionLocal
from app.models.vehicle import Vehicle


vehicles = [
    {
        "vehicle_number": "VH-001",
        "vehicle_type": "Truck",
        "cargo_type": "Medical Supplies",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 26.1445,
        "longitude": 91.7362,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-002",
        "vehicle_type": "Truck",
        "cargo_type": "Food Grains",
        "cargo_priority": "high",
        "status": "in_transit",
        "latitude": 27.3389,
        "longitude": 88.6065,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-003",
        "vehicle_type": "Truck",
        "cargo_type": "Construction Material",
        "cargo_priority": "normal",
        "status": "stopped",
        "latitude": 24.8170,
        "longitude": 93.9368,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-004",
        "vehicle_type": "Truck",
        "cargo_type": "Medicines",
        "cargo_priority": "critical",
        "status": "delayed",
        "latitude": 25.5788,
        "longitude": 91.8933,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-005",
        "vehicle_type": "Van",
        "cargo_type": "Medical Equipment",
        "cargo_priority": "high",
        "status": "in_transit",
        "latitude": 23.7271,
        "longitude": 92.7176,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-006",
        "vehicle_type": "Truck",
        "cargo_type": "Rice",
        "cargo_priority": "normal",
        "status": "offline",
        "latitude": 23.8315,
        "longitude": 91.2868,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-007",
        "vehicle_type": "Truck",
        "cargo_type": "Vegetables",
        "cargo_priority": "high",
        "status": "in_transit",
        "latitude": 26.7271,
        "longitude": 94.2037,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-008",
        "vehicle_type": "Van",
        "cargo_type": "Emergency Supplies",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 27.0844,
        "longitude": 93.6053,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-009",
        "vehicle_type": "Truck",
        "cargo_type": "Fertilizer",
        "cargo_priority": "normal",
        "status": "idle",
        "latitude": 27.4728,
        "longitude": 94.9120,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-010",
        "vehicle_type": "Truck",
        "cargo_type": "Drinking Water",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 24.6637,
        "longitude": 93.9063,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-011",
        "vehicle_type": "Truck",
        "cargo_type": "Food Packets",
        "cargo_priority": "high",
        "status": "delayed",
        "latitude": 25.4670,
        "longitude": 91.3662,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-012",
        "vehicle_type": "Van",
        "cargo_type": "Medicines",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 24.8170,
        "longitude": 93.9368,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-013",
        "vehicle_type": "Truck",
        "cargo_type": "Cement",
        "cargo_priority": "normal",
        "status": "stopped",
        "latitude": 25.6747,
        "longitude": 94.1077,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-014",
        "vehicle_type": "Truck",
        "cargo_type": "Rice",
        "cargo_priority": "high",
        "status": "in_transit",
        "latitude": 26.2006,
        "longitude": 92.9376,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-015",
        "vehicle_type": "Van",
        "cargo_type": "First Aid Kits",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 27.3314,
        "longitude": 89.6351,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-016",
        "vehicle_type": "Truck",
        "cargo_type": "Fuel",
        "cargo_priority": "high",
        "status": "delayed",
        "latitude": 24.8333,
        "longitude": 92.7789,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-017",
        "vehicle_type": "Truck",
        "cargo_type": "Relief Material",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 26.1445,
        "longitude": 91.7362,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-018",
        "vehicle_type": "Truck",
        "cargo_type": "Grain",
        "cargo_priority": "normal",
        "status": "idle",
        "latitude": 24.0980,
        "longitude": 91.5700,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-019",
        "vehicle_type": "Van",
        "cargo_type": "Medical Supplies",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 25.9040,
        "longitude": 93.7266,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-020",
        "vehicle_type": "Truck",
        "cargo_type": "Construction Material",
        "cargo_priority": "normal",
        "status": "stopped",
        "latitude": 26.3265,
        "longitude": 89.3810,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-021",
        "vehicle_type": "Truck",
        "cargo_type": "Food Grains",
        "cargo_priority": "high",
        "status": "in_transit",
        "latitude": 27.1590,
        "longitude": 94.1140,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-022",
        "vehicle_type": "Van",
        "cargo_type": "Vaccines",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 26.7271,
        "longitude": 94.2037,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-023",
        "vehicle_type": "Truck",
        "cargo_type": "Vegetables",
        "cargo_priority": "high",
        "status": "delayed",
        "latitude": 25.5788,
        "longitude": 91.8933,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-024",
        "vehicle_type": "Truck",
        "cargo_type": "Water Bottles",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 23.7271,
        "longitude": 92.7176,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-025",
        "vehicle_type": "Truck",
        "cargo_type": "Fertilizer",
        "cargo_priority": "normal",
        "status": "idle",
        "latitude": 24.6637,
        "longitude": 93.9063,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-026",
        "vehicle_type": "Van",
        "cargo_type": "Emergency Medicine",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 25.4670,
        "longitude": 91.3662,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-027",
        "vehicle_type": "Truck",
        "cargo_type": "Rice",
        "cargo_priority": "high",
        "status": "in_transit",
        "latitude": 24.8170,
        "longitude": 93.9368,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-028",
        "vehicle_type": "Truck",
        "cargo_type": "Relief Supplies",
        "cargo_priority": "critical",
        "status": "stopped",
        "latitude": 27.0844,
        "longitude": 93.6053,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-029",
        "vehicle_type": "Truck",
        "cargo_type": "Food Supplies",
        "cargo_priority": "high",
        "status": "delayed",
        "latitude": 26.2006,
        "longitude": 92.9376,
        "current_trip_id": None,
    },
    {
        "vehicle_number": "VH-030",
        "vehicle_type": "Van",
        "cargo_type": "First Aid Supplies",
        "cargo_priority": "critical",
        "status": "in_transit",
        "latitude": 25.9040,
        "longitude": 93.7266,
        "current_trip_id": None,
    },
]


def seed_vehicles():
    db = SessionLocal()

    try:
        inserted = 0
        skipped = 0

        for data in vehicles:
            existing = (
                db.query(Vehicle)
                .filter(Vehicle.vehicle_number == data["vehicle_number"])
                .first()
            )

            if existing:
                skipped += 1
                continue

            vehicle = Vehicle(**data)
            db.add(vehicle)
            inserted += 1

        db.commit()

        print(f"Vehicles inserted: {inserted}")
        print(f"Vehicles skipped: {skipped}")

    except Exception as error:
        db.rollback()
        print("Error while seeding vehicles:")
        print(error)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_vehicles()