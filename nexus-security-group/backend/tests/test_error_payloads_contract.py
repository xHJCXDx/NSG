import ast
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from routers import alerts, keywords, n8n


BACKEND_DIR = Path(__file__).parent.parent

EXPECTED_ERROR_STATUS_BY_FILE = {
    "auth.py": {
        "status.HTTP_401_UNAUTHORIZED",
        "status.HTTP_403_FORBIDDEN",
        "status.HTTP_503_SERVICE_UNAVAILABLE",
    },
    "routers/activity.py": {"status.HTTP_404_NOT_FOUND"},
    "routers/alerts.py": {"status.HTTP_404_NOT_FOUND"},
    "routers/keywords.py": {
        "status.HTTP_404_NOT_FOUND",
        "status.HTTP_409_CONFLICT",
    },
    "routers/logs.py": {"status.HTTP_404_NOT_FOUND"},
    "routers/n8n.py": {"status.HTTP_502_BAD_GATEWAY"},
    "routers/threats.py": {"status.HTTP_404_NOT_FOUND"},
    "routers/users.py": {
        "status.HTTP_404_NOT_FOUND",
        "status.HTTP_409_CONFLICT",
    },
}


class MissingRowQuery:
    def filter(self, *args):
        return self

    def first(self):
        return None


class MissingRowDb:
    def query(self, *args):
        return MissingRowQuery()


class CommitConflictDb:
    def query(self, *args):
        return MissingRowQuery()

    def add(self, obj):
        self.added = obj

    def commit(self):
        raise IntegrityError("duplicate", params=None, orig=None)

    def rollback(self):
        self.rolled_back = True


def _http_exception_calls(source_path: Path):
    tree = ast.parse(source_path.read_text())
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if isinstance(node.func, ast.Name) and node.func.id == "HTTPException":
            yield node


def _keyword(call: ast.Call, name: str):
    return next((keyword.value for keyword in call.keywords if keyword.arg == name), None)


def test_http_exceptions_use_documented_statuses_and_string_detail_payloads():
    for relative_path, expected_statuses in EXPECTED_ERROR_STATUS_BY_FILE.items():
        source_path = BACKEND_DIR / relative_path
        observed_statuses = set()

        for call in _http_exception_calls(source_path):
            status_code = _keyword(call, "status_code")
            detail = _keyword(call, "detail")

            assert status_code is not None, f"{relative_path} has HTTPException without status_code"
            assert detail is not None, f"{relative_path} has HTTPException without detail"
            assert isinstance(detail, ast.Constant), f"{relative_path} HTTPException detail must be a string literal"
            assert isinstance(detail.value, str), f"{relative_path} HTTPException detail must serialize as a string"
            assert detail.value.strip(), f"{relative_path} HTTPException detail must not be empty"

            observed_statuses.add(ast.unparse(status_code))

        assert observed_statuses == expected_statuses


def test_not_found_errors_serialize_as_fastapi_detail_string_payload():
    app = FastAPI()
    app.include_router(alerts.router)
    app.dependency_overrides[alerts.get_current_user] = lambda: object()
    app.dependency_overrides[alerts.get_db] = lambda: MissingRowDb()

    response = TestClient(app).get("/api/alerts/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Alert not found"}


def test_conflict_errors_serialize_as_fastapi_detail_string_payload():
    app = FastAPI()
    app.include_router(keywords.router)
    app.dependency_overrides[keywords.get_current_user] = lambda: object()
    app.dependency_overrides[keywords.get_db] = lambda: CommitConflictDb()

    response = TestClient(app).post("/api/keywords", json={"keyword_text": "credential leak"})

    assert response.status_code == 409
    assert response.json() == {"detail": "Keyword already exists"}


def test_n8n_workflow_payloads_remain_intentional_passthrough_exception():
    webhook_route = next(
        route
        for route in n8n.router.routes
        if route.path == "/api/n8n/webhook/{webhook_id}" and "POST" in route.methods
    )

    assert webhook_route.response_model is None
    assert webhook_route.responses[200]["description"] == "Payload returned by the n8n workflow."
