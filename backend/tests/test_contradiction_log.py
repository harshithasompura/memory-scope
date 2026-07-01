"""Tests for contradiction_log — uses a tmp DB to avoid touching the real one."""
import pytest

from backend import contradiction_log


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setattr(contradiction_log, "DB_PATH", tmp_path / "test.db")


def test_is_flagged_false_when_never_flagged():
    assert contradiction_log.is_flagged("d1") is False


def test_flag_then_is_flagged_true():
    contradiction_log.flag("d1", "old doc says HS256, new doc says RS256")
    assert contradiction_log.is_flagged("d1") is True


def test_flag_only_affects_matching_data_id():
    contradiction_log.flag("d1", "reason")
    assert contradiction_log.is_flagged("d2") is False
