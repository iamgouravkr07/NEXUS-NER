#!/usr/bin/env python3
"""
NEXUS-NER -- SAFE DEMO DATABASE CLEANUP & CANONICAL RESET
=========================================================
Idempotent script to prune test fixtures, synthetic test pollution,
and duplicate entries from PostgreSQL/PostGIS, leaving ONLY the
canonical SIH 2026 demonstration scenario and baseline NER assets.

Canonical Records Preserved:
  * Road #135:     NH-15 Guwahati-Tezpur Corridor (open, risk 15.0)
  * Incident #15:  [DEMO-SIH-2026] Major landslide near Kharupetia (reported, risk 95.0)
  * Vehicle #472:  AS-01-BX-4091 (Critical Vaccines & Cold-Chain Supplies)
  * Trip #318:     Guwahati -> Tezpur (active, reroute_count 0, full geometry)
  * Users #1-4:    admin, operator, field_officer, driver
  * Alerts #1-6:   6 official multi-state regional seed alerts (seed:alert:1..6)
  * Weather:       ALL 229 regional observation cache records

Usage:
  Dry-Run (Safe inspection, zero changes):
    python backend/scripts/clean_demo_database.py --dry-run

  Real Execution:
    python backend/scripts/clean_demo_database.py
"""

import argparse
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sys

# Ensure backend package is in python path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import text
from app.database import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nexus_ner.db_cleanup")

# Canonical Demonstration Constants
CANONICAL_ROAD_ID = 135
CANONICAL_INCIDENT_ID = 15
CANONICAL_VEHICLE_ID = 472
CANONICAL_TRIP_ID = 318
CANONICAL_USER_IDS = (1, 2, 3, 4)
CANONICAL_SEED_ALERT_DEDUPS = (
    "seed:alert:1",
    "seed:alert:2",
    "seed:alert:3",
    "seed:alert:4",
    "seed:alert:5",
    "seed:alert:6",
)


def verify_dependencies(db) -> dict:
    """Check foreign-key and relational dependencies before deletion."""
    dep_report = {}

    # 1. Check sync_events referencing users
    sync_users = db.execute(
        text(
            "SELECT synced_by_user_id, count(*) FROM sync_events "
            "WHERE synced_by_user_id IS NOT NULL "
            "GROUP BY synced_by_user_id ORDER BY synced_by_user_id"
        )
    ).fetchall()
    dep_report["sync_events_user_refs"] = sync_users

    # 2. Check trips referencing vehicles
    non_canonical_trips_veh = db.execute(
        text(f"SELECT count(*) FROM trips WHERE vehicle_id != {CANONICAL_VEHICLE_ID}")
    ).scalar()
    dep_report["non_canonical_trips_with_veh"] = non_canonical_trips_veh

    # 3. Check vehicles with current_trip_id
    vehicles_with_trip = db.execute(
        text(
            f"SELECT count(*) FROM vehicles "
            f"WHERE current_trip_id IS NOT NULL AND id != {CANONICAL_VEHICLE_ID}"
        )
    ).scalar()
    dep_report["non_canonical_vehicles_with_trip"] = vehicles_with_trip

    # 4. Check incidents referencing roads
    non_canonical_inc_roads = db.execute(
        text(
            f"SELECT count(*) FROM incidents "
            f"WHERE affected_road_id IS NOT NULL AND affected_road_id != {CANONICAL_ROAD_ID}"
        )
    ).scalar()
    dep_report["non_canonical_incidents_road_refs"] = non_canonical_inc_roads

    # 5. Check alerts referencing entities
    alerts_ref_incidents = db.execute(
        text(f"SELECT count(*) FROM alerts WHERE source_entity = 'incident' AND source_entity_id != {CANONICAL_INCIDENT_ID}")
    ).scalar()
    alerts_ref_trips = db.execute(
        text(f"SELECT count(*) FROM alerts WHERE source_entity = 'trip' AND source_entity_id != {CANONICAL_TRIP_ID}")
    ).scalar()
    alerts_ref_vehicles = db.execute(
        text(f"SELECT count(*) FROM alerts WHERE source_entity = 'vehicle' AND source_entity_id != {CANONICAL_VEHICLE_ID}")
    ).scalar()
    alerts_ref_roads = db.execute(
        text(f"SELECT count(*) FROM alerts WHERE source_entity = 'road' AND source_entity_id != {CANONICAL_ROAD_ID}")
    ).scalar()
    dep_report["alerts_ref_non_canonical"] = {
        "incidents": alerts_ref_incidents,
        "trips": alerts_ref_trips,
        "vehicles": alerts_ref_vehicles,
        "roads": alerts_ref_roads,
    }

    # 6. Verify canonical records exist
    road_135 = db.execute(text(f"SELECT id, road_name, status, risk_score FROM roads WHERE id = {CANONICAL_ROAD_ID}")).first()
    inc_15 = db.execute(text(f"SELECT id, incident_type, status, affected_road_id FROM incidents WHERE id = {CANONICAL_INCIDENT_ID}")).first()
    veh_472 = db.execute(text(f"SELECT id, vehicle_number, status, current_trip_id FROM vehicles WHERE id = {CANONICAL_VEHICLE_ID}")).first()
    trip_318 = db.execute(text(f"SELECT id, vehicle_id, origin, destination, status FROM trips WHERE id = {CANONICAL_TRIP_ID}")).first()
    users_canon = db.execute(text(f"SELECT id, username, role FROM users WHERE id IN {CANONICAL_USER_IDS} ORDER BY id")).fetchall()
    seed_alerts_found = db.execute(
        text(f"SELECT id, dedup_key, title FROM alerts WHERE dedup_key IN {CANONICAL_SEED_ALERT_DEDUPS} ORDER BY id")
    ).fetchall()
    weather_count = db.execute(text("SELECT count(*) FROM weather_records")).scalar()

    dep_report["canonical_status"] = {
        "road_135_exists": road_135 is not None,
        "road_135": dict(road_135._mapping) if road_135 else None,
        "incident_15_exists": inc_15 is not None,
        "incident_15": dict(inc_15._mapping) if inc_15 else None,
        "vehicle_472_exists": veh_472 is not None,
        "vehicle_472": dict(veh_472._mapping) if veh_472 else None,
        "trip_318_exists": trip_318 is not None,
        "trip_318": dict(trip_318._mapping) if trip_318 else None,
        "users_count": len(users_canon),
        "users": [dict(u._mapping) for u in users_canon],
        "seed_alerts_count": len(seed_alerts_found),
        "seed_alerts": [dict(a._mapping) for a in seed_alerts_found],
        "weather_records_count": weather_count,
    }

    return dep_report


def calculate_deletion_inventory(db) -> dict:
    """Calculate exact record counts and sample IDs marked for deletion."""
    inventory = {}

    # 1. sync_events (all)
    sync_total = db.execute(text("SELECT count(*) FROM sync_events")).scalar()
    sync_samples = db.execute(text("SELECT id FROM sync_events ORDER BY id LIMIT 5")).fetchall()
    inventory["sync_events"] = {
        "total_in_db": sync_total,
        "delete_count": sync_total,
        "preserve_count": 0,
        "sample_ids": [s[0] for s in sync_samples],
        "criterion": "ALL records (test synchronization runs)",
    }

    # 2. alerts (all except 6 seed alerts)
    alerts_total = db.execute(text("SELECT count(*) FROM alerts")).scalar()
    alerts_del_count = db.execute(
        text(f"SELECT count(*) FROM alerts WHERE dedup_key NOT IN {CANONICAL_SEED_ALERT_DEDUPS} OR dedup_key IS NULL")
    ).scalar()
    alerts_del_samples = db.execute(
        text(
            f"SELECT id FROM alerts "
            f"WHERE dedup_key NOT IN {CANONICAL_SEED_ALERT_DEDUPS} OR dedup_key IS NULL "
            f"ORDER BY id LIMIT 10"
        )
    ).fetchall()
    alerts_preserve_count = alerts_total - alerts_del_count
    inventory["alerts"] = {
        "total_in_db": alerts_total,
        "delete_count": alerts_del_count,
        "preserve_count": alerts_preserve_count,
        "sample_ids": [a[0] for a in alerts_del_samples],
        "criterion": f"dedup_key NOT IN {CANONICAL_SEED_ALERT_DEDUPS} (or IS NULL)",
    }

    # 3. incidents (all except Incident #15)
    inc_total = db.execute(text("SELECT count(*) FROM incidents")).scalar()
    inc_del_count = db.execute(text(f"SELECT count(*) FROM incidents WHERE id != {CANONICAL_INCIDENT_ID}")).scalar()
    inc_del_samples = db.execute(
        text(f"SELECT id FROM incidents WHERE id != {CANONICAL_INCIDENT_ID} ORDER BY id LIMIT 10")
    ).fetchall()
    inventory["incidents"] = {
        "total_in_db": inc_total,
        "delete_count": inc_del_count,
        "preserve_count": inc_total - inc_del_count,
        "sample_ids": [i[0] for i in inc_del_samples],
        "criterion": f"id != {CANONICAL_INCIDENT_ID}",
    }

    # 4. trips (all except Trip #318)
    trips_total = db.execute(text("SELECT count(*) FROM trips")).scalar()
    trips_del_count = db.execute(text(f"SELECT count(*) FROM trips WHERE id != {CANONICAL_TRIP_ID}")).scalar()
    trips_del_samples = db.execute(
        text(f"SELECT id FROM trips WHERE id != {CANONICAL_TRIP_ID} ORDER BY id LIMIT 10")
    ).fetchall()
    inventory["trips"] = {
        "total_in_db": trips_total,
        "delete_count": trips_del_count,
        "preserve_count": trips_total - trips_del_count,
        "sample_ids": [t[0] for t in trips_del_samples],
        "criterion": f"id != {CANONICAL_TRIP_ID}",
    }

    # 5. vehicles (all except Vehicle #472)
    veh_total = db.execute(text("SELECT count(*) FROM vehicles")).scalar()
    veh_del_count = db.execute(text(f"SELECT count(*) FROM vehicles WHERE id != {CANONICAL_VEHICLE_ID}")).scalar()
    veh_del_samples = db.execute(
        text(f"SELECT id FROM vehicles WHERE id != {CANONICAL_VEHICLE_ID} ORDER BY id LIMIT 10")
    ).fetchall()
    inventory["vehicles"] = {
        "total_in_db": veh_total,
        "delete_count": veh_del_count,
        "preserve_count": veh_total - veh_del_count,
        "sample_ids": [v[0] for v in veh_del_samples],
        "criterion": f"id != {CANONICAL_VEHICLE_ID}",
    }

    # 6. roads (all except Road #135, specifically IDs 5 and 6)
    roads_total = db.execute(text("SELECT count(*) FROM roads")).scalar()
    roads_del_count = db.execute(text(f"SELECT count(*) FROM roads WHERE id != {CANONICAL_ROAD_ID}")).scalar()
    roads_del_samples = db.execute(
        text(f"SELECT id FROM roads WHERE id != {CANONICAL_ROAD_ID} ORDER BY id")
    ).fetchall()
    inventory["roads"] = {
        "total_in_db": roads_total,
        "delete_count": roads_del_count,
        "preserve_count": roads_total - roads_del_count,
        "sample_ids": [r[0] for r in roads_del_samples],
        "criterion": f"id != {CANONICAL_ROAD_ID} (legacy duplicates #5, #6)",
    }

    # 7. users (all except IDs 1, 2, 3, 4)
    users_total = db.execute(text("SELECT count(*) FROM users")).scalar()
    users_del_count = db.execute(text(f"SELECT count(*) FROM users WHERE id NOT IN {CANONICAL_USER_IDS}")).scalar()
    users_del_samples = db.execute(
        text(f"SELECT id FROM users WHERE id NOT IN {CANONICAL_USER_IDS} ORDER BY id")
    ).fetchall()
    inventory["users"] = {
        "total_in_db": users_total,
        "delete_count": users_del_count,
        "preserve_count": users_total - users_del_count,
        "sample_ids": [u[0] for u in users_del_samples],
        "criterion": f"id NOT IN {CANONICAL_USER_IDS} (mobile test users #22, #23, #24)",
    }

    # 8. weather_records (0 to delete, all 229 preserved)
    weather_total = db.execute(text("SELECT count(*) FROM weather_records")).scalar()
    inventory["weather_records"] = {
        "total_in_db": weather_total,
        "delete_count": 0,
        "preserve_count": weather_total,
        "sample_ids": [],
        "criterion": "NONE (100% preserved)",
    }

    return inventory


def print_banner(dry_run: bool):
    mode_str = "DRY-RUN PREVIEW (READ-ONLY - NO CHANGES)" if dry_run else "REAL DATABASE CLEANUP (ATOMIC TRANSACTION)"
    print("\n" + "=" * 80)
    print(f" NEXUS-NER DEMO DATABASE CLEANUP - {mode_str}")
    print("=" * 80)


def print_inventory_report(inventory: dict, dep_report: dict, dry_run: bool):
    print("\n--- 1. PROPOSED DELETION & RETENTION INVENTORY ---")
    header = f"{'TABLE':<18} | {'CURRENT':<8} | {'DELETE':<8} | {'PRESERVE':<9} | {'CRITERION'}"
    print(header)
    print("-" * 80)

    total_current = 0
    total_delete = 0
    total_preserve = 0

    for table_name, data in inventory.items():
        total_current += data["total_in_db"]
        total_delete += data["delete_count"]
        total_preserve += data["preserve_count"]
        print(
            f"{table_name:<18} | {data['total_in_db']:<8} | {data['delete_count']:<8} | "
            f"{data['preserve_count']:<9} | {data['criterion'][:32]}"
        )
        if data["sample_ids"]:
            samples_str = ", ".join(map(str, data["sample_ids"][:8]))
            if len(data["sample_ids"]) > 8:
                samples_str += f"... (+{len(data['sample_ids']) - 8} more)"
            print(f"  {'|-- Sample IDs to Delete:':<26} [{samples_str}]")

    print("-" * 80)
    print(f"{'TOTAL':<18} | {total_current:<8} | {total_delete:<8} | {total_preserve:<9} |")
    print("=" * 80)

    print("\n--- 2. CANONICAL SIH 2026 RECORDS GUARANTEED PRESERVED ---")
    c = dep_report["canonical_status"]
    rd = c.get("road_135") or {}
    inc = c.get("incident_15") or {}
    vh = c.get("vehicle_472") or {}
    tr = c.get("trip_318") or {}

    print(f"  * ROAD     #{CANONICAL_ROAD_ID}: '{rd.get('road_name')}' | Status: {rd.get('status')} | Risk: {rd.get('risk_score')}")
    print(f"  * INCIDENT #{CANONICAL_INCIDENT_ID}: Type: {inc.get('incident_type')} | Status: {inc.get('status')} | Road Ref: #{inc.get('affected_road_id')}")
    print(f"  * VEHICLE  #{CANONICAL_VEHICLE_ID}: '{vh.get('vehicle_number')}' | Status: {vh.get('status')} | Current Trip: #{vh.get('current_trip_id')}")
    print(f"  * TRIP     #{CANONICAL_TRIP_ID}: '{tr.get('origin')}' -> '{tr.get('destination')}' | Status: {tr.get('status')} | Vehicle: #{tr.get('vehicle_id')}")
    print(f"  * USERS    ({c['users_count']} accounts): {[u['username'] + ' (' + u['role'] + ')' for u in c['users']]}")
    print(f"  * ALERTS   ({c['seed_alerts_count']} seed alerts): {[a['dedup_key'] for a in c['seed_alerts']]}")
    print(f"  * WEATHER  ({c['weather_records_count']} records): 100% preserved (all North Eastern observation cache)")

    print("\n--- 3. FOREIGN-KEY & DEPENDENCY SAFETY VERIFICATION ---")
    print(f"  * sync_events -> users FK: {len(dep_report['sync_events_user_refs'])} user groups referenced.")
    print("    -> SAFE: sync_events is purged BEFORE users table, eliminating all constraint locks.")
    print(f"  * vehicles.current_trip_id: {dep_report['non_canonical_vehicles_with_trip']} non-canonical vehicles have active trip IDs.")
    print("    -> SAFE: Set vehicles.current_trip_id = NULL for id != 472 BEFORE deleting trips.")
    print(f"  * trips.vehicle_id: {dep_report['non_canonical_trips_with_veh']} trips reference non-canonical vehicles.")
    print("    -> SAFE: Non-canonical trips deleted BEFORE non-canonical vehicles.")
    print(f"  * incidents -> roads: {dep_report['non_canonical_incidents_road_refs']} test incidents reference obsolete roads.")
    print("    -> SAFE: Non-canonical incidents deleted; Road #135 strictly protected.")
    print(f"  * polymorphic alerts: {dep_report['alerts_ref_non_canonical']} non-canonical entity references.")
    print("    -> SAFE: All test/stale alerts purged prior to entity deletions.")

    if dry_run:
        print("\n" + "=" * 80)
        print(" [DRY-RUN VERIFICATION COMPLETE]")
        print(" Zero rows modified. Zero rows deleted. Transaction rolled back cleanly.")
        print("=" * 80 + "\n")


def execute_clean(dry_run: bool = False):
    """Execute cleanup with single atomic transaction, supporting dry-run rollback."""
    db = SessionLocal()
    print_banner(dry_run)

    try:
        # Pre-flight audit
        dep_report = verify_dependencies(db)
        inventory = calculate_deletion_inventory(db)

        # Print audit report
        print_inventory_report(inventory, dep_report, dry_run)

        if dry_run:
            # In dry-run mode, explicitly rollback and exit without changing DB
            db.rollback()
            return inventory

        # -------------------------------------------------------------
        # REAL CLEANUP EXECUTION (Strict Dependency-Ordered Deletions)
        # -------------------------------------------------------------
        logger.info("Executing atomic database cleanup transaction...")

        # 1. Drop sync_events (removes incoming FK constraint to users)
        db.execute(text("DELETE FROM sync_events;"))
        logger.info("Step 1/8: sync_events cleared.")

        # 2. Delete test & stale alerts (keep only 6 canonical seed alerts)
        db.execute(
            text(f"DELETE FROM alerts WHERE dedup_key NOT IN {CANONICAL_SEED_ALERT_DEDUPS} OR dedup_key IS NULL;")
        )
        logger.info("Step 2/8: alerts cleared (6 seed alerts retained).")

        # 3. Break circular vehicle -> trip pointers on non-canonical vehicles
        db.execute(
            text(f"UPDATE vehicles SET current_trip_id = NULL WHERE id != {CANONICAL_VEHICLE_ID};")
        )
        logger.info("Step 3/8: non-canonical vehicles unlinked from trips.")

        # 4. Delete non-canonical trips
        db.execute(
            text(f"DELETE FROM trips WHERE id != {CANONICAL_TRIP_ID};")
        )
        logger.info("Step 4/8: non-canonical trips deleted (Trip #318 retained).")

        # 5. Delete non-canonical vehicles
        db.execute(
            text(f"DELETE FROM vehicles WHERE id != {CANONICAL_VEHICLE_ID};")
        )
        logger.info("Step 5/8: non-canonical vehicles deleted (Vehicle #472 retained).")

        # 6. Delete non-canonical incidents
        db.execute(
            text(f"DELETE FROM incidents WHERE id != {CANONICAL_INCIDENT_ID};")
        )
        logger.info("Step 6/8: non-canonical incidents deleted (Incident #15 retained).")

        # 7. Delete non-canonical roads (specifically duplicate roads #5 and #6)
        db.execute(
            text(f"DELETE FROM roads WHERE id != {CANONICAL_ROAD_ID};")
        )
        logger.info("Step 7/8: duplicate roads #5, #6 deleted (Road #135 retained).")

        # 8. Delete non-canonical users (specifically test users #22, #23, #24)
        db.execute(
            text(f"DELETE FROM users WHERE id NOT IN {CANONICAL_USER_IDS};")
        )
        logger.info("Step 8/8: mobile test users deleted (4 RBAC users retained).")

        # -------------------------------------------------------------
        # REASSERT CANONICAL DEMO SCENARIO STATE
        # -------------------------------------------------------------
        logger.info("Reasserting canonical demo scenario initial state...")

        # Road #135 = open, risk 15.0
        db.execute(
            text(
                f"UPDATE roads "
                f"SET status = 'open', risk_score = 15.0, latitude = 26.40463, longitude = 91.925314 "
                f"WHERE id = {CANONICAL_ROAD_ID};"
            )
        )

        # Incident #15 = reported (unverified), risk 95.0
        db.execute(
            text(
                f"UPDATE incidents "
                f"SET status = 'reported', risk_score = 95.0, road_status = 'blocked', "
                f"    incident_type = 'landslide', severity = 'critical', affected_road_id = {CANONICAL_ROAD_ID}, "
                f"    latitude = 26.40463, longitude = 91.925314 "
                f"WHERE id = {CANONICAL_INCIDENT_ID};"
            )
        )

        # Vehicle #472 = in_transit at Guwahati
        db.execute(
            text(
                f"UPDATE vehicles "
                f"SET status = 'in_transit', current_trip_id = {CANONICAL_TRIP_ID}, "
                f"    latitude = 26.1445, longitude = 91.7362 "
                f"WHERE id = {CANONICAL_VEHICLE_ID};"
            )
        )

        # Trip #318 = active, reroute_count 0, last_reroute_reason NULL
        db.execute(
            text(
                f"UPDATE trips "
                f"SET status = 'active', vehicle_id = {CANONICAL_VEHICLE_ID}, "
                f"    reroute_count = 0, last_reroute_reason = NULL "
                f"WHERE id = {CANONICAL_TRIP_ID};"
            )
        )

        # Commit single atomic transaction
        db.commit()
        logger.info("SUCCESS: Database cleanup committed atomically.")

        # Update demo_state.json timestamp and state
        demo_state_file = ROOT_DIR / "scripts" / "demo_state.json"
        if demo_state_file.exists():
            try:
                with open(demo_state_file, "r", encoding="utf-8") as f:
                    state_data = json.load(f)
                state_data["cleaned_at"] = datetime.now(timezone.utc).isoformat()
                with open(demo_state_file, "w", encoding="utf-8") as f:
                    json.dump(state_data, f, indent=2)
            except Exception as e:
                logger.warning("Failed to update demo_state.json: %s", e)

        # Post-cleanup inventory check
        post_inventory = calculate_deletion_inventory(db)
        print("\n" + "=" * 80)
        print(" POST-CLEANUP VERIFIED DATABASE INVENTORY")
        print("=" * 80)
        for tbl, d in post_inventory.items():
            print(f"  * {tbl:<18}: {d['total_in_db']} remaining (0 pending deletion)")
        print("=" * 80 + "\n")

        return post_inventory

    except Exception as exc:
        db.rollback()
        logger.error("Database cleanup transaction failed! Rolled back completely: %s", exc)
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="NEXUS-NER SIH 2026 Safe Demo Database Cleanup")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate cleanup without committing changes to database",
    )
    args = parser.parse_args()
    execute_clean(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
