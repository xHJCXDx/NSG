import ast
from pathlib import Path


BACKEND_ROOT = Path(__file__).parent.parent
APPLICATION_FILES = (
    *sorted((BACKEND_ROOT / "routers").glob("*.py")),
    BACKEND_ROOT / "auth.py",
    BACKEND_ROOT / "database.py",
    BACKEND_ROOT / "main.py",
)
RAW_SQL_KEYWORDS = (
    "select ",
    "insert ",
    "update ",
    "delete ",
    "create table",
    "alter table",
    "drop table",
)


def _string_literals(tree: ast.AST):
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            yield node


def test_backend_application_code_uses_orm_instead_of_raw_sql_queries():
    """Routers/auth/db wiring must not embed avoidable raw SQL queries.

    DDL-oriented model defaults are covered by ORM model tests and intentionally
    live outside this contract; API/query code should use SQLAlchemy models.
    """
    findings = []

    for path in APPLICATION_FILES:
        source = path.read_text()
        tree = ast.parse(source, filename=str(path))

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                function = node.func
                if isinstance(function, ast.Attribute) and function.attr == "execute":
                    findings.append(
                        f"{path.relative_to(BACKEND_ROOT)}:{node.lineno} uses .execute()"
                    )
                if isinstance(function, ast.Name) and function.id == "text":
                    findings.append(f"{path.relative_to(BACKEND_ROOT)}:{node.lineno} uses text()")

        for node in _string_literals(tree):
            normalized = " ".join(node.value.lower().split())
            if any(keyword in f"{normalized} " for keyword in RAW_SQL_KEYWORDS):
                findings.append(
                    f"{path.relative_to(BACKEND_ROOT)}:{node.lineno} embeds SQL text"
                )

    assert findings == []
