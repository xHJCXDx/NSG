"""Tests for schemas.sentiment — SentimentResponse."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock
from pydantic import ValidationError


NOW = datetime(2026, 6, 24, 12, 0, 0, tzinfo=timezone.utc)


def _base_sentiment_fields():
    return {
        "sentiment_id": 1,
        "mention_id": 10,
        "final_sentiment_score": 0.75,
        "sentiment_label": "positive",
        "analysis_method": "vader",
        "analyzed_at": NOW,
    }


def test_sentiment_response_importable():
    from schemas.sentiment import SentimentResponse
    assert SentimentResponse is not None


def test_sentiment_response_happy_path():
    from schemas.sentiment import SentimentResponse
    resp = SentimentResponse(**_base_sentiment_fields())
    assert resp.sentiment_id == 1
    assert resp.sentiment_label == "positive"
    assert resp.final_sentiment_score == 0.75


def test_sentiment_response_invalid_label():
    from schemas.sentiment import SentimentResponse
    fields = _base_sentiment_fields()
    fields["sentiment_label"] = "happy"
    with pytest.raises(ValidationError):
        SentimentResponse(**fields)


def test_sentiment_response_valid_labels():
    from schemas.sentiment import SentimentResponse
    for label in ("positive", "negative", "neutral", "mixed"):
        fields = _base_sentiment_fields()
        fields["sentiment_label"] = label
        resp = SentimentResponse(**fields)
        assert resp.sentiment_label == label


def test_sentiment_response_nullable_scores():
    from schemas.sentiment import SentimentResponse
    fields = _base_sentiment_fields()
    fields.update({
        "vader_compound": None,
        "vader_pos": None,
        "vader_neu": None,
        "vader_neg": None,
        "textblob_polarity": None,
        "textblob_subjectivity": None,
        "confidence_score": None,
    })
    resp = SentimentResponse(**fields)
    assert resp.vader_compound is None
    assert resp.confidence_score is None


def test_sentiment_response_decimal_to_float():
    """Decimal/Numeric values must be coerced to float."""
    from decimal import Decimal
    from schemas.sentiment import SentimentResponse
    fields = _base_sentiment_fields()
    fields["final_sentiment_score"] = Decimal("0.8765")
    fields["vader_compound"] = Decimal("-0.5")
    resp = SentimentResponse(**fields)
    assert isinstance(resp.final_sentiment_score, float)
    assert isinstance(resp.vader_compound, float)


def test_sentiment_response_orm_mode():
    from schemas.sentiment import SentimentResponse
    mock_orm = MagicMock()
    mock_orm.sentiment_id = 5
    mock_orm.mention_id = 20
    mock_orm.final_sentiment_score = 0.3
    mock_orm.sentiment_label = "neutral"
    mock_orm.analysis_method = "textblob"
    mock_orm.analyzed_at = NOW
    mock_orm.vader_compound = None
    mock_orm.vader_pos = None
    mock_orm.vader_neu = None
    mock_orm.vader_neg = None
    mock_orm.textblob_polarity = None
    mock_orm.textblob_subjectivity = None
    mock_orm.confidence_score = None

    result = SentimentResponse.model_validate(mock_orm)
    assert result.sentiment_id == 5
    assert result.sentiment_label == "neutral"
