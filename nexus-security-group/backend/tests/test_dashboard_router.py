import sys
import types

from fastapi import APIRouter

auth_stub = types.ModuleType("auth")
auth_stub.get_current_user = lambda: None
auth_stub.router = APIRouter(prefix="/api/auth", tags=["auth"])
sys.modules.setdefault("auth", auth_stub)

from main import app
from routers.dashboard import get_dashboard_summary
from schemas.dashboard import DashboardSummaryResponse


class FakeQuery:
    def __init__(self, count_result=None):
        self.count_result = count_result
        self.filter_args = []

    def filter(self, *args):
        self.filter_args.append(args)
        return self

    def count(self):
        return self.count_result


class FakeDb:
    def __init__(self, queries):
        self.queries = queries
        self.query_args = []

    def query(self, *args):
        self.query_args.append(args)
        return self.queries.pop(0)


def test_main_registers_api_dashboard_summary_route():
    route_paths = {route.path for route in app.routes}
    route_methods_by_path = {
        route.path: route.methods for route in app.routes if hasattr(route, "methods")
    }

    assert "/api/dashboard/summary" in route_paths
    assert "GET" in route_methods_by_path["/api/dashboard/summary"]


def test_dashboard_summary_counts_existing_domain_models():
    pending_threats_query = FakeQuery(count_result=3)
    unacknowledged_alerts_query = FakeQuery(count_result=5)
    active_keywords_query = FakeQuery(count_result=8)
    fake_db = FakeDb(
        [
            FakeQuery(count_result=12),
            pending_threats_query,
            FakeQuery(count_result=7),
            unacknowledged_alerts_query,
            active_keywords_query,
            FakeQuery(count_result=21),
            FakeQuery(count_result=34),
        ]
    )

    result = get_dashboard_summary(db=fake_db, current_user=object())

    assert result == {
        "total_threats": 12,
        "pending_threats": 3,
        "total_alerts": 7,
        "unacknowledged_alerts": 5,
        "active_keywords": 8,
        "execution_logs_count": 21,
        "activity_count": 34,
    }
    assert len(fake_db.query_args) == 7
    assert len(pending_threats_query.filter_args) == 1
    assert len(unacknowledged_alerts_query.filter_args) == 1
    assert len(active_keywords_query.filter_args) == 1


def test_dashboard_summary_coerces_empty_counts_to_zero():
    fake_db = FakeDb([FakeQuery(count_result=None) for _ in range(7)])

    result = get_dashboard_summary(db=fake_db, current_user=object())

    assert result == {
        "total_threats": 0,
        "pending_threats": 0,
        "total_alerts": 0,
        "unacknowledged_alerts": 0,
        "active_keywords": 0,
        "execution_logs_count": 0,
        "activity_count": 0,
    }


def test_dashboard_summary_response_schema_validates_endpoint_shape():
    response = DashboardSummaryResponse.model_validate(
        {
            "total_threats": 12,
            "pending_threats": 3,
            "total_alerts": 7,
            "unacknowledged_alerts": 5,
            "active_keywords": 8,
            "execution_logs_count": 21,
            "activity_count": 34,
        }
    )

    assert response.pending_threats == 3
    assert response.unacknowledged_alerts == 5
