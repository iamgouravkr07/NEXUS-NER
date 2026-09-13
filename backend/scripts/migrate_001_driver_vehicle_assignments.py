#!/usr/bin/env python3
"""
NEXUS-NER Migration 001: Driver-Vehicle Assignments
==================================================
Creates the `driver_vehicle_assignments` table to establish the explicit
relationship between DRIVER users and fleet VEHICLES.

Constraints:
  - driver_id references users(id) ON DELETE CASCADE
  - vehicle_id references vehicles(id) ON DELETE CASCADE
  - Partial unique index: only one active vehicle per driver
  - Partial unique index: only one active driver per vehicle
  - Historical records preserved when deactivated (unassigned_at set, is_active=false)

Canonical Seed:
  - Driver User #4 ('driver') -> Vehicle #472 ('AS-01-BX-4091')

Usage:
  python backend/scripts/migrate_001_driver_vehicle_assignments.py
  python backend/scripts/migrate_001_driver_vehicle_assignments.py --downgrade
"""

import argparse
import logging
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import text
from app.database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nexus_ner.migration_001")


def upgrade():
    logger.info("Executing Migration 001: UPGRADE (creating driver_vehicle_assignments)...")
    with engine.begin() as conn:
        # 1. Create table
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
                    id SERIAL PRIMARY KEY,
                    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
                    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    unassigned_at TIMESTAMP WITH TIME ZONE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
                """
            )
        )

        # 2. Create standard indexes
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_driver_vehicle_assignments_id 
                    ON driver_vehicle_assignments(id);
                CREATE INDEX IF NOT EXISTS ix_driver_vehicle_assignments_driver_id 
                    ON driver_vehicle_assignments(driver_id);
                CREATE INDEX IF NOT EXISTS ix_driver_vehicle_assignments_vehicle_id 
                    ON driver_vehicle_assignments(vehicle_id);
                CREATE INDEX IF NOT EXISTS ix_driver_vehicle_assignments_is_active 
                    ON driver_vehicle_assignments(is_active);
                """
            )
        )

        # 3. Create partial unique indexes (guarantee 1 active assignment per driver & per vehicle)
        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_active_driver_assignment 
                    ON driver_vehicle_assignments(driver_id) 
                    WHERE is_active = TRUE;
                CREATE UNIQUE INDEX IF NOT EXISTS uq_active_vehicle_assignment 
                    ON driver_vehicle_assignments(vehicle_id) 
                    WHERE is_active = TRUE;
                """
            )
        )

        # 4. Seed Canonical Demo Assignment: User #4 (driver) -> Vehicle #472 (AS-01-BX-4091)
        driver_check = conn.execute(
            text("SELECT id, username, role FROM users WHERE id = 4")
        ).fetchone()
        vehicle_check = conn.execute(
            text("SELECT id, vehicle_number FROM vehicles WHERE id = 472")
        ).fetchone()

        if driver_check and vehicle_check:
            existing_active = conn.execute(
                text(
                    """
                    SELECT id FROM driver_vehicle_assignments 
                    WHERE (driver_id = 4 OR vehicle_id = 472) AND is_active = TRUE
                    """
                )
            ).fetchone()

            if not existing_active:
                conn.execute(
                    text(
                        """
                        INSERT INTO driver_vehicle_assignments (driver_id, vehicle_id, is_active, assigned_at, created_at)
                        VALUES (4, 472, TRUE, NOW(), NOW())
                        """
                    )
                )
                logger.info("Seeded canonical assignment: Driver User #4 ('%s') -> Vehicle #472 ('%s')", driver_check[1], vehicle_check[1])
            else:
                logger.info("Active assignment for Driver #4 or Vehicle #472 already exists (id=%s). Preserving.", existing_active[0])
        else:
            logger.warning("Could not seed canonical assignment: driver_4=%s, vehicle_472=%s", bool(driver_check), bool(vehicle_check))

    logger.info("Migration 001 UPGRADE completed successfully.")


def downgrade():
    logger.info("Executing Migration 001: DOWNGRADE (dropping driver_vehicle_assignments)...")
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS driver_vehicle_assignments CASCADE;"))
    logger.info("Migration 001 DOWNGRADE completed successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 001: Driver-Vehicle Assignments")
    parser.add_argument("--downgrade", action="store_true", help="Revert the migration")
    args = parser.parse_args()

    if args.downgrade:
        downgrade()
    else:
        upgrade()
