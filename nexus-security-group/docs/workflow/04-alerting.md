# 04 — Alertas

## Condición de alerta

`IF Critical or High` evalúa `criticality_level` y dispara alertas cuando el valor es `high` o `critical`.

## Canales

- `Send Slack Alert`: POST a `={{ $env.SLACK_WEBHOOK_URL }}`.
- `Send Gmail Alert`: envío de email desde n8n.
- `Log Alert in DB`: persistencia en `alerts`.

## Construcción de contenido

- `Aggregate Alerts` agrupa candidatos de alerta.
- `Build Alert Content` genera el contenido legible que consumen Slack y Gmail.
- `Prep Alert Insert` genera el registro persistido con título, mensaje, severidad y canales.

## Datos persistidos

La tabla `alerts` expone:

- Identidad: `alert_id`, `alert_uuid`, `detection_id`.
- Contenido: `alert_title`, `alert_message`, `alert_severity`.
- Entrega: `channels_sent`, `slack_channel`, `sent_at`, `delivery_status`.
- Reconocimiento: `acknowledged`, `acknowledged_by`, `acknowledged_at`.

## Reconocimiento desde backend

`PATCH /api/alerts/{alert_id}/acknowledge` marca la alerta como reconocida y, si la amenaza asociada sigue `pending`, actualiza la amenaza a `reviewing` con `reviewed_by` y `reviewed_at`.

La lista de amenazas ahora expone un resumen real de alerta asociado cuando existe. Si una amenaza no tiene alerta persistida, la UI no inventa IDs ni estados de alerta.
