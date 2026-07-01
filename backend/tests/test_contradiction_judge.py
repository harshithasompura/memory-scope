from backend.cognee_client import _parse_verdict


def test_parse_verdict_yes_with_reason():
    contradicts, reason = _parse_verdict("yes\nOld doc says HS256, new doc says RS256.")
    assert contradicts is True
    assert reason == "Old doc says HS256, new doc says RS256."


def test_parse_verdict_no_with_reason():
    contradicts, reason = _parse_verdict("no\nThis is a refinement, not a contradiction.")
    assert contradicts is False
    assert reason == "This is a refinement, not a contradiction."


def test_parse_verdict_case_insensitive():
    contradicts, _ = _parse_verdict("YES\nsome reason")
    assert contradicts is True
