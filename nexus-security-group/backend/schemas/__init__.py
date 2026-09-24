"""Schemas package — re-exports all Pydantic v2 schemas.

Import any schema directly from `schemas`:
    from schemas import AlertResponse, KeywordCreate
"""
from schemas.activity import UserActivityResponse
from schemas.alert import AlertResponse
from schemas.auth import Token, TokenData
from schemas.keyword import KeywordCreate, KeywordResponse, KeywordUpdate
from schemas.log import ExecutionLogResponse
from schemas.mention import MentionDetail, MentionListItem
from schemas.metrics import (
    MetricsSummaryEndpointResponse,
    RecentMentionResponse,
)
from schemas.dashboard import DashboardSummaryResponse
from schemas.permission import PermissionMatrixResponse, PermissionResponse, RolePermissionsResponse, RolePermissionsUpdate
from schemas.user import UserCreate, UserResponse, UserUpdate
from schemas.sentiment import SentimentResponse
from schemas.threat import (
    RelatedMentionResponse,
    ThreatDetail,
    ThreatListItem,
    ThreatListResponse,
    ThreatReviewRequest,
)

__all__ = [
    # auth
    "Token",
    "TokenData",
    # metrics
    "MetricsSummaryEndpointResponse",
    "RecentMentionResponse",
    # mention
    "MentionListItem",
    "MentionDetail",
    # sentiment
    "SentimentResponse",
    # threat
    "RelatedMentionResponse",
    "ThreatListItem",
    "ThreatListResponse",
    "ThreatDetail",
    "ThreatReviewRequest",
    # alert
    "AlertResponse",
    # keyword
    "KeywordResponse",
    "KeywordCreate",
    "KeywordUpdate",
    # log
    "ExecutionLogResponse",
    # activity
    "UserActivityResponse",
    # user
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    # permission
    "PermissionResponse",
    "PermissionMatrixResponse",
    "RolePermissionsUpdate",
    "RolePermissionsResponse",
    # dashboard
    "DashboardSummaryResponse",
]
