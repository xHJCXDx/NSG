# 05 — Logging y métricas operativas

## Logs de ejecución

La tabla `execution_logs` registra:

- `workflow_name` y `execution_id`.
- `status`: `success`, `partial_success`, `error`, `warning`, `timeout`.
- Contadores: `mentions_collected`, `mentions_processed`, `detections_generated`, `alerts_generated`.
- Tiempos: `started_at`, `completed_at`, `duration_seconds`.

`duration_seconds` se calcula por trigger (`trigger_calculate_duration`) cuando existe `completed_at`.

## Nodos de logging

- `Prep Log Execution`: calcula contadores usando nodos passthrough (`Deduplicate`, `Enrich Mention + Prep Sentiment`, `Enrich Sentiment + Prep Threat`, `Enrich After Threat`).
- `Log Execution`: inserta el log de corridas con items nuevos.
- `Prep Log No Items`: registra corridas exitosas sin items nuevos.
- `Log Execution (No Items)`: inserta el log de corridas vacías.

## Vista de salud del workflow

`workflow_performance_stats` agrupa últimos 30 días por `workflow_name` y fecha:

- `execution_count`.
- `success_count`.
- `error_count`.
- `avg_duration_seconds`.
- `avg_mentions_processed`.
- `avg_detections_generated`.

El endpoint `/api/metrics/workflow-health` consume esa vista y alimenta el gráfico de Salud del Pipeline.

## Consideración operativa

Como `top_keywords_stats` y `workflow_performance_stats` son vistas materializadas, los dashboards dependen de que se ejecute `refresh_all_materialized_views()` o un mecanismo equivalente de refresco.
