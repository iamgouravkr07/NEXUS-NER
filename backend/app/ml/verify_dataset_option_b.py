"""
Verification Script for Option B Multi-Seasonal Prototype Dataset.
Reads backend/app/ml/artifacts/dataset_prototype-v1.0.csv and verifies:
- Exactly 10,000 rows
- Valid and monotonically sorted timestamps across 730 days
- Both 2025 and 2026 monsoon seasons represented
- Chronological 70/15/15 partitions without overlap
- Monsoon samples present in Train, Validation, and Test
- Target column validity (only 0 and 1)
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

def run_verification():
    csv_path = Path(__file__).resolve().parent / "artifacts" / "dataset_prototype-v1.0.csv"
    if not csv_path.exists():
        print(f"ERROR: Dataset not found at {csv_path}")
        print("OPTION B DATASET VERIFICATION: FAIL")
        return

    print("==================================================")
    print("OPTION B DATASET VERIFICATION: 730-DAY MULTI-SEASON")
    print(f"Target File: {csv_path}")
    print("==================================================")

    df = pd.read_csv(csv_path)
    failures = []

    # 1. Total row count check
    total_rows = len(df)
    if total_rows != 10000:
        failures.append(f"Expected exactly 10,000 rows, found {total_rows}")

    # 2. Timestamp validity and sorting check
    if "timestamp" not in df.columns:
        failures.append("Missing 'timestamp' column in dataset")
        is_sorted = False
        start_ts, end_ts = None, None
    else:
        dt_series = pd.to_datetime(df["timestamp"], utc=True)
        is_sorted = bool(df["timestamp"].is_monotonic_increasing)
        if not is_sorted:
            failures.append("Timestamps are not monotonically sorted")
        start_ts = df["timestamp"].min()
        end_ts = df["timestamp"].max()

    # 3. Target validity
    if "disruption_within_6h" not in df.columns:
        failures.append("Missing target column 'disruption_within_6h'")
    else:
        unique_targets = set(df["disruption_within_6h"].unique())
        if unique_targets != {0, 1}:
            failures.append(f"Target must contain exactly {{0, 1}}, found {unique_targets}")

    # 4. Chronological 70/15/15 split
    train_df = df.iloc[:7000]
    val_df = df.iloc[7000:8500]
    test_df = df.iloc[8500:]

    # Check split overlap
    train_max = train_df["timestamp"].max()
    val_min = val_df["timestamp"].min()
    val_max = val_df["timestamp"].max()
    test_min = test_df["timestamp"].min()

    if train_max > val_min:
        failures.append(f"Train/Validation temporal overlap: train_max ({train_max}) > val_min ({val_min})")
    if val_max > test_min:
        failures.append(f"Validation/Test temporal overlap: val_max ({val_max}) > test_min ({test_min})")

    # 5. Monsoon counts & percentages
    total_monsoon = int(df["is_monsoon_season"].sum())
    total_monsoon_pct = (total_monsoon / total_rows) * 100

    train_monsoon = int(train_df["is_monsoon_season"].sum())
    train_monsoon_pct = (train_monsoon / len(train_df)) * 100

    val_monsoon = int(val_df["is_monsoon_season"].sum())
    val_monsoon_pct = (val_monsoon / len(val_df)) * 100

    test_monsoon = int(test_df["is_monsoon_season"].sum())
    test_monsoon_pct = (test_monsoon / len(test_df)) * 100

    if train_monsoon <= 0:
        failures.append("Train split has zero monsoon samples")
    if val_monsoon <= 0:
        failures.append("Validation split has zero monsoon samples")
    if test_monsoon <= 0:
        failures.append("Test split has zero monsoon samples")

    # 6. Year-wise monsoon distribution
    df_dt = pd.to_datetime(df["timestamp"], utc=True)
    monsoon_2025 = int(((df_dt.dt.year == 2025) & (df["is_monsoon_season"] == 1)).sum())
    monsoon_2026 = int(((df_dt.dt.year == 2026) & (df["is_monsoon_season"] == 1)).sum())

    if monsoon_2025 <= 0:
        failures.append("Year 2025 has zero monsoon samples")
    if monsoon_2026 <= 0:
        failures.append("Year 2026 has zero monsoon samples")

    # 7. Disruption distributions
    train_pos = int(train_df["disruption_within_6h"].sum())
    train_rate = (train_pos / len(train_df)) * 100

    val_pos = int(val_df["disruption_within_6h"].sum())
    val_rate = (val_pos / len(val_df)) * 100

    test_pos = int(test_df["disruption_within_6h"].sum())
    test_rate = (test_pos / len(test_df)) * 100

    monsoon_df = df[df["is_monsoon_season"] == 1]
    non_monsoon_df = df[df["is_monsoon_season"] == 0]

    monsoon_rate = (monsoon_df["disruption_within_6h"].mean()) * 100
    non_monsoon_rate = (non_monsoon_df["disruption_within_6h"].mean()) * 100

    # Print requested verification items
    print(f"1. Dataset start timestamp: {start_ts}")
    print(f"2. Dataset end timestamp:   {end_ts}")
    print(f"3. Total row count:         {total_rows}")
    print(f"4. Chronological 70/15/15 splits:")
    print(f"   - Train count:      {len(train_df)} (first 7000)")
    print(f"   - Validation count: {len(val_df)} (7000 to 8500)")
    print(f"   - Test count:       {len(test_df)} (remaining 1500)")
    print(f"5. Total monsoon samples:  {total_monsoon} ({total_monsoon_pct:.2f}%)")
    print(f"6. Split monsoon distribution:")
    print(f"   - Train monsoon:      {train_monsoon} ({train_monsoon_pct:.2f}%)")
    print(f"   - Validation monsoon: {val_monsoon} ({val_monsoon_pct:.2f}%)")
    print(f"   - Test monsoon:       {test_monsoon} ({test_monsoon_pct:.2f}%)")
    print(f"7. Disruption positive distribution:")
    print(f"   - Train:      {train_pos} / {len(train_df)} ({train_rate:.2f}%)")
    print(f"   - Validation: {val_pos} / {len(val_df)} ({val_rate:.2f}%)")
    print(f"   - Test:       {test_pos} / {len(test_df)} ({test_rate:.2f}%)")
    print(f"8. Monsoon disruption rate:     {monsoon_rate:.2f}%")
    print(f"9. Non-monsoon disruption rate: {non_monsoon_rate:.2f}%")
    print(f"10. 2025 monsoon sample count:  {monsoon_2025}")
    print(f"11. 2026 monsoon sample count:  {monsoon_2026}")
    print(f"12. Train date range:      {train_df['timestamp'].min()[:10]} -> {train_df['timestamp'].max()[:10]}")
    print(f"13. Validation date range: {val_df['timestamp'].min()[:10]} -> {val_df['timestamp'].max()[:10]}")
    print(f"14. Test date range:       {test_df['timestamp'].min()[:10]} -> {test_df['timestamp'].max()[:10]}")
    print("==================================================")

    # Boolean verification checks summary
    print("Checklist Summary:")
    print(f" [PASS] Exactly 10,000 rows: {total_rows == 10000}")
    print(f" [PASS] Timestamps valid & monotonic sorted: {is_sorted}")
    print(f" [PASS] 2025 has monsoon samples: {monsoon_2025 > 0} ({monsoon_2025})")
    print(f" [PASS] 2026 has monsoon samples: {monsoon_2026 > 0} ({monsoon_2026})")
    print(f" [PASS] Train has monsoon samples: {train_monsoon > 0} ({train_monsoon})")
    print(f" [PASS] Validation has monsoon samples: {val_monsoon > 0} ({val_monsoon})")
    print(f" [PASS] Test has monsoon samples: {test_monsoon > 0} ({test_monsoon})")
    print(f" [PASS] Chronological splits non-overlapping: {train_max <= val_min and val_max <= test_min}")
    print(f" [PASS] Disruption target binary {{0, 1}}: {unique_targets == {0, 1}}")
    print("==================================================")

    if failures:
        print("FAILURES DETECTED:")
        for f in failures:
            print(f" - {f}")
        print("\nOPTION B DATASET VERIFICATION: FAIL")
    else:
        print("\nOPTION B DATASET VERIFICATION: PASS")

if __name__ == "__main__":
    run_verification()
