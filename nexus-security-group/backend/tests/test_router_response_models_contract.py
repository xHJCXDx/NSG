from fastapi.routing import APIRoute

from routers import activity, alerts, dashboard, keywords, logs, metrics, n8n, threats, users


ROUTER_MODULES = (
    activity,
    alerts,
    dashboard,
    keywords,
    logs,
    metrics,
    n8n,
    threats,
    users,
)

INTENTIONAL_RESPONSE_MODEL_EXCLUSIONS = {
    ("/api/keywords/{keyword_id}", "DELETE"): "204 No Content: no response body to validate.",
    (
        "/api/n8n/webhook/{webhook_id}",
        "POST",
    ): "n8n passthrough: workflow-owned JSON or non-JSON payload.",
}


def test_backend_router_endpoints_declare_response_models_or_documented_exclusions():
    missing_contracts = []

    for module in ROUTER_MODULES:
        for route in module.router.routes:
            if not isinstance(route, APIRoute):
                continue

            methods = route.methods or set()
            for method in methods:
                contract_key = (route.path, method)
                if contract_key in INTENTIONAL_RESPONSE_MODEL_EXCLUSIONS:
                    continue

                if route.status_code == 204:
                    continue

                if route.response_model is None:
                    missing_contracts.append(f"{method} {route.path}")

    assert missing_contracts == []
