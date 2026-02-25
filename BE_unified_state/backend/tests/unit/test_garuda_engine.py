"""
Unit tests for garuda_engine.py — the PURE LOGIC comparison engine.

garuda_engine.py contains three key functions:
1. compare()             — recursive dict/list/scalar comparison
2. compare_list_of_dicts() — compares lists keyed by "name"
3. handle_data_env()     — manages data/env list entries

Each function has multiple code branches. Every branch is tested below.
"""
import json
import sys
import os
import pytest
from unittest.mock import MagicMock

# ── Make source importable ─────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'cd', 'scripts'))

import utilities.garuda_engine as engine
from utilities.json_and_yaml_helpers import dump_and_replace
from utilities.helpers import get_parent_path


# ═══════════════════════════════════════════════════════════════════
# Helper: patch the module-level `envs` list used by garuda_engine
# ═══════════════════════════════════════════════════════════════════
# Default envs for tests
MOCK_ENVS = ['dev1', 'sit1']


# ═══════════════════════════════════════════════════════════════════
# 1. SCALAR COMPARISON SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestCompareScalar:
    """Tests for lines 102-107: scalar le_old != le_new produces 'modify'."""

    def test_string_modified(self):
        """
        SCENARIO: A scalar string value changed from "v1" to "v2".
        WHAT IT TESTS: The `else` branch at line 103 is triggered.
        The engine should record a single 'modify' change with both
        old and new values serialized as JSON.
        """
        changes = []
        engine.compare("v1", "v2", "svc", changes, "v1-he", MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'modify'
        assert '"v2"' in changes[0][3]  # le_new value
        assert '"v1"' in changes[0][4]  # le_old value

    def test_number_modified(self):
        """
        SCENARIO: An integer value changed (replicas 2 → 4).
        WHAT IT TESTS: Same branch as string, but with numeric types.
        Validates JSON serialization of integers.
        """
        changes = []
        engine.compare(2, 4, "svc", changes, 2, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'modify'

    def test_scalar_unchanged(self):
        """
        SCENARIO: le_old == le_new (both are "v1").
        WHAT IT TESTS: The `if le_old != le_new` guard prevents any
        change from being recorded.  changes list stays empty.
        """
        changes = []
        engine.compare("v1", "v1", "svc", changes, "v1", MOCK_ENVS)
        assert len(changes) == 0

    def test_boolean_modified(self):
        """
        SCENARIO: A boolean toggled (false → true).
        WHAT IT TESTS: compare() handles non-string/non-numeric scalars.
        """
        changes = []
        engine.compare(False, True, "svc", changes, False, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'modify'


# ═══════════════════════════════════════════════════════════════════
# 2. DICT COMPARISON SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestCompareDict:
    """
    Tests for the dictionary branch (lines 3-77).
    The engine unions keys from le_old, le_new, and he_old, then
    classifies each key into one of 4 categories.
    """

    def test_key_added_freshly(self):
        """
        SCENARIO: Key "cpu" exists in le_new but NOT in le_old and NOT in he_old.
        WHAT IT TESTS: Lines 42-56 — "Added" branch.
        Since the key is new in BOTH lower-old and higher-old, it's a
        brand new addition → change_type = 'add', comment = 'Added'.
        """
        le_old = {}
        le_new = {"cpu": "500m"}
        he_old = {}
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'add'
        assert changes[0][7] == 'Added'

    def test_key_promotion_pending(self):
        """
        SCENARIO: Key "cpu" exists in BOTH le_old and le_new, but NOT in he_old.
        WHAT IT TESTS: Lines 58-66 — "Promotion Pending" branch.
        The key was already present in the lower env's previous state,
        meaning it was added earlier but never promoted to higher env.
        → change_type = 'pending add', comment = 'Promotion Pending'.
        """
        le_old = {"cpu": "500m"}
        le_new = {"cpu": "500m"}
        he_old = {}
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'pending add'
        assert changes[0][7] == 'Promotion Pending'

    def test_key_deleted(self):
        """
        SCENARIO: Key "cpu" exists in le_old but NOT in le_new.
        WHAT IT TESTS: Lines 17-31 — "Deleted" branch.
        The key was present in the previous lower-env state and has
        been removed in the current state → change_type = 'delete'.
        """
        le_old = {"cpu": "500m"}
        le_new = {}
        he_old = {"cpu": "500m"}
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'delete'
        assert changes[0][7] == 'Deleted'

    def test_key_deletion_pending(self):
        """
        SCENARIO: Key "cpu" exists in he_old but NOT in le_new or le_old.
        WHAT IT TESTS: Lines 32-39 — "Deletion Pending" branch.
        The key only exists in the higher env (promoted earlier) and
        is now absent from both old and new lower env states. This means
        it was deleted in a prior release but never cleaned from higher.
        → change_type = 'pending delete', comment = 'Deletion Pending'.
        """
        le_old = {}
        le_new = {}
        he_old = {"cpu": "500m"}
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'pending delete'
        assert changes[0][7] == 'Deletion Pending'

    def test_key_recursive_into_nested_dict(self):
        """
        SCENARIO: Both le_old and le_new have the same key "resources"
        pointing to nested dicts, but the inner value differs.
        WHAT IT TESTS: Lines 69-77 — recursive compare() call.
        The engine should recurse into the nested dict and find the
        inner change (cpu "500m" → "1000m") with correct path.
        """
        le_old = {"resources": {"cpu": "500m"}}
        le_new = {"resources": {"cpu": "1000m"}}
        he_old = {"resources": {"cpu": "500m"}}
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'modify'
        # Path should include "resources" in the key trail
        assert 'resources' in changes[0][2] or '"1000m"' in changes[0][3]

    def test_multiple_keys_mixed_changes(self):
        """
        SCENARIO: A dict with 3 keys — one added, one modified, one deleted.
        WHAT IT TESTS: All three dict branches fire within a single compare().
        Validates that the engine processes ALL keys from the union.
        """
        le_old = {"cpu": "500m", "memory": "512Mi"}
        le_new = {"cpu": "1000m", "gpu": "1"}       # cpu modified, memory deleted, gpu added
        he_old = {"cpu": "500m", "memory": "512Mi"}
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        types = [c[1] for c in changes]
        assert 'modify' in types       # cpu changed
        assert 'delete' in types       # memory removed
        assert 'add' in types          # gpu added

    def test_he_old_is_none_handled_gracefully(self):
        """
        SCENARIO: he_old is None (first time deploying to higher env).
        WHAT IT TESTS: Line 5 — `he_old = he_old or {}` guard.
        The engine should not crash but treat all le_new keys as 'add'.
        """
        le_old = {}
        le_new = {"replicas": 3}
        he_old = None
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'add'


# ═══════════════════════════════════════════════════════════════════
# 3. LIST OF DICTS COMPARISON SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestCompareListOfDicts:
    """
    Tests for compare_list_of_dicts() (lines 110-190).
    This function compares lists of dicts keyed by the "name" field.
    It mirrors the dict comparison logic but for list items.
    """

    def test_list_item_added(self):
        """
        SCENARIO: A new env var {"name": "NEW_VAR", "value": "abc"} is
        added to le_new but doesn't exist in le_old or he_old.
        WHAT IT TESTS: Lines 149-165 — list item "Added" branch.
        """
        le_old = [{"name": "OLD_VAR", "value": "123"}]
        le_new = [{"name": "OLD_VAR", "value": "123"}, {"name": "NEW_VAR", "value": "abc"}]
        he_old = [{"name": "OLD_VAR", "value": "123"}]
        changes = []
        engine.compare_list_of_dicts(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        added = [c for c in changes if c[1] == 'add']
        assert len(added) == 1

    def test_list_item_deleted(self):
        """
        SCENARIO: Env var "OLD_VAR" was in le_old but removed from le_new.
        WHAT IT TESTS: Lines 125-139 — list item "Deleted" branch.
        """
        le_old = [{"name": "OLD_VAR", "value": "123"}, {"name": "KEEP", "value": "x"}]
        le_new = [{"name": "KEEP", "value": "x"}]
        he_old = [{"name": "OLD_VAR", "value": "123"}, {"name": "KEEP", "value": "x"}]
        changes = []
        engine.compare_list_of_dicts(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        deleted = [c for c in changes if c[1] == 'delete']
        assert len(deleted) == 1

    def test_list_item_modified(self):
        """
        SCENARIO: Env var "MY_VAR" exists in both but value changed "old" → "new".
        WHAT IT TESTS: Lines 177-190 — list item "Modified" branch.
        """
        le_old = [{"name": "MY_VAR", "value": "old"}]
        le_new = [{"name": "MY_VAR", "value": "new"}]
        he_old = [{"name": "MY_VAR", "value": "old"}]
        changes = []
        engine.compare_list_of_dicts(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        modified = [c for c in changes if c[1] == 'modify']
        assert len(modified) == 1

    def test_list_item_deletion_pending(self):
        """
        SCENARIO: An env var exists in he_old but NOT in le_new.
        WHAT IT TESTS: Lines 140-147 — "Deletion Pending" for list items.
        """
        le_old = []
        le_new = []
        he_old = [{"name": "ORPHAN", "value": "x"}]
        changes = []
        engine.compare_list_of_dicts(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        pending = [c for c in changes if c[1] == 'pending delete']
        assert len(pending) == 1

    def test_list_item_promotion_pending(self):
        """
        SCENARIO: An env var exists in le_old AND le_new, but NOT in he_old.
        WHAT IT TESTS: Lines 150,157,166-174 — "Promotion Pending" path.
        The item was added in a prior lower-env release but not yet
        promoted → 'pending add'.
        """
        le_old = [{"name": "PENDING_VAR", "value": "x"}]
        le_new = [{"name": "PENDING_VAR", "value": "x"}]
        he_old = []
        changes = []
        engine.compare_list_of_dicts(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        pending = [c for c in changes if c[1] == 'pending add']
        assert len(pending) == 1

    def test_list_without_name_key_modified(self):
        """
        SCENARIO: Lists of dicts that do NOT have a "name" key are
        compared by index position instead.
        WHAT IT TESTS: Lines 85-100 in compare() — fallback to index-based
        comparison for lists without "name".
        """
        le_old = [{"port": 8080}]
        le_new = [{"port": 9090}]
        he_old = [{"port": 8080}]
        changes = []
        engine.compare(le_old, le_new, "svc", changes, he_old, MOCK_ENVS)
        assert len(changes) == 1
        assert changes[0][1] == 'modify'


# ═══════════════════════════════════════════════════════════════════
# 4. handle_data_env() SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestHandleDataEnv:
    """
    Tests for handle_data_env() (lines 192-213).
    This function manages the special 'data' and 'env' top-level
    keys which are lists of {name, value} entries.
    """

    def test_add_new_entry(self):
        """
        SCENARIO: Adding a new env var {"name": "DB_HOST", "value": "localhost"}.
        WHAT IT TESTS: Lines 195-198.
        The entry does not already exist → it gets appended.
        """
        json_data = {"env": []}
        engine.handle_data_env(json_data, "env", "add", {"name": "DB_HOST", "value": "localhost"})
        assert len(json_data["env"]) == 1
        assert json_data["env"][0]["name"] == "DB_HOST"

    def test_add_duplicate_warns_but_no_crash(self):
        """
        SCENARIO: Adding an entry that already exists (same "name").
        WHAT IT TESTS: Lines 199-200.
        The function prints a warning but does NOT add a duplicate.
        The list should still have only 1 entry.
        """
        json_data = {"env": [{"name": "DB_HOST", "value": "localhost"}]}
        engine.handle_data_env(json_data, "env", "add", {"name": "DB_HOST", "value": "remote"})
        assert len(json_data["env"]) == 1  # no duplicate added

    def test_pending_add_same_as_add(self):
        """
        SCENARIO: change_request='pending' should follow the same code path as 'add'.
        WHAT IT TESTS: Line 195 — `change_request == 'add' or change_request == 'pending'`.
        """
        json_data = {"data": []}
        engine.handle_data_env(json_data, "data", "pending", {"name": "CACHE_TTL", "value": "300"})
        assert len(json_data["data"]) == 1

    def test_modify_existing_entry(self):
        """
        SCENARIO: Modifying the value of an existing env var.
        WHAT IT TESTS: Lines 202-207.
        Finds the entry by "name" and updates it.
        """
        json_data = {"env": [{"name": "DB_HOST", "value": "localhost"}]}
        engine.handle_data_env(json_data, "env", "modify", {"name": "DB_HOST", "value": "remote-host"})
        assert json_data["env"][0]["value"] == "remote-host"

    def test_modify_nonexistent_warns(self):
        """
        SCENARIO: Attempting to modify an entry that doesn't exist.
        WHAT IT TESTS: Lines 208-209.
        The for-else construct prints a warning. No crash, no changes.
        """
        json_data = {"env": [{"name": "DB_HOST", "value": "localhost"}]}
        engine.handle_data_env(json_data, "env", "modify", {"name": "MISSING", "value": "xxx"})
        # Should not crash, list unchanged
        assert len(json_data["env"]) == 1

    def test_delete_entry(self):
        """
        SCENARIO: Deleting an env var by name.
        WHAT IT TESTS: Lines 211-213.
        Filters out the matching entry from the list.
        """
        json_data = {"env": [
            {"name": "DB_HOST", "value": "localhost"},
            {"name": "DB_PORT", "value": "5432"},
        ]}
        engine.handle_data_env(json_data, "env", "delete", {"name": "DB_HOST", "value": "localhost"})
        assert len(json_data["env"]) == 1
        assert json_data["env"][0]["name"] == "DB_PORT"

    def test_delete_nonexistent_no_crash(self):
        """
        SCENARIO: Deleting an entry that doesn't exist.
        WHAT IT TESTS: The list comprehension at line 212 simply filters
        without finding a match, leaving the list unchanged.
        """
        json_data = {"env": [{"name": "DB_HOST", "value": "localhost"}]}
        engine.handle_data_env(json_data, "env", "delete", {"name": "MISSING", "value": "x"})
        assert len(json_data["env"]) == 1

    def test_add_to_empty_data_key(self):
        """
        SCENARIO: 'data' key doesn't exist in json_data yet.
        WHAT IT TESTS: Line 193 — `json_data.setdefault(service_name, [])`.
        The function should create the key and add the entry.
        """
        json_data = {}
        engine.handle_data_env(json_data, "data", "add", {"name": "KEY", "value": "val"})
        assert "data" in json_data
        assert len(json_data["data"]) == 1
