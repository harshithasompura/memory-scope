from datetime import datetime, timedelta, timezone

from backend.cognee_client import _is_stale, STALE_THRESHOLD


def test_stale_when_older_than_threshold():
    now = datetime(2026, 7, 1, tzinfo=timezone.utc)
    created_at = now - STALE_THRESHOLD - timedelta(minutes=1)
    assert _is_stale(created_at, now) is True


def test_not_stale_when_within_threshold():
    now = datetime(2026, 7, 1, tzinfo=timezone.utc)
    created_at = now - timedelta(minutes=1)
    assert _is_stale(created_at, now) is False


def test_naive_datetime_treated_as_utc_without_crashing():
    now = datetime(2026, 7, 1, tzinfo=timezone.utc)
    naive_created_at = (now - STALE_THRESHOLD - timedelta(minutes=1)).replace(tzinfo=None)
    assert _is_stale(naive_created_at, now) is True
