# PLAN-010: Analytics Enhancements — Backend + Frontend

**Estado:** PENDIENTE
**Prioridad:** HIGH
**Origen:** Análisis de datos disponibles pero no expuestos. Las vistas materializadas `top_keywords_stats` y `workflow_performance_stats` no tienen endpoints. Tres endpoints de distribución no aceptan filtro temporal. El KPI `avgSentiment` usa una aproximación por conteos en vez del score real.
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`, `init.sql`, `backend/routers/metrics.py`

> **Objetivo:** Exponer datos existentes en la DB que el frontend no aprovecha, corregir el filtro temporal en los charts de distribución, y agregar dos nuevos gráficos (Top Keywords, Workflow Health).

> **Regla de implementación:** un commit por modificación, Conventional Commits. Branch: `develop`.

> **Convención de endpoints:** Todos los nuevos endpoints van en `backend/routers/metrics.py` bajo el prefijo `/api/metrics`, requieren permiso `metrics:read`, usan `response_model` con Pydantic schemas de `backend/schemas/metrics.py`.

> **Convención de frontend:** Cada nuevo gráfico sigue el patrón existente: tipo en `types.ts`, endpoint en `contract.ts`, fetch en `api.ts`, query en `hooks/useAnalytics.ts`, componente en `components/`, integración en `pages/AnalyticsPage.tsx`. Cada chart maneja sus propios estados loading/error/empty via el patrón de ChartCard.

---

## Índice de Modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|-----------|------|-------------|--------|
| M01 | CRITICAL | DB (init.sql) | Agregar UNIQUE indexes faltantes para REFRESH CONCURRENTLY | PENDIENTE |
| M02 | HIGH | Backend + Frontend | Agregar parámetro `days` a threats-by-severity, platform-distribution y threat-categories | PENDIENTE |
| M03 | HIGH | Backend + Frontend | Agregar `avg_sentiment_score` real a `/api/metrics/summary` | PENDIENTE |
| M04 | HIGH | Backend + Frontend | Nuevo endpoint `/api/metrics/top-keywords` + gráfico TopKeywordsChart | PENDIENTE |
| M05 | MEDIUM | Backend + Frontend | Nuevo endpoint `/api/metrics/workflow-health` + gráfico WorkflowHealthChart | PENDIENTE |

---

## M01 — UNIQUE indexes para REFRESH CONCURRENTLY

**Prioridad:** CRITICAL
**Área:** `init.sql`
**Estado:** PENDIENTE

### Problema

`refresh_all_materialized_views()` usa `REFRESH MATERIALIZED VIEW CONCURRENTLY` para las tres vistas materializadas. PostgreSQL requiere un índice UNIQUE para soportar `CONCURRENTLY`. `daily_mention_stats` tiene uno, pero `top_keywords_stats` y `workflow_performance_stats` no — solo tienen índices comunes. Resultado: el refresh falla en runtime con:

```
ERROR: cannot refresh materialized view concurrently without a unique index
```

Esto significa que los datos de estas dos vistas nunca se refrescan después del primer `CREATE`. Es un bug latente desde la creación del schema.

### Solución

Reemplazar los índices existentes por UNIQUE indexes usando las columnas de GROUP BY (que son naturalmente únicas):

```sql
-- top_keywords_stats: keyword es el GROUP BY key → ya es único
-- Reemplazar línea ~402:
DROP INDEX IF EXISTS top_keywords_stats_detection_count_idx;
CREATE UNIQUE INDEX ON top_keywords_stats (keyword);

-- workflow_performance_stats: (workflow_name, date) son los GROUP BY keys → ya son únicos
-- Reemplazar línea ~418:
DROP INDEX IF EXISTS workflow_performance_stats_workflow_name_date_idx;
CREATE UNIQUE INDEX ON workflow_performance_stats (workflow_name, date);
```

**Nota:** Como estos son CREATE INDEX (no ALTER), y el `init.sql` se ejecuta solo en la primera inicialización, hay que cambiar directamente las sentencias existentes. En ambientes con DB ya inicializada, los DROPs + CREATEs necesitan correrse manualmente o via migration.

### Verificación

Después del cambio, ejecutar `SELECT refresh_all_materialized_views();` en la DB. Debe completar sin errores.

### Archivos afectados

- `init.sql` — líneas ~402 y ~418 (reemplazar `CREATE INDEX` por `CREATE UNIQUE INDEX`)

---

## M02 — Filtro `days` en endpoints de distribución

**Prioridad:** HIGH
**Área:** `backend/routers/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Problema

Los endpoints `/api/metrics/threats-by-severity`, `/api/metrics/platform-distribution` y `/api/metrics/threat-categories` no aceptan parámetro `days`. El frontend tiene un time range picker (7, 30, 90 días) que solo afecta a `mentions-over-time` y `sentiment-over-time`. Los tres charts de distribución siempre muestran datos all-time, lo cual es inconsistente con el selector.

### Solución — Backend

Agregar `days: Annotated[int, Query(ge=1, le=365)] = 30` a los tres endpoints, siguiendo el patrón de `get_mentions_over_time()`:

**`get_threats_by_severity()`:**
```python
@router.get("/threats-by-severity", response_model=list[CategoryCount])
def get_threats_by_severity(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(
            ThreatDetection.criticality_level.label("label"),
            func.count().label("count"),
        )
        .filter(ThreatDetection.detected_at >= since)
        .group_by(ThreatDetection.criticality_level)
        .order_by(func.count().desc())
        .all()
    )
    return [CategoryCount(label=row.label, count=row.count) for row in rows]
```

**`get_platform_distribution()`:**
```python
@router.get("/platform-distribution", response_model=list[CategoryCount])
def get_platform_distribution(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(
            SocialMention.platform.label("label"),
            func.count().label("count"),
        )
        .filter(SocialMention.created_at >= since)
        .group_by(SocialMention.platform)
        .order_by(func.count().desc())
        .all()
    )
    return [CategoryCount(label=row.label, count=row.count) for row in rows]
```

**`get_threat_categories()`:**
```python
@router.get("/threat-categories", response_model=list[CategoryCount])
def get_threat_categories(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(
            func.coalesce(ThreatDetection.threat_category, "uncategorized").label("label"),
            func.count().label("count"),
        )
        .filter(ThreatDetection.detected_at >= since)
        .group_by(ThreatDetection.threat_category)
        .order_by(func.count().desc())
        .all()
    )
    return [CategoryCount(label=row.label, count=row.count) for row in rows]
```

### Solución — Frontend

**`api.ts`** — Agregar `days` a las 3 fetch functions:

```typescript
export async function fetchThreatsBySeverity(token: string | null, days = 30): Promise<CategoryCount[]> {
  const res = await authFetch(token, `${THREATS_BY_SEVERITY_ENDPOINT}?days=${days}`);
  // ...
}

export async function fetchPlatformDistribution(token: string | null, days = 30): Promise<CategoryCount[]> {
  const res = await authFetch(token, `${PLATFORM_DISTRIBUTION_ENDPOINT}?days=${days}`);
  // ...
}

export async function fetchThreatCategories(token: string | null, days = 30): Promise<CategoryCount[]> {
  const res = await authFetch(token, `${THREAT_CATEGORIES_ENDPOINT}?days=${days}`);
  // ...
}
```

**`hooks/useAnalytics.ts`** — Pasar `days` a las calls y a los query keys:

```typescript
const threatsBySeverity = useQuery({
  queryKey: ['analytics', 'threats-by-severity', days, sub],
  queryFn: () => fetchThreatsBySeverity(token, days),
  enabled: !!token,
});

const platformDistribution = useQuery({
  queryKey: ['analytics', 'platform-distribution', days, sub],
  queryFn: () => fetchPlatformDistribution(token, days),
  enabled: !!token,
});

const threatCategories = useQuery({
  queryKey: ['analytics', 'threat-categories', days, sub],
  queryFn: () => fetchThreatCategories(token, days),
  enabled: !!token,
});
```

### Verificación

1. Cambiar time range a 7 días → los charts de distribución deben mostrar datos diferentes que con 90 días
2. Con DB vacía o sin datos recientes → los charts muestran "No data" correctamente

### Archivos afectados

- `backend/routers/metrics.py` — 3 funciones: `get_threats_by_severity`, `get_platform_distribution`, `get_threat_categories`
- `frontend/src/features/metrics/api.ts` — 3 funciones: `fetchThreatsBySeverity`, `fetchPlatformDistribution`, `fetchThreatCategories`
- `frontend/src/features/metrics/hooks/useAnalytics.ts` — 3 queries: agregar `days` a queryKey y queryFn

---

## M03 — Avg Sentiment Score real en summary

**Prioridad:** HIGH
**Área:** `backend/routers/metrics.py`, `backend/schemas/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Problema

El KPI "Avg. Sentiment" en el frontend calcula una aproximación basada en conteos:

```typescript
const score = ((dist.positive ?? 0) - (dist.negative ?? 0)) / total;
```

Esto es un proxy burdo: `(+1 × positive_count - 1 × negative_count) / total`. El backend tiene `sentiment_analysis.final_sentiment_score` (float -1.0 a 1.0 por item), que es el score real del análisis de sentimiento. Un `AVG()` de esa columna daría el promedio real.

### Solución — Backend

**`backend/schemas/metrics.py`** — Agregar campo al response:

```python
class MetricsSummaryEndpointResponse(BaseModel):
    """Current /api/metrics/summary response consumed by the frontend."""
    model_config = ConfigDict(from_attributes=True)

    total_mentions: int
    sentiment_distribution: dict[str, int]
    alerts_count: int
    avg_sentiment_score: float | None = None  # nuevo
```

**`backend/routers/metrics.py`** — Calcular el promedio en `get_metrics_summary()`:

```python
# Avg sentiment score (real score, not count-based proxy)
avg_sentiment = (
    db.query(func.avg(SentimentAnalysis.final_sentiment_score))
    .filter(SentimentAnalysis.final_sentiment_score.isnot(None))
    .scalar()
)

return {
    "total_mentions": total_mentions,
    "sentiment_distribution": sentiment_dist,
    "alerts_count": alerts_count,
    "avg_sentiment_score": round(float(avg_sentiment), 4) if avg_sentiment is not None else None,
}
```

### Solución — Frontend

**`frontend/src/features/metrics/types.ts`:**

```typescript
export interface MetricsSummary {
  total_mentions: number;
  sentiment_distribution: Record<string, number>;
  alerts_count: number;
  avg_sentiment_score: number | null;  // nuevo
}
```

**`frontend/src/features/metrics/components/AnalyticsKpiRow.tsx`:**

Reemplazar el cálculo hacky por el valor real del backend:

```typescript
const avgSentiment = summary?.avg_sentiment_score != null
  ? summary.avg_sentiment_score.toFixed(2)
  : '0.00';
```

Eliminar toda la IIFE que calcula desde `sentiment_distribution`.

### Verificación

1. El KPI debe mostrar un valor entre -1.00 y 1.00
2. Con DB sin datos de sentiment → debe mostrar "0.00" (fallback)
3. El valor debe diferir del cálculo anterior basado en conteos (confirma que usa el score real)

### Archivos afectados

- `backend/schemas/metrics.py` — `MetricsSummaryEndpointResponse`: agregar `avg_sentiment_score`
- `backend/routers/metrics.py` — `get_metrics_summary()`: agregar query AVG
- `frontend/src/features/metrics/types.ts` — `MetricsSummary`: agregar `avg_sentiment_score`
- `frontend/src/features/metrics/components/AnalyticsKpiRow.tsx` — simplificar cálculo

---

## M04 — Top Keywords: endpoint + gráfico

**Prioridad:** HIGH
**Área:** `backend/routers/metrics.py`, `backend/schemas/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Contexto

La vista materializada `top_keywords_stats` tiene datos de los últimos 30 días:

```sql
keyword | detection_count | days_active | avg_confidence | high_severity_count | last_detection
```

Estos datos no están expuestos por ningún endpoint. Para un analista OSINT, saber qué keywords generan más detecciones es fundamental para ajustar el monitoreo.

### Solución — Backend

**`backend/schemas/metrics.py`** — Nuevo schema:

```python
class TopKeywordEntry(BaseModel):
    """Keyword analytics from the top_keywords_stats materialized view."""
    model_config = ConfigDict(from_attributes=True)

    keyword: str
    detection_count: int
    days_active: int
    avg_confidence: float
    high_severity_count: int
    last_detection: datetime | None = None
```

**`backend/routers/metrics.py`** — Nuevo endpoint:

```python
from sqlalchemy import text

@router.get("/top-keywords", response_model=list[TopKeywordEntry])
def get_top_keywords(
    db: Session = Depends(get_db),
    limit: Annotated[int, Query(ge=1, le=50)] = 15,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    rows = db.execute(
        text("""
            SELECT keyword, detection_count, days_active,
                   avg_confidence, high_severity_count, last_detection
            FROM top_keywords_stats
            ORDER BY detection_count DESC
            LIMIT :lim
        """),
        {"lim": limit},
    ).fetchall()
    return [
        TopKeywordEntry(
            keyword=row.keyword,
            detection_count=row.detection_count,
            days_active=row.days_active,
            avg_confidence=round(float(row.avg_confidence or 0), 3),
            high_severity_count=row.high_severity_count,
            last_detection=row.last_detection,
        )
        for row in rows
    ]
```

**Nota:** Se usa `text()` raw SQL porque la vista materializada no tiene un modelo SQLAlchemy ORM. Alternativa: crear un modelo mapped con `__table__ = Table('top_keywords_stats', ...)`, pero es innecesario para un read-only view.

### Solución — Frontend

**`frontend/src/features/metrics/types.ts`:**

```typescript
export interface TopKeywordEntry {
  keyword: string;
  detection_count: number;
  days_active: number;
  avg_confidence: number;
  high_severity_count: number;
  last_detection: string | null;
}
```

**`frontend/src/features/metrics/contract.ts`:**

```typescript
export const TOP_KEYWORDS_ENDPOINT = '/api/metrics/top-keywords';
```

**`frontend/src/features/metrics/api.ts`:**

```typescript
export async function fetchTopKeywords(token: string | null, limit = 15): Promise<TopKeywordEntry[]> {
  const res = await authFetch(token, `${TOP_KEYWORDS_ENDPOINT}?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch top keywords: ${res.status}`);
  return res.json() as Promise<TopKeywordEntry[]>;
}
```

**`frontend/src/features/metrics/hooks/useAnalytics.ts`:**

```typescript
const topKeywords = useQuery({
  queryKey: ['analytics', 'top-keywords', sub],
  queryFn: () => fetchTopKeywords(token),
  enabled: !!token,
});
```

Agregar al return: `topKeywords`, `topKeywordsLoading`, `topKeywordsError`.

**`frontend/src/features/metrics/components/TopKeywordsChart.tsx`:**

Nuevo componente. Gráfico de barras horizontales (como ThreatsBySeverity):
- Y axis: keyword name
- X axis: detection_count
- Color: gradient por severidad (barras con proporción de `high_severity_count` vs total)
- Tooltip: muestra `days_active`, `avg_confidence`, `high_severity_count`

Diseño: barras horizontales con un esquema de color que indique proporción de high+critical detections. Barra principal en `#0ea5e9` (sky), con segmento overlaid en `#ef4444` (red) para high_severity_count.

**`frontend/src/features/metrics/pages/AnalyticsPage.tsx`:**

Agregar `TopKeywordsChart` debajo de las dos grids existentes, en una sección de ancho completo (como MentionsOverTime).

**Traducciones** — agregar keys:

```
EN: analytics.charts.topKeywords: 'Top Keywords (Last 30 Days)'
ES: analytics.charts.topKeywords: 'Top Keywords (Últimos 30 Días)'
```

### Verificación

1. El chart muestra keywords ordenadas por detection_count descendente
2. Con vista vacía (sin detections recientes) → muestra "No data"
3. El tooltip muestra datos enriquecidos (days_active, confidence)

### Archivos afectados

- `backend/schemas/metrics.py` — nuevo schema `TopKeywordEntry`
- `backend/routers/metrics.py` — nuevo endpoint `/top-keywords`
- `frontend/src/features/metrics/types.ts` — nuevo tipo `TopKeywordEntry`
- `frontend/src/features/metrics/contract.ts` — nuevo `TOP_KEYWORDS_ENDPOINT`
- `frontend/src/features/metrics/api.ts` — nuevo `fetchTopKeywords`
- `frontend/src/features/metrics/hooks/useAnalytics.ts` — nuevo query `topKeywords`
- `frontend/src/features/metrics/components/TopKeywordsChart.tsx` — nuevo componente
- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — integrar chart
- `frontend/src/shared/i18n/translations.ts` — nuevas keys

---

## M05 — Workflow Health: endpoint + gráfico

**Prioridad:** MEDIUM
**Área:** `backend/routers/metrics.py`, `backend/schemas/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Contexto

La vista materializada `workflow_performance_stats` tiene datos de los últimos 30 días:

```sql
workflow_name | date | execution_count | success_count | error_count | avg_duration_seconds | avg_mentions_processed | avg_detections_generated
```

No hay endpoint que la exponga. Para el operador del sistema, ver si el pipeline n8n está sano o fallando es información crítica.

### Solución — Backend

**`backend/schemas/metrics.py`** — Nuevo schema:

```python
class WorkflowHealthEntry(BaseModel):
    """Daily workflow execution stats from workflow_performance_stats."""
    model_config = ConfigDict(from_attributes=True)

    date: str
    execution_count: int
    success_count: int
    error_count: int
    avg_duration_seconds: float | None = None
    avg_mentions_processed: float | None = None
    avg_detections_generated: float | None = None
```

**`backend/routers/metrics.py`** — Nuevo endpoint:

```python
@router.get("/workflow-health", response_model=list[WorkflowHealthEntry])
def get_workflow_health(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=90)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    rows = db.execute(
        text("""
            SELECT date, execution_count, success_count, error_count,
                   avg_duration_seconds, avg_mentions_processed,
                   avg_detections_generated
            FROM workflow_performance_stats
            WHERE date >= CURRENT_DATE - :days * INTERVAL '1 day'
            ORDER BY date
        """),
        {"days": days},
    ).fetchall()
    return [
        WorkflowHealthEntry(
            date=str(row.date),
            execution_count=row.execution_count,
            success_count=row.success_count,
            error_count=row.error_count,
            avg_duration_seconds=round(float(row.avg_duration_seconds or 0), 1),
            avg_mentions_processed=round(float(row.avg_mentions_processed or 0), 1),
            avg_detections_generated=round(float(row.avg_detections_generated or 0), 1),
        )
        for row in rows
    ]
```

**Nota:** La vista agrupa por `workflow_name`, pero actualmente solo hay un workflow ("OSINT Pipeline"). Si en el futuro hay varios, habrá que agregar un filtro por `workflow_name`. Para ahora, la query devuelve datos agregados por fecha que incluyen todos los workflows. Si hay más de uno, las filas se duplican por fecha — podríamos agregar un `GROUP BY date` con SUMs, pero por ahora con un solo workflow no es necesario.

### Solución — Frontend

**`frontend/src/features/metrics/types.ts`:**

```typescript
export interface WorkflowHealthEntry {
  date: string;
  execution_count: number;
  success_count: number;
  error_count: number;
  avg_duration_seconds: number | null;
  avg_mentions_processed: number | null;
  avg_detections_generated: number | null;
}
```

**`frontend/src/features/metrics/contract.ts`:**

```typescript
export const WORKFLOW_HEALTH_ENDPOINT = '/api/metrics/workflow-health';
```

**`frontend/src/features/metrics/api.ts`:**

```typescript
export async function fetchWorkflowHealth(token: string | null, days = 30): Promise<WorkflowHealthEntry[]> {
  const res = await authFetch(token, `${WORKFLOW_HEALTH_ENDPOINT}?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch workflow health: ${res.status}`);
  return res.json() as Promise<WorkflowHealthEntry[]>;
}
```

**`frontend/src/features/metrics/hooks/useAnalytics.ts`:**

```typescript
const workflowHealth = useQuery({
  queryKey: ['analytics', 'workflow-health', days, sub],
  queryFn: () => fetchWorkflowHealth(token, days),
  enabled: !!token,
});
```

Agregar al return: `workflowHealth`, `workflowHealthLoading`, `workflowHealthError`.

**`frontend/src/features/metrics/components/WorkflowHealthChart.tsx`:**

Nuevo componente. Gráfico de área apilada (como SentimentTrend):
- X axis: date
- Areas apiladas: `success_count` (verde `#22c55e`) y `error_count` (rojo `#ef4444`)
- Tooltip: muestra `execution_count`, `success_count`, `error_count`, `avg_duration_seconds`
- Fallback visual: si no hay errores, solo se ve el área verde

**`frontend/src/features/metrics/pages/AnalyticsPage.tsx`:**

Agregar `WorkflowHealthChart` al lado de `TopKeywordsChart` en una nueva row de 2 columnas:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <TopKeywordsChart ... />
  <WorkflowHealthChart ... />
</div>
```

**Traducciones:**

```
EN: analytics.charts.workflowHealth: 'Pipeline Health'
ES: analytics.charts.workflowHealth: 'Salud del Pipeline'
```

### Verificación

1. Con ejecuciones recientes → muestra barras verdes (success) con rojo (errors) apilado
2. Sin datos → "No data"
3. El time range picker afecta este chart (pasar `days`)

### Archivos afectados

- `backend/schemas/metrics.py` — nuevo schema `WorkflowHealthEntry`
- `backend/routers/metrics.py` — nuevo endpoint `/workflow-health`
- `frontend/src/features/metrics/types.ts` — nuevo tipo `WorkflowHealthEntry`
- `frontend/src/features/metrics/contract.ts` — nuevo `WORKFLOW_HEALTH_ENDPOINT`
- `frontend/src/features/metrics/api.ts` — nuevo `fetchWorkflowHealth`
- `frontend/src/features/metrics/hooks/useAnalytics.ts` — nuevo query `workflowHealth`
- `frontend/src/features/metrics/components/WorkflowHealthChart.tsx` — nuevo componente
- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — integrar chart
- `frontend/src/shared/i18n/translations.ts` — nuevas keys

---

## Orden de Ejecución Recomendado

```
M01 (UNIQUE indexes — prerequisito para que los datos se refresquen)
  → M02 (days filter — no depende de M01, pero afecta cómo se ven los datos)
  → M03 (avg sentiment — independiente, toca summary endpoint)
  → M04 (top keywords — depende de M01 para tener datos frescos)
  → M05 (workflow health — depende de M01 para tener datos frescos)
```

M01 es prerequisito real de M04 y M05 porque sin UNIQUE indexes, `REFRESH CONCURRENTLY` falla y las vistas quedan con datos stale. M02 y M03 son independientes entre sí y de M01. M04 y M05 son independientes entre sí.

**Commits sugeridos:**

1. `fix(db): add unique indexes for concurrent materialized view refresh` (M01)
2. `feat(backend): add days filter to distribution endpoints` (M02 backend)
3. `feat(frontend): wire days param to distribution charts` (M02 frontend)
4. `feat: add real avg sentiment score to metrics summary` (M03 backend+frontend)
5. `feat: add top keywords endpoint and chart` (M04)
6. `feat: add workflow health endpoint and chart` (M05)

---

## Notas Arquitecturales

### ¿Por qué raw SQL para las vistas materializadas?

Las vistas materializadas no tienen modelos ORM en SQLAlchemy. Crear un `Table()` mapped solo para hacer SELECT es overhead innecesario. `text()` con `db.execute()` es el patrón estándar de SQLAlchemy para read-only views. Los parámetros se pasan via `:named_param` para evitar SQL injection.

### ¿Por qué no filtrar top_keywords por `days`?

La vista `top_keywords_stats` ya filtra internamente a los últimos 30 días (`WHERE td.detected_at >= CURRENT_DATE - INTERVAL '30 days'`). Agregar un filtro `days` al endpoint requeriría recrear la vista con un parámetro dinámico (imposible en materialized views) o hacer la query directamente sobre las tablas base (más lento). El compromiso aceptable es: los datos son siempre de los últimos 30 días, refrescados por `refresh_all_materialized_views()`.

### Impacto en Appsmith

Los cambios de M01 (UNIQUE indexes) benefician a Appsmith indirectamente porque los `REFRESH CONCURRENTLY` empezarán a funcionar. No se requieren cambios en Appsmith.

---
