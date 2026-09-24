#!/usr/bin/env python3
"""
NEXUS-NER Migration 002: Public Citizen Reports
==============================================
Creates the `public_reports` table to establish the citizen reporting workflow.

Constraints:
  - reporter_user_id references users(id) ON DELETE CASCADE
  - road_id references roads(id) ON DELETE SET NULL
  - reviewed_by_user_id references users(id) ON DELETE SET NULL
  - converted_incident_id references incidents(id) ON DELETE SET NULL
  - Statuses: UNVERIFIED (default), VERIFIED, REJECTED

Usage:
  python backend/scripts/migrate_002_public_reports.py
  python backend/scripts/migrate_002_public_reports.py --downgrade
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
logger = logging.getLogger("nexus_ner.migration_002")


def upgrade():
    logger.info("Executing Migration 002: UPGRADE (creating public_reports)...")
    with engine.begin() as conn:
        # 1. Create table
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS public_reports (
                    id SERIAL PRIMARY KEY,
                    reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    latitude DOUBLE PRECISION NOT NULL,
                    longitude DOUBLE PRECISION NOT NULL,
                    road_id INTEGER REFERENCES roads(id) ON DELETE SET NULL,
                    report_type VARCHAR(50) NOT NULL,
                    description TEXT NOT NULL,
                    severity_hint VARCHAR(20),
                    photo_url VARCHAR(255),
                    status VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED',
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    reviewed_at TIMESTAMP WITH TIME ZONE,
                    reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    rejection_reason TEXT,
                    verification_notes TEXT,
                    converted_incident_id INTEGER REFERENCES incidents(id) ON DELETE SET NULL
                );
                """
            )
        )

        # 2. Create indexes
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_public_reports_id 
                    ON public_reports(id);
                CREATE INDEX IF NOT EXISTS ix_public_reports_reporter_user_id 
                    ON public_reports(reporter_user_id);
                CREATE INDEX IF NOT EXISTS ix_public_reports_status 
                    ON public_reports(status);
                CREATE INDEX IF NOT EXISTS ix_public_reports_road_id 
                    ON public_reports(road_id);
                CREATE INDEX IF NOT EXISTS ix_public_reports_created_at 
                    ON public_reports(created_at);
                """
            )
        )

    logger.info("Migration 002 UPGRADE completed successfully.")


def downgrade():
    logger.info("Executing Migration 002: DOWNGRADE (dropping public_reports)...")
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS public_reports CASCADE;"))
    logger.info("Migration 002 DOWNGRADE completed successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 002: Public Citizen Reports")
    parser.add_argument("--downgrade", action="store_true", help="Revert the migration")
    args = parser.parse_args()

    if args.downgrade:
        downgrade()
    else:
        upgrade()
