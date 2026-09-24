"""SQLAlchemy ORM models for the NSG backend.

Import order follows FK dependency chain so that Base.metadata is fully
populated by the time any model is first referenced:

    social_mentions, keywords_monitor, execution_logs  (no FK deps)
        → sentiment_analysis      (FK: social_mentions)
            → threat_detections   (FK: social_mentions, sentiment_analysis)
    permissions, system_users (identity/catalog tables, no FK deps)
        → role_permissions (FK: permissions; maps system_users.role by name)
        → alerts          (FK: threat_detections)
                    → user_activity (FK: social_mentions, threat_detections, alerts)

Trigger-maintained columns:
    - social_mentions.last_updated       → update_social_mentions_last_updated trigger
    - threat_detections.last_updated     → update_threat_detections_last_updated trigger
    - alerts.last_updated                → update_alerts_last_updated trigger
    - execution_logs.duration_seconds    → trigger_calculate_duration trigger
    - keywords_monitor.match_count/last_match_at → trigger_update_keyword_match trigger
    - system_users.updated_at            → update_system_users_updated_at trigger
    - permissions.updated_at             → update_permissions_updated_at trigger

After any UPDATE (or INSERT for execution_logs) that modifies trigger-owned columns,
call db.refresh(obj) to retrieve the server-side values.
"""

from models.social_mention import SocialMention
from models.keyword_monitor import KeywordMonitor
from models.execution_log import ExecutionLog
from models.permission import Permission, RolePermission
from models.system_user import SystemUser
from models.sentiment_analysis import SentimentAnalysis
from models.threat_detection import ThreatDetection
from models.alert import Alert
from models.user_activity import UserActivity

__all__ = [
    "SocialMention",
    "KeywordMonitor",
    "ExecutionLog",
    "Permission",
    "RolePermission",
    "SystemUser",
    "SentimentAnalysis",
    "ThreatDetection",
    "Alert",
    "UserActivity",
]
