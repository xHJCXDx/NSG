# Workflow OSINT de NSG

Documentación técnica del workflow n8n definido en `workflow.json` y del esquema PostgreSQL definido en `init.sql`.

## Objetivo

El workflow **NSG** recolecta menciones públicas de seguridad, elimina duplicados, analiza sentimiento, clasifica amenazas, persiste resultados, genera alertas para severidad alta/crítica y registra métricas de ejecución.

## Flujo general

```text
Schedule / Webhook manual
  ├─ Hacker News API Search ─ Parse Items ─┐
  ├─ Fetch Exploit-DB RSS ─ Parse RSS Items ├─ Merge ─ Deduplicate
  └─ Fetch GitHub Security Issues ─ Parse GitHub Issues ┘
       ↓
Prep Existing Check → Check Existing IDs → Filter Already Processed → Has New Items?
       ├─ no → Prep Log No Items → Log Execution (No Items)
       └─ yes → Sentiment Analysis → Classify Threat
                ↓
          Prep Mention Insert → Insert Social Mention
                ↓
          Enrich Mention + Prep Sentiment → Insert Sentiment Analysis
                ↓
          Enrich Sentiment + Prep Threat → Insert Threat Detection
                ↓
          Enrich After Threat ─┬─ IF Critical or High → Aggregate Alerts → Build Alert Content
                               │                         ├─ Send Slack Alert
                               │                         └─ Send Gmail Alert
                               │
                               ├─ IF Critical or High → Prep Alert Insert → Log Alert in DB
                               └─ Prep Log Execution → Log Execution
```

## Documentos

- `01-ingestion.md`: fuentes, parseo, normalización y deduplicación.
- `02-analysis.md`: análisis de sentimiento, clasificación y scoring.
- `03-storage.md`: patrón Prep → Insert → Enrich, upserts y conflictos.
- `04-alerting.md`: lógica de alertas, templates y canales.
- `05-logging.md`: logs de ejecución, contadores y métricas derivadas.
- `06-data-model.md`: tablas, relaciones, campos clave y vistas materializadas.
- `mejoras-propuestas.md`: mejoras prácticas priorizadas.

## Fuente de verdad

- `workflow.json`: nodos n8n, conexiones, URLs, templates y código JavaScript.
- `init.sql`: tablas, constraints, índices, triggers y vistas materializadas.
- `backend/models/*`: contratos ORM usados por la API.
- `backend/routers/metrics.py`: consumo backend de `top_keywords_stats` y `workflow_performance_stats`.
