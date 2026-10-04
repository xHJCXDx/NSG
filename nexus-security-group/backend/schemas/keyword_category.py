"""Keyword category schemas -- KeywordCategoryResponse, KeywordCategoryCreate."""
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, StringConstraints


CategoryName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
CategoryDescription = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]


class KeywordCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    name: CategoryName
    description: Optional[CategoryDescription] = None
    created_at: Optional[datetime] = None


class KeywordCategoryCreate(BaseModel):
    name: CategoryName
    description: Optional[CategoryDescription] = None
