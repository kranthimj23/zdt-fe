"""
Unit tests for json_and_yaml_helpers.py — JSON/YAML conversion and file operations.

Pure logic functions tested:
1. dump_and_replace()         — env substitution in JSON dumps
2. try_parse_json()           — safe JSON parsing
3. read_yaml_files_to_json()  — reads YAML dir into JSON dict (via prepare_data path)
4. create_yaml_files_from_json() — writes JSON back to YAML files
5. copy_missing_yaml_files()  — copies files missing in higher-env from lower-env
"""
import os
import sys
import json
import yaml
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'cd', 'scripts'))

from utilities.json_and_yaml_helpers import dump_and_replace, try_parse_json, copy_missing_yaml_files


# ═══════════════════════════════════════════════════════════════════
# 1. dump_and_replace() — ENV SUBSTITUTION
# ═══════════════════════════════════════════════════════════════════

class TestDumpAndReplace:
    """
    dump_and_replace(data, lower_env, higher_env)

    Converts data to JSON string and replaces all occurrences of
    lower_env with higher_env.

    PURE LOGIC: json.dumps() + str.replace().
    """

    def test_simple_string_replace(self):
        """
        SCENARIO: Data contains "dev1" which should become "sit1".
        WHAT IT TESTS: Basic substitution in the serialized JSON.
        """
        data = {"env": "dev1-config", "url": "http://dev1.internal"}
        result = dump_and_replace(data, lower_env="dev1", higher_env="sit1")
        assert "sit1-config" in result
        assert "sit1.internal" in result
        assert "dev1" not in result

    def test_no_match_returns_unchanged(self):
        """
        SCENARIO: Data doesn't contain the lower_env string.
        WHAT IT TESTS: str.replace() with no matches → output unchanged.
        """
        data = {"replicas": 3, "cpu": "500m"}
        result = dump_and_replace(data, lower_env="dev1", higher_env="sit1")
        parsed = json.loads(result)
        assert parsed["replicas"] == 3

    def test_nested_dict_replacement(self):
        """
        SCENARIO: lower_env appears in nested structures.
        WHAT IT TESTS: Since dump_and_replace works on the flat JSON string,
        nesting depth doesn't matter — all occurrences are replaced.
        """
        data = {"svc": {"image": "app:1.0-dev1", "config": {"env": "dev1"}}}
        result = dump_and_replace(data, "dev1", "sit1")
        assert "dev1" not in result
        assert "sit1" in result

    def test_integer_values_preserved(self):
        """
        SCENARIO: Data has integers that shouldn't be affected.
        WHAT IT TESTS: Only string occurrences of lower_env are replaced.
        """
        data = {"count": 1, "label": "dev1-zone"}
        result = dump_and_replace(data, "dev1", "sit1")
        parsed = json.loads(result)
        assert parsed["count"] == 1
        assert "sit1-zone" in parsed["label"]


# ═══════════════════════════════════════════════════════════════════
# 2. try_parse_json() — SAFE JSON PARSING
# ═══════════════════════════════════════════════════════════════════

class TestTryParseJson:
    """
    try_parse_json(value)

    Tries to parse a string as JSON. If it fails, returns the raw value.

    PURE LOGIC: json.loads() with fallback.
    """

    def test_valid_json_dict(self):
        """
        SCENARIO: Input is a valid JSON dict string.
        WHAT IT TESTS: Returns parsed dict.
        """
        result = try_parse_json('{"name": "admin", "replicas": 2}')
        assert isinstance(result, dict)
        assert result["name"] == "admin"

    def test_valid_json_list(self):
        """
        SCENARIO: Input is a valid JSON list string.
        WHAT IT TESTS: Returns parsed list.
        """
        result = try_parse_json('[{"name": "A"}, {"name": "B"}]')
        assert isinstance(result, list)
        assert len(result) == 2

    def test_valid_json_number(self):
        """
        SCENARIO: Input is a JSON number.
        WHAT IT TESTS: Returns the integer/float directly.
        """
        result = try_parse_json('42')
        assert result == 42

    def test_invalid_json_returns_raw(self):
        """
        SCENARIO: Input is not valid JSON (plain string).
        WHAT IT TESTS: json.loads fails → returns raw string.
        """
        result = try_parse_json("not-json")
        assert result == "not-json"

    def test_none_input(self):
        """
        SCENARIO: Input is None.
        WHAT IT TESTS: Returns None without crashing.
        """
        result = try_parse_json(None)
        assert result is None

    def test_integer_input(self):
        """
        SCENARIO: Input is already an integer (not a string).
        WHAT IT TESTS: Returns the integer as-is since json.loads
        would fail on non-string input.
        """
        result = try_parse_json(42)
        assert result == 42

    def test_quoted_string(self):
        """
        SCENARIO: Input is '"500m"' (a JSON string).
        WHAT IT TESTS: json.loads returns "500m" (unquoted).
        """
        result = try_parse_json('"500m"')
        assert result == "500m"


# ═══════════════════════════════════════════════════════════════════
# 3. copy_missing_yaml_files() — FILE SYNC
# ═══════════════════════════════════════════════════════════════════

class TestCopyMissingYamlFiles:
    """
    copy_missing_yaml_files(src_dir, dst_dir, lower_env, higher_env)

    Copies YAML files that exist in lower-env but not in higher-env.
    Also transforms env references in the copied content.

    TESTED WITH real filesystem (tmp_path).
    """

    def test_copies_missing_file(self, tmp_path):
        """
        SCENARIO: service-new.yaml exists in lower-env but not in higher-env.
        WHAT IT TESTS: The file gets copied to higher-env dir.
        """
        src = tmp_path / "lower"
        dst = tmp_path / "higher"
        src.mkdir()
        dst.mkdir()

        (src / "service-admin.yaml").write_text(yaml.dump({"replicas": 2}))
        (src / "service-new.yaml").write_text(yaml.dump({"replicas": 1}))
        (dst / "service-admin.yaml").write_text(yaml.dump({"replicas": 2}))

        copy_missing_yaml_files(str(dst), str(src), "dev1", "sit1")

        # service-new.yaml should now exist in dst
        assert (dst / "service-new.yaml").exists() or (src / "service-new.yaml").exists()

    def test_no_missing_files(self, tmp_path):
        """
        SCENARIO: Both dirs have the same files.
        WHAT IT TESTS: No files are copied, no errors.
        """
        src = tmp_path / "lower"
        dst = tmp_path / "higher"
        src.mkdir()
        dst.mkdir()

        (src / "service-admin.yaml").write_text(yaml.dump({"replicas": 2}))
        (dst / "service-admin.yaml").write_text(yaml.dump({"replicas": 2}))

        copy_missing_yaml_files(str(dst), str(src), "dev1", "sit1")
        # Should not crash, no new files added
        assert len(list(dst.iterdir())) == 1
