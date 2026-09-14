# Appsmith n8n Trigger Contracts

## Preferred action: `TriggerOsintScanViaApi`

Use the existing FastAPI proxy because it enforces backend authentication and the `workflows:execute` permission before forwarding to n8n.

- Method: `POST`
- URL from Appsmith on `nexus-net`: `http://dashboard-api:8000/api/n8n/webhook/osint-trigger`
- URL from a browser-routed local demo: `http://localhost/api/n8n/webhook/osint-trigger`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <APPSMITH_API_BEARER_TOKEN>`
- Body:

```json
{
  "source": "appsmith",
  "requested_by": "<operator>",
  "mode": "manual-demo"
}
```

Expected success response:

```json
{
  "status": "accepted",
  "execution_id": "<n8n-execution-id>",
  "message": "Manual OSINT scan triggered"
}
```

Expected error shapes:

```json
{ "detail": "Missing or invalid bearer token" }
```

```json
{ "detail": "n8n workflow service unavailable" }
```

The n8n workflow owns the final response payload; Appsmith should display a generic success notification for any 2xx response and an error notification for 4xx/5xx responses.

## Controlled fallback action: `TriggerOsintScanDirectN8n`

Use this only for a controlled local demo when the backend token flow is not configured. This is lower security because the request bypasses backend permissions.

- Method: `POST`
- URL from Appsmith on `nexus-net`: `http://n8n:5678/webhook/osint-trigger`
- URL from host machine: `http://localhost:5678/webhook/osint-trigger`
- Headers:
  - `Content-Type: application/json`
  - `<N8N_WEBHOOK_HEADER>: <N8N_WEBHOOK_TOKEN>` when the workflow is configured to validate one
- Body: same payload as the preferred action.

Fallback tradeoff: Appsmith widget visibility is not a security control. If this path is used, protect n8n with its own credentials/token and keep the action visible only to demo admins.

## Appsmith action behavior

- `TriggerOsintScanViaApi.run()` is bound to the admin manual scan button.
- On success: show `Manual scan triggered` and refresh `WorkflowHealth_ByDay`, `Dashboard_KPIs`, and recent tables after the workflow has had time to persist results.
- On failure: show the backend/n8n error body and do not retry automatically.
