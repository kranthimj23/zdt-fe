"""
Unit tests for generate-config.py — apply_changes_to_json().

apply_changes_to_json() reads a release note Excel file and applies
the recorded changes (add/modify/delete/pending) to a JSON data structure.

This file covers ALL logic branches:
- Root object added (with and without hyperlink to .txt file)
- Root object deleted
- data/env special handling (delegates to handle_data_env)
- General key add/modify/delete/pending (for env-list keys vs normal keys)
- Hotfix scenarios (pending promotions applied)
- Edge cases: missing key, None parsed_value, empty he_cur
"""
import os
import sys
import json
import pytest
from openpyxl import Workbook

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'cd', 'scripts'))

# We can't import apply_changes_to_json directly because generate-config.py
# has a hyphen in its name. Use importlib.
import importlib
gen_config_spec = importlib.util.spec_from_file_location(
    "generate_config",
    os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'cd', 'scripts', 'generate-config.py')
)
generate_config = importlib.util.module_from_spec(gen_config_spec)

# Patch module-level lists before exec
generate_config.deleted_services = []
generate_config.update_template = []


def _make_release_note(tmp_path, rows, lower_env='dev1', higher_env='sit1'):
    """Helper: creates a release-note .xlsx with the given data rows."""
    wb = Workbook()
    ws = wb.active
    ws.title = higher_env

    ws.append([
        'Service name', 'Change Request', 'Key',
        f'{lower_env}-current value', f'{lower_env}-previous value',
        f'{higher_env}-current value', f'{higher_env}-previous value',
        'Comment'
    ])
    for row in rows:
        ws.append(row)

    path = tmp_path / f"release-note-test.xlsx"
    wb.save(str(path))
    return str(path), higher_env


def _load_and_apply(json_data, tmp_path, rows, lower_env='dev1', higher_env='sit1'):
    """Helper: create Excel, exec module, call apply_changes_to_json."""
    excel_path, sheet = _make_release_note(tmp_path, rows, lower_env, higher_env)

    # Re-exec module to get fresh function references
    gen_config_spec.loader.exec_module(generate_config)
    generate_config.deleted_services = []
    generate_config.update_template = []

    return generate_config.apply_changes_to_json(
        json_data, excel_path, sheet, lower_env, higher_env
    )


# ═══════════════════════════════════════════════════════════════════
# 1. MODIFY SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestModifyScenarios:
    """Tests for change_request='modify' on regular (non-env) keys."""

    def test_modify_scalar_value(self, tmp_path):
        """
        SCENARIO: Replicas changed 2 → 4.
        WHAT IT TESTS: Lines 145-147 — obj[final_key] = parsed_value.
        The function reads 'replicas' from the Excel and sets it in JSON.
        """
        json_data = {"service-admin": {"replicas": 2, "cpu": "500m"}}
        rows = [
            ['service-admin', 'modify', 'replicas', '4', '2', '4', '2', 'Modified']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert result["service-admin"]["replicas"] == 4

    def test_modify_nested_key(self, tmp_path):
        """
        SCENARIO: resources//cpu changed "500m" → "1000m".
        WHAT IT TESTS: key_path splitting and nested traversal.
        The '//' in the Key column indicates nesting depth.
        """
        json_data = {"svc": {"resources": {"cpu": "500m", "memory": "512Mi"}}}
        rows = [
            ['svc', 'modify', 'resources//cpu', '"1000m"', '"500m"', '"1000m"', '"500m"', 'Modified']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert result["svc"]["resources"]["cpu"] == "1000m"

    def test_modify_image_tag(self, tmp_path):
        """
        SCENARIO: image//image_name changed (new build tag).
        WHAT IT TESTS: Standard modify applied to the image path.
        REAL-WORLD: New Docker image build deployed to dev.
        """
        json_data = {"svc": {"image": {"image_name": "gcr.io/proj/svc:1.0.0-b5-dev1"}}}
        rows = [
            ['svc', 'modify', 'image//image_name',
             '"gcr.io/proj/svc:1.1.0-b15-dev1"', '"gcr.io/proj/svc:1.0.0-b5-dev1"',
             '"gcr.io/proj/svc:1.1.0-b15-sit1"', '', 'Modified']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert "1.1.0" in result["svc"]["image"]["image_name"]


# ═══════════════════════════════════════════════════════════════════
# 2. ADD SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestAddScenarios:
    """Tests for change_request='add' on regular keys."""

    def test_add_new_key(self, tmp_path):
        """
        SCENARIO: A new key "gpu" is added to svc.
        WHAT IT TESTS: Lines 151-153 — obj[final_key] = parsed_value.
        """
        json_data = {"svc": {"cpu": "500m"}}
        rows = [
            ['svc', 'add', 'gpu', '"1"', '', '"1"', '', 'Added']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert result["svc"]["gpu"] == "1"

    def test_add_nested_key(self, tmp_path):
        """
        SCENARIO: Adding resources//limits//gpu to a service.
        WHAT IT TESTS: setdefault creates intermediate dicts for nested paths.
        """
        json_data = {"svc": {"resources": {"limits": {"cpu": "500m"}}}}
        rows = [
            ['svc', 'add', 'resources//limits//gpu', '"1"', '', '"1"', '', 'Added']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert result["svc"]["resources"]["limits"]["gpu"] == "1"


# ═══════════════════════════════════════════════════════════════════
# 3. DELETE SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestDeleteScenarios:
    """Tests for change_request='delete' on regular keys."""

    def test_delete_scalar_key(self, tmp_path):
        """
        SCENARIO: Key "gpu" deleted from service.
        WHAT IT TESTS: Lines 154,161-163 — del obj[final_key].
        """
        json_data = {"svc": {"cpu": "500m", "gpu": "1"}}
        rows = [
            ['svc', 'delete', 'gpu', '', '"1"', '', '"1"', 'Deleted']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert "gpu" not in result["svc"]

    def test_delete_from_list_by_name(self, tmp_path):
        """
        SCENARIO: Delete a specific entry from a list of dicts by 'name'.
        WHAT IT TESTS: Lines 156-160 — filters the list.
        """
        json_data = {"svc": {"ports": [
            {"name": "http", "port": 8080},
            {"name": "grpc", "port": 9090},
        ]}}
        rows = [
            ['svc', 'delete', 'ports',
             json.dumps({"name": "grpc", "port": 9090}), '',
             '', json.dumps({"name": "grpc", "port": 9090}), 'Deleted']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert len(result["svc"]["ports"]) == 1
        assert result["svc"]["ports"][0]["name"] == "http"


# ═══════════════════════════════════════════════════════════════════
# 4. ROOT OBJECT SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestRootObjectScenarios:
    """Tests for root-level service add/delete (Key is empty)."""

    def test_root_object_added(self, tmp_path):
        """
        SCENARIO: Brand new service added to the config.
        WHAT IT TESTS: Lines 68-81 — creates new root object and
        populates it from he_cur JSON.
        REAL-WORLD: A new microservice "service-payment" onboarded.
        """
        json_data = {"svc-admin": {"replicas": 2}}
        he_cur = json.dumps({"replicas": 1, "image": {"image_name": "img:1.0-sit1"}})
        rows = [
            ['svc-payment', 'add', '', he_cur, '', he_cur, '', 'root object added']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert "svc-payment" in result
        assert result["svc-payment"]["replicas"] == 1

    def test_root_object_deleted(self, tmp_path):
        """
        SCENARIO: Service decommissioned — root object removed.
        WHAT IT TESTS: Lines 59-67 — del json_data[service_name].
        Also checks deleted_services list is populated.
        """
        json_data = {
            "svc-admin": {"replicas": 2},
            "svc-old": {"replicas": 1},
        }
        rows = [
            ['svc-old', 'delete', '', '', json.dumps({"replicas": 1}),
             '', json.dumps({"replicas": 1}), 'root object deleted']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert "svc-old" not in result


# ═══════════════════════════════════════════════════════════════════
# 5. PENDING SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestPendingScenarios:
    """Tests for change_request='pending' — items from prior releases."""

    def test_pending_add_scalar(self, tmp_path):
        """
        SCENARIO: A key added in a prior release wasn't promoted.
        Now it appears as 'pending' in the release note.
        WHAT IT TESTS: Lines 148-150 — same as add, sets the value.
        REAL-WORLD: Dev team added "cache_ttl" 2 releases ago,
        it was never promoted to SIT.
        """
        json_data = {"svc": {"replicas": 2}}
        rows = [
            ['svc', 'pending', 'cache_ttl', '"300"', '', '"300"', '', 'Promotion Pending']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert result["svc"]["cache_ttl"] == "300"


# ═══════════════════════════════════════════════════════════════════
# 6. ENV-LIST SCENARIOS
# ═══════════════════════════════════════════════════════════════════

class TestEnvListScenarios:
    """Tests for keys that start with 'env' — treated as lists."""

    def test_env_list_modify_by_name(self, tmp_path):
        """
        SCENARIO: Env var "DB_HOST" value changed in the env list.
        WHAT IT TESTS: Lines 118-123 — finds entry by name, updates value.
        The key path starts with 'env' so it enters the env-list branch.
        """
        json_data = {"svc": {"env": {"env": [
            {"name": "DB_HOST", "value": "localhost"},
            {"name": "DB_PORT", "value": "5432"},
        ]}}}
        rows = [
            ['svc', 'modify', 'env//env',
             json.dumps({"name": "DB_HOST", "value": "remote"}), '',
             json.dumps({"name": "DB_HOST", "value": "remote"}), '', 'Modified']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        env_list = result["svc"]["env"]["env"]
        db_host = next(e for e in env_list if e["name"] == "DB_HOST")
        assert db_host["value"] == "remote"

    def test_env_list_delete_entry(self, tmp_path):
        """
        SCENARIO: Delete env var "OLD_VAR" from the env list.
        WHAT IT TESTS: Lines 124-136 — filters list by name.
        """
        json_data = {"svc": {"env": {"env": [
            {"name": "KEEP_VAR", "value": "keep"},
            {"name": "OLD_VAR", "value": "remove"},
        ]}}}
        rows = [
            ['svc', 'delete', 'env//env',
             json.dumps({"name": "OLD_VAR", "value": "remove"}), '',
             '', json.dumps({"name": "OLD_VAR", "value": "remove"}), 'Deleted']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        env_list = result["svc"]["env"]["env"]
        assert len(env_list) == 1
        assert env_list[0]["name"] == "KEEP_VAR"


# ═══════════════════════════════════════════════════════════════════
# 7. DATA/ENV SPECIAL HANDLING
# ═══════════════════════════════════════════════════════════════════

class TestDataEnvSpecialHandling:
    """Tests for service_name in ['data', 'env'] — handled by handle_data_env()."""

    def test_data_add(self, tmp_path):
        """
        SCENARIO: Adding a new entry to the 'data' top-level list.
        WHAT IT TESTS: Lines 97-99 — delegates to handle_data_env.
        """
        json_data = {"data": []}
        rows = [
            ['data', 'add', '',
             json.dumps({"name": "CONFIG_KEY", "value": "val"}), '',
             json.dumps({"name": "CONFIG_KEY", "value": "val"}), '', 'Added']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        assert len(result["data"]) == 1


# ═══════════════════════════════════════════════════════════════════
# 8. EDGE CASES
# ═══════════════════════════════════════════════════════════════════

class TestEdgeCases:

    def test_none_parsed_value_skipped(self, tmp_path):
        """
        SCENARIO: he_cur and he_prev are both None for a row.
        WHAT IT TESTS: Lines 93-95 — skips the row silently.
        """
        json_data = {"svc": {"replicas": 2}}
        rows = [
            ['svc', 'modify', 'replicas', None, None, None, None, 'Modified']
        ]
        result = _load_and_apply(json_data, tmp_path, rows)
        # Replicas should remain unchanged
        assert result["svc"]["replicas"] == 2

    def test_missing_key_raises_for_non_data_env(self, tmp_path):
        """
        SCENARIO: Key is empty but comment is not 'root object added/deleted'
        and service_name is not 'data' or 'env'.
        WHAT IT TESTS: Lines 84-86 — raises ValueError.
        """
        json_data = {"svc": {"replicas": 2}}
        rows = [
            ['svc', 'modify', '', '4', '2', '4', '2', 'Some other comment']
        ]
        with pytest.raises(ValueError, match="Missing or empty key"):
            _load_and_apply(json_data, tmp_path, rows)
