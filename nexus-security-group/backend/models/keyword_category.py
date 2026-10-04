from sqlalchemy import Column, DateTime, Integer, String, Text, func

from database import Base


class KeywordCategoryModel(Base):
    """Reference table for keyword categories managed by administrators."""

    __tablename__ = "keyword_categories"

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
