"""Sentiment schemas — SentimentResponse.

Maps to the sentiment_analysis ORM model. Decimal/Numeric columns
are typed as float — acceptable precision for display purposes.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


_SentimentLabel = Literal["positive", "negative", "neutral", "mixed"]


class SentimentResponse(BaseModel):
    """Full sentiment analysis result for a social mention."""

    model_config = ConfigDict(from_attributes=True)

    sentiment_id: int
    mention_id: int

    # Decimal → float (Pydantic coerces automatically)
    vader_compound: Optional[float] = None
    vader_pos: Optional[float] = None
    vader_neu: Optional[float] = None
    vader_neg: Optional[float] = None

    textblob_polarity: Optional[float] = None
    textblob_subjectivity: Optional[float] = None

    final_sentiment_score: float
    sentiment_label: _SentimentLabel
    confidence_score: Optional[float] = None

    analysis_method: str
    analyzed_at: datetime
