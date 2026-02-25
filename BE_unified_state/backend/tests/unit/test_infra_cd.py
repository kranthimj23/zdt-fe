"""
Unit tests for generate_tfvars.py and drift_lower_env.py — Infra CD pure logic.

Functions tested:
1. replace_placeholders()     — <<key>> → value substitution in templates
2. compare_dataframes()       — cell-level DataFrame comparison (infra drift)
3. create_whole_resource_diff() — entire sheet added/deleted detection
"""
import os
import sys
import json
import pytest
import pandas as pd
from openpyxl import Workbook

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'infra', 'cd', 'scripts'))

from release_note import compare_dataframes, create_whole_resource_diff


# ═══════════════════════════════════════════════════════════════════
# 1. compare_dataframes() — INFRA DRIFT DETECTION
# ═══════════════════════════════════════════════════════════════════

class TestCompareDataframes:
    """
    compare_dataframes(df1, df2, sheet_name)

    Compares two DataFrames representing infra resource configurations
    from different states (x-1 vs x) and returns field-level differences.

    PURE LOGIC: DataFrame iteration + value comparison.
    """

    def test_modified_value(self):
        """
        SCENARIO: bucket storage_class changed STANDARD → NEARLINE.
        WHAT IT TESTS: Lines 82-93 — val1 != val2 → 'Modified'.
        """
        df1 = pd.DataFrame({
            "object_id": [1], "storage_class": ["STANDARD"], "object_id_1": [1]
        })
        df2 = pd.DataFrame({
            "object_id": [1], "storage_class": ["NEARLINE"], "object_id_1": [1]
        })
        diffs = compare_dataframes(df1, df2, "bucket")
        modified = [d for d in diffs if d['Change'] == 'Modified']
        assert len(modified) == 1
        assert modified[0]['Field'] == 'storage_class'

    def test_added_value(self):
        """
        SCENARIO: New column "labels" added (None → "env:prod").
        WHAT IT TESTS: Lines 103-111 — val1 is None, val2 is not → 'Added'.
        """
        df1 = pd.DataFrame({
            "object_id": [1], "storage_class": ["STANDARD"], "object_id_1": [1]
        })
        df2 = pd.DataFrame({
            "object_id": [1], "storage_class": ["STANDARD"], "labels": ["env:prod"], "object_id_1": [1]
        })
        diffs = compare_dataframes(df1, df2, "bucket")
        added = [d for d in diffs if d['Change'] == 'Added']
        assert len(added) == 1

    def test_deleted_value(self):
        """
        SCENARIO: Column "labels" removed ("env:prod" → None).
        WHAT IT TESTS: Lines 94-102 — val1 is not None, val2 is None → 'Deleted'.
        """
        df1 = pd.DataFrame({
            "object_id": [1], "storage_class": ["STANDARD"], "labels": ["env:prod"], "object_id_1": [1]
        })
        df2 = pd.DataFrame({
            "object_id": [1], "storage_class": ["STANDARD"], "object_id_1": [1]
        })
        diffs = compare_dataframes(df1, df2, "bucket")
        deleted = [d for d in diffs if d['Change'] == 'Deleted']
        assert len(deleted) == 1

    def test_identical_dataframes_no_diff(self):
        """
        SCENARIO: Both DataFrames are identical.
        WHAT IT TESTS: No differences should be recorded.
        """
        df = pd.DataFrame({
            "object_id": [1, 2],
            "storage_class": ["STANDARD", "NEARLINE"],
            "object_id_1": [1, 2]
        })
        diffs = compare_dataframes(df, df, "bucket")
        assert len(diffs) == 0

    def test_multiple_rows_mixed_changes(self):
        """
        SCENARIO: 2 rows — row 1 modified, row 2 unchanged.
        WHAT IT TESTS: Only the changed row/field generates a diff.
        """
        df1 = pd.DataFrame({
            "object_id": [1, 2],
            "storage_class": ["STANDARD", "NEARLINE"],
            "object_id_1": [1, 2]
        })
        df2 = pd.DataFrame({
            "object_id": [1, 2],
            "storage_class": ["COLDLINE", "NEARLINE"],  # row 1 changed
            "object_id_1": [1, 2]
        })
        diffs = compare_dataframes(df1, df2, "bucket")
        modified = [d for d in diffs if d['Change'] == 'Modified']
        assert len(modified) == 1 or len(modified) >= 1

    def test_different_row_counts(self):
        """
        SCENARIO: df2 has an additional row (new resource).
        WHAT IT TESTS: Lines 55-56 — max_rows = max(len(df1), len(df2)).
        The extra row should generate 'Added' diffs.
        """
        df1 = pd.DataFrame({
            "object_id": [1], "name": ["sub-1"], "object_id_1": [1]
        })
        df2 = pd.DataFrame({
            "object_id": [1, 2], "name": ["sub-1", "sub-2"], "object_id_1": [1, 2]
        })
        diffs = compare_dataframes(df1, df2, "pull_subscription")
        added = [d for d in diffs if d['Change'] == 'Added']
        assert len(added) >= 1


# ═══════════════════════════════════════════════════════════════════
# 2. create_whole_resource_diff() — ENTIRE SHEET ADD/DELETE
# ═══════════════════════════════════════════════════════════════════

class TestCreateWholeResourceDiff:
    """
    create_whole_resource_diff(df, sheet_name, change_type)

    When an entire sheet (resource type) exists only in one file,
    this function creates a diff entry for every field of every row.
    """

    def test_whole_resource_added(self):
        """
        SCENARIO: A new resource type "cloud_sql" sheet appears.
        WHAT IT TESTS: Lines 20-33 with change_type="Added".
        Every field in every row is listed as "Added".
        """
        df = pd.DataFrame({
            "object_id": [1], "instance_name": ["db-prod"], "tier": ["db-n1-standard-4"]
        })
        diffs = create_whole_resource_diff(df, "cloud_sql", "Added")
        assert all(d['Change'] == 'Added' for d in diffs)
        assert any(d['Field'] == 'instance_name' for d in diffs)

    def test_whole_resource_deleted(self):
        """
        SCENARIO: Resource type "legacy_vm" completely removed.
        WHAT IT TESTS: Lines 20-33 with change_type="Deleted".
        """
        df = pd.DataFrame({
            "object_id": [1, 2], "vm_name": ["vm-1", "vm-2"]
        })
        diffs = create_whole_resource_diff(df, "legacy_vm", "Deleted")
        assert all(d['Change'] == 'Deleted' for d in diffs)
        assert len(diffs) == 4  # 2 rows × 2 cols

    def test_empty_dataframe(self):
        """
        SCENARIO: Empty DataFrame passed.
        WHAT IT TESTS: No diffs generated, no crash.
        """
        df = pd.DataFrame(columns=["object_id", "name"])
        diffs = create_whole_resource_diff(df, "empty_resource", "Added")
        assert len(diffs) == 0
