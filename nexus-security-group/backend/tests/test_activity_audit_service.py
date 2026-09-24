from types import SimpleNamespace

from services.activity_audit import record_user_activity


class FakeAuditDb:
    def __init__(self, add_exception=None):
        self.added = []
        self.add_exception = add_exception

    def add(self, obj):
        if self.add_exception is not None:
            raise self.add_exception
        self.added.append(obj)


def _request(host="203.0.113.10", user_agent="pytest-agent/1.0"):
    return SimpleNamespace(
        client=SimpleNamespace(host=host),
        headers={"user-agent": user_agent},
    )


def test_record_user_activity_stages_user_activity_with_expected_fields():
    db = FakeAuditDb()

    record_user_activity(
        db,
        username="analyst",
        user_role="security",
        activity_type="acknowledge_alert",
        activity_description="Acknowledged alert #42",
        related_mention_id=10,
        related_detection_id=20,
        related_alert_id=42,
        session_id="sess-123",
        activity_data={"severity": "high"},
    )

    assert len(db.added) == 1
    activity = db.added[0]
    assert activity.username == "analyst"
    assert activity.user_role == "security"
    assert activity.activity_type == "acknowledge_alert"
    assert activity.activity_description == "Acknowledged alert #42"
    assert activity.related_mention_id == 10
    assert activity.related_detection_id == 20
    assert activity.related_alert_id == 42
    assert activity.session_id == "sess-123"
    assert activity.activity_data == {"severity": "high"}
    assert activity.ip_address is None
    assert activity.user_agent is None


def test_record_user_activity_captures_optional_request_metadata():
    db = FakeAuditDb()

    record_user_activity(
        db,
        username="admin",
        user_role="admin",
        activity_type="login_success",
        request=_request(),
    )

    activity = db.added[0]
    assert activity.ip_address == "203.0.113.10"
    assert activity.user_agent == "pytest-agent/1.0"


def test_record_user_activity_tolerates_missing_request_client():
    db = FakeAuditDb()
    request = SimpleNamespace(client=None, headers={})

    record_user_activity(
        db,
        username="admin",
        user_role=None,
        activity_type="logout",
        request=request,
    )

    activity = db.added[0]
    assert activity.ip_address is None
    assert activity.user_agent is None


def test_record_user_activity_logs_warning_and_does_not_raise_on_add_failure(caplog):
    db = FakeAuditDb(add_exception=RuntimeError("db insert failed"))

    record_user_activity(
        db,
        username="analyst",
        user_role="security",
        activity_type="update_keyword",
    )

    assert db.added == []
    assert "Failed to record user activity" in caplog.text
