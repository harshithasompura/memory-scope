"""Tests for recommendation_log — uses a tmp DB to avoid touching the real one."""
import pytest

from backend import recommendation_log


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Redirect DB_PATH to a fresh temp file for every test."""
    monkeypatch.setattr(recommendation_log, "DB_PATH", tmp_path / "test.db")


# ---------------------------------------------------------------------------
# Schema / defaults
# ---------------------------------------------------------------------------

def test_fresh_db_has_resolved_column():
    """A new DB should include the resolved column; inserted rows default to False."""
    rec_id = recommendation_log.record(
        question="what is ADR-001?",
        answer_text="Server-side sessions.",
        cited_chunk_ids=["c1"],
        cited_data_ids=["d1"],
    )
    row = recommendation_log.get(rec_id)
    assert row is not None
    assert row["resolved"] is False


def test_fresh_db_rows_default_suspect_false():
    """Rows inserted into a fresh DB default to suspect=False."""
    rec_id = recommendation_log.record(
        question="q",
        answer_text="a",
        cited_chunk_ids=[],
        cited_data_ids=[],
    )
    row = recommendation_log.get(rec_id)
    assert row["suspect"] is False


# ---------------------------------------------------------------------------
# resolve()
# ---------------------------------------------------------------------------

def test_resolve_flips_resolved_to_true():
    rec_id = recommendation_log.record(
        question="why use JWT?",
        answer_text="scaling",
        cited_chunk_ids=["c1"],
        cited_data_ids=["d1"],
    )
    recommendation_log.resolve(rec_id)
    row = recommendation_log.get(rec_id)
    assert row["resolved"] is True


def test_resolve_leaves_suspect_unchanged_when_suspect():
    """resolve() must not touch suspect even when suspect=1."""
    rec_id = recommendation_log.record(
        question="q",
        answer_text="a",
        cited_chunk_ids=[],
        cited_data_ids=["d1"],
    )
    # Manually flag suspect
    recommendation_log.flag_suspect_by_data_id("d1")
    row_before = recommendation_log.get(rec_id)
    assert row_before["suspect"] is True

    recommendation_log.resolve(rec_id)
    row_after = recommendation_log.get(rec_id)
    assert row_after["resolved"] is True
    assert row_after["suspect"] is True  # unchanged


def test_resolve_leaves_suspect_unchanged_when_not_suspect():
    """resolve() on a non-suspect row should not flip suspect."""
    rec_id = recommendation_log.record(
        question="q2",
        answer_text="a2",
        cited_chunk_ids=[],
        cited_data_ids=[],
    )
    recommendation_log.resolve(rec_id)
    row = recommendation_log.get(rec_id)
    assert row["resolved"] is True
    assert row["suspect"] is False


# ---------------------------------------------------------------------------
# flag_suspect_by_data_id()
# ---------------------------------------------------------------------------

def test_suspect_data_ids_empty_when_nothing_suspect():
    recommendation_log.record(question="q", answer_text="a", cited_chunk_ids=[], cited_data_ids=["d1"])
    assert recommendation_log.suspect_data_ids() == []


def test_suspect_data_ids_returns_distinct_ids_from_suspect_rows_only():
    recommendation_log.record(question="q1", answer_text="a1", cited_chunk_ids=[], cited_data_ids=["d1", "d2"])
    recommendation_log.record(question="q2", answer_text="a2", cited_chunk_ids=[], cited_data_ids=["d3"])
    recommendation_log.flag_suspect_by_data_id("d1")  # flags only the first row

    result = recommendation_log.suspect_data_ids()

    assert sorted(result) == ["d1", "d2"]  # d3 is from a non-suspect row, excluded


def test_flag_suspect_by_data_id_returns_zero_when_no_match():
    recommendation_log.record(question="q", answer_text="a", cited_chunk_ids=[], cited_data_ids=["d1"])
    count = recommendation_log.flag_suspect_by_data_id("d-missing")
    assert count == 0


def test_flag_suspect_by_data_id_flags_single_match():
    rec_id = recommendation_log.record(question="q", answer_text="a", cited_chunk_ids=[], cited_data_ids=["d1"])
    count = recommendation_log.flag_suspect_by_data_id("d1")
    assert count == 1
    assert recommendation_log.get(rec_id)["suspect"] is True


def test_flag_suspect_by_data_id_flags_all_matching_rows():
    rec1 = recommendation_log.record(question="q1", answer_text="a1", cited_chunk_ids=[], cited_data_ids=["d1"])
    rec2 = recommendation_log.record(question="q2", answer_text="a2", cited_chunk_ids=[], cited_data_ids=["d1", "d2"])
    rec3 = recommendation_log.record(question="q3", answer_text="a3", cited_chunk_ids=[], cited_data_ids=["d2"])

    count = recommendation_log.flag_suspect_by_data_id("d1")

    assert count == 2
    assert recommendation_log.get(rec1)["suspect"] is True
    assert recommendation_log.get(rec2)["suspect"] is True
    assert recommendation_log.get(rec3)["suspect"] is False


def test_flag_suspect_by_data_id_skips_already_suspect_rows():
    """Rows already suspect=1 are excluded from the WHERE clause, so re-flagging returns 0."""
    rec_id = recommendation_log.record(question="q", answer_text="a", cited_chunk_ids=[], cited_data_ids=["d1"])
    first_count = recommendation_log.flag_suspect_by_data_id("d1")
    second_count = recommendation_log.flag_suspect_by_data_id("d1")

    assert first_count == 1
    assert second_count == 0
    assert recommendation_log.get(rec_id)["suspect"] is True


# ---------------------------------------------------------------------------
# blast_radius()
# ---------------------------------------------------------------------------

def test_blast_radius_zero_matches():
    result = recommendation_log.blast_radius("d-missing")
    assert result == {"count": 0, "most_recent": None, "avg_confidence": 0.0}


def test_blast_radius_counts_and_confidence():
    recommendation_log.record(question="q1", answer_text="a1", cited_chunk_ids=[], cited_data_ids=["d1"])
    recommendation_log.record(question="q2", answer_text="a2", cited_chunk_ids=[], cited_data_ids=["d1", "d2"])

    result = recommendation_log.blast_radius("d1")

    assert result["count"] == 2
    # confidence = avg(1/1, 1/2) = 0.75 -- sole citation counts more than a shared one
    assert result["avg_confidence"] == 0.75


def test_blast_radius_most_recent_is_latest_timestamp():
    recommendation_log.record(question="q1", answer_text="a1", cited_chunk_ids=[], cited_data_ids=["d1"])
    rec2 = recommendation_log.record(question="q2", answer_text="a2", cited_chunk_ids=[], cited_data_ids=["d1"])

    result = recommendation_log.blast_radius("d1")

    assert result["most_recent"] == recommendation_log.get(rec2)["timestamp"]


# ---------------------------------------------------------------------------
# get()
# ---------------------------------------------------------------------------

def test_get_returns_correct_row_shape():
    rec_id = recommendation_log.record(
        question="test question",
        answer_text="test answer",
        cited_chunk_ids=["chunk-a", "chunk-b"],
        cited_data_ids=["data-x"],
    )
    row = recommendation_log.get(rec_id)
    assert row is not None
    assert row["id"] == rec_id
    assert row["question"] == "test question"
    assert row["answer_text"] == "test answer"
    assert row["cited_chunk_ids"] == ["chunk-a", "chunk-b"]
    assert row["cited_data_ids"] == ["data-x"]
    assert isinstance(row["suspect"], bool)
    assert isinstance(row["resolved"], bool)


def test_get_returns_none_for_missing_id():
    result = recommendation_log.get(99999)
    assert result is None


# ---------------------------------------------------------------------------
# list_all() includes resolved
# ---------------------------------------------------------------------------

def test_list_all_includes_resolved_field():
    rec_id = recommendation_log.record(
        question="q",
        answer_text="a",
        cited_chunk_ids=[],
        cited_data_ids=[],
    )
    recommendation_log.resolve(rec_id)
    rows = recommendation_log.list_all()
    assert len(rows) == 1
    assert rows[0]["resolved"] is True
