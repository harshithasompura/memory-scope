import pytest

from backend import contradiction_log, recommendation_log


@pytest.fixture(autouse=True)
def _isolated_log_dbs(tmp_path, monkeypatch):
    """Every test gets throwaway log DBs — mocked-cognee tests still hit the
    real recommendation_log.record() and were polluting the live demo DB."""
    monkeypatch.setattr(recommendation_log, "DB_PATH", tmp_path / "rec.db")
    monkeypatch.setattr(contradiction_log, "DB_PATH", tmp_path / "contra.db")
