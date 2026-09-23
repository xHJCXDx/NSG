# PLAN-011: Analytics Data Leverage — Aprovechar datos extraídos no expuestos

**Estado:** PENDIENTE
**Prioridad:** HIGH
**Origen:** Gap analysis entre lo que el pipeline OSINT extrae y almacena vs lo que el frontend muestra. El n8n workflow enriquece cada mención con scores de riesgo, confianza, sentimiento granular (VADER + TextBlob), engagement social y clasificación de amenazas. La mayor parte de estos datos se almacena en PostgreSQL pero nunca llega al frontend.
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`, `init.sql`, `backend/routers/metrics.py`, `frontend/src/features/metrics/`

> **Objetivo:** Aprovechar datos ya existentes en la DB que el frontend analytics no muestra. Cada modificación expone información que ya se extrae y almacena — no se agrega lógica de extracción nueva.

> **Regla de implementación:** un commit por modificación, Conventional Commits. Branch: `develop`.

> **Convención de endpoints:** Nuevos endpoints en `backend/routers/metrics.py` bajo `/api/metrics`, con `require_permission("metrics", "read")`, `response_model` Pydantic, y parámetro `days` donde aplique.

> **Convención de frontend:** Cada chart sigue el patrón establecido: tipo en `types.ts`, endpoint en `contract.ts`, fetch en `api.ts`, query en `hooks/useAnalytics.ts`, componente en `components/`, integración en `pages/AnalyticsPage.tsx`. Loading/error/empty via `ChartCard`.

---

## Gaps identificados

### Datos en DB sin endpoint

| Tabla | Columnas no expuestas | Valor analítico |
|-------|----------------------|-----------------|
| `threat_detections` | `risk_score` (0-100) | Distribución numérica de riesgo — hoy solo se ve por categoría textual |
| `threat_detections` | `review_status` (6 estados) | Solo se muestra `pending` count en dashboard — distribución invisible |
| `alerts` | `delivery_status`, `acknowledged` | Solo count total — no se ve tasa de acknowledge ni estado de delivery |
| `social_mentions` | `author_followers_count`, `likes_count`, `shares_count`, `replies_count` | Engagement social completo, nunca visualizado |
| `keywords_monitor` | `match_count`, `true_positive_count`, `false_positive_count` | Efectividad de keywords — datos del trigger `update_keyword_match` |

### Datos en API pero no renderizados en charts

| Endpoint | Campo disponible | Chart que lo ignora |
|----------|-----------------|---------------------|
| `/api/metrics/workflow-health` | `avg_mentions_processed`, `avg_detections_generated` | `WorkflowHealthChart` — solo muestra success/error counts |
| `/api/metrics/top-keywords` | `last_detection` | `TopKeywordsChart` — no se muestra ni en tooltip |

---

## Índice de Modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|-----------|------|-------------|--------|
| M01 | HIGH | Frontend | Enriquecer charts existentes con datos ya disponibles (zero backend) | DONE |
| M02 | HIGH | Backend + Frontend | Distribución de Risk Score — histograma de `threat_detections.risk_score` | PENDIENTE |
| M03 | HIGH | Backend + Frontend | Threat Review Funnel — distribución de `review_status` | PENDIENTE |
| M04 | MEDIUM | Backend + Frontend | Alert Delivery Health — delivery_status + acknowledged rate | PENDIENTE |
| M05 | MEDIUM | Backend + Frontend | Platform Sentiment Breakdown — sentimiento por plataforma | PENDIENTE |

---

## M01 — Enriquecer charts existentes (zero backend changes)

**Prioridad:** HIGH
**Área:** `frontend/src/features/metrics/components/`
**Estado:** DONE
**Commit:** `feat(frontend): enrich workflow health and top keywords charts with available data`

### Problema

Tres charts reciben datos enriquecidos de la API pero solo muestran una fracción:

1. **WorkflowHealthChart** — recibe `avg_mentions_processed` y `avg_detections_generated` en `WorkflowHealthEntry` pero solo renderiza `success_count` y `error_count`. El tooltip muestra `avg_duration_seconds` pero ignora los otros dos.

2. **TopKeywordsChart** — recibe `last_detection` pero no lo muestra ni en el tooltip. Los campos `days_active` y `avg_confidence` solo aparecen en hover — no hay indicador visual permanente.

3. **SentimentTrendChart** — muestra conteos (positive/neutral/negative) pero no la tendencia del score numérico promedio. El backend ya devuelve `avg_sentiment_score` en el summary pero la serie temporal no tiene el score diario.

### Solución

#### A. WorkflowHealthChart — agregar líneas de throughput

Agregar dos `Line` series superpuestas al `AreaChart` existente con un segundo eje Y:

```tsx
<YAxis yAxisId="right" orientation="right" stroke={chartColors.axis} tick={{ fill: chartColors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
<Line yAxisId="right" type="monotone" dataKey="avg_mentions_processed" stroke="#a78bfa" strokeWidth={2} dot={false} name="avg_mentions_processed" />
<Line yAxisId="right" type="monotone" dataKey="avg_detections_generated" stroke="#fb923c" strokeWidth={2} dot={false} name="avg_detections_generated" />
```

Y actualizar el `Legend` formatter para incluir labels traducidos de mentions processed y detections generated.

Tooltip: agregar `avg_mentions_processed` y `avg_detections_generated` al tooltip custom.

#### B. TopKeywordsChart — agregar `last_detection` al tooltip

Agregar al tooltip custom existente (después de confidence):

```tsx
<p>{t.analytics.tooltips.lastDetection}: {entry.last_detection ? new Date(entry.last_detection).toLocaleDateString() : '—'}</p>
```

#### C. SentimentTrendChart — sin cambio en M01

La serie temporal de score promedio diario requiere un cambio de backend (el endpoint `sentiment-over-time` no devuelve el score numérico). Se aborda si queda margen.

### Verificación

1. WorkflowHealthChart muestra líneas de throughput superpuestas cuando hay datos
2. TopKeywordsChart tooltip muestra la fecha de última detección
3. Legends reflejan los nombres traducidos de las nuevas series

### Archivos afectados

- `frontend/src/features/metrics/components/WorkflowHealthChart.tsx` — agregar `Line`, segundo `YAxis`, tooltip entries
- `frontend/src/features/metrics/components/TopKeywordsChart.tsx` — agregar `last_detection` al tooltip
- `frontend/src/shared/i18n/translations.ts` — nuevas keys para labels de throughput y last detection

---

## M02 — Distribución de Risk Score

**Prioridad:** HIGH
**Área:** `backend/routers/metrics.py`, `backend/schemas/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Problema

`threat_detections.risk_score` es un entero 0-100 que el nodo `Classify Threat` calcula para cada detección. Este score numérico NUNCA se expone por ningún endpoint. Solo se usa `criticality_level` (textual), perdiendo toda la granularidad numérica.

Un analista necesita ver si los risk scores se concentran en una banda (e.g., todo entre 40-60 = ruido) o si hay una distribución bimodal (claramente bajo vs alto).

### Solución — Backend

**`backend/schemas/metrics.py`:**

```python
class RiskScoreBucket(BaseModel):
    """Risk score histogram bucket."""
    model_config = ConfigDict(from_attributes=True)

    bucket: str          # "0-10", "11-20", ..., "91-100"
    count: int
    avg_score: float
```

**`backend/routers/metrics.py`:**

```python
@router.get("/risk-score-distribution", response_model=list[RiskScoreBucket])
def get_risk_score_distribution(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = db.execute(
        text("""
            SELECT
                CASE
                    WHEN risk_score BETWEEN 0 AND 10 THEN '0-10'
                    WHEN risk_score BETWEEN 11 AND 20 THEN '11-20'
                    WHEN risk_score BETWEEN 21 AND 30 THEN '21-30'
                    WHEN risk_score BETWEEN 31 AND 40 THEN '31-40'
                    WHEN risk_score BETWEEN 41 AND 50 THEN '41-50'
                    WHEN risk_score BETWEEN 51 AND 60 THEN '51-60'
                    WHEN risk_score BETWEEN 61 AND 70 THEN '61-70'
                    WHEN risk_score BETWEEN 71 AND 80 THEN '71-80'
                    WHEN risk_score BETWEEN 81 AND 90 THEN '81-90'
                    WHEN risk_score BETWEEN 91 AND 100 THEN '91-100'
                    ELSE 'unknown'
                END AS bucket,
                COUNT(*) AS count,
                ROUND(AVG(risk_score)::numeric, 1) AS avg_score
            FROM threat_detections
            WHERE detected_at >= :since AND risk_score IS NOT NULL
            GROUP BY bucket
            ORDER BY MIN(risk_score)
        """),
        {"since": since},
    ).fetchall()
    return [
        RiskScoreBucket(bucket=row.bucket, count=row.count, avg_score=float(row.avg_score))
        for row in rows
    ]
```

### Solución — Frontend

**Tipo:** `RiskScoreBucket { bucket: string; count: number; avg_score: number }`

**Componente:** `RiskScoreChart.tsx` — gráfico de barras verticales (histograma):
- X: buckets (0-10, 11-20, ..., 91-100)
- Y: count
- Color: gradiente de verde (bajo) a rojo (alto) por bucket
- Tooltip: muestra count y avg_score del bucket

**Layout:** Agregar en la grid de 2 columnas existente, al lado de `ThreatsBySeverityChart`.

### Verificación

1. El histograma muestra la distribución real de risk scores
2. Con filtro de 7 días vs 90 días, los valores cambian
3. Sin datos → "No data"

### Archivos afectados

- `backend/schemas/metrics.py` — nuevo `RiskScoreBucket`
- `backend/routers/metrics.py` — nuevo endpoint `/risk-score-distribution`
- `frontend/src/features/metrics/types.ts` — nuevo tipo
- `frontend/src/features/metrics/contract.ts` — nuevo endpoint
- `frontend/src/features/metrics/api.ts` — nuevo fetch
- `frontend/src/features/metrics/hooks/useAnalytics.ts` — nuevo query
- `frontend/src/features/metrics/components/RiskScoreChart.tsx` — nuevo componente
- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — integrar
- `frontend/src/shared/i18n/translations.ts` — nuevas keys

---

## M03 — Threat Review Funnel

**Prioridad:** HIGH
**Área:** `backend/routers/metrics.py`, `backend/schemas/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Problema

`threat_detections.review_status` tiene 6 valores posibles: `pending`, `reviewing`, `investigating`, `confirmed`, `false_positive`, `resolved`. El dashboard solo muestra el count de `pending`. La distribución completa — que indica cómo fluyen las amenazas por el proceso de revisión — es invisible.

### Solución — Backend

Reutilizar `CategoryCount` (ya existe):

```python
@router.get("/threat-review-status", response_model=list[CategoryCount])
def get_threat_review_status(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(
            func.coalesce(ThreatDetection.review_status, "pending").label("label"),
            func.count().label("count"),
        )
        .filter(ThreatDetection.detected_at >= since)
        .group_by(ThreatDetection.review_status)
        .order_by(func.count().desc())
        .all()
    )
    return [CategoryCount(label=row.label, count=row.count) for row in rows]
```

### Solución — Frontend

**Componente:** `ThreatReviewChart.tsx` — gráfico de barras horizontales apiladas o donut:
- Cada segmento es un `review_status`
- Colores semánticos: `pending` = amarillo, `reviewing`/`investigating` = azul, `confirmed` = rojo, `false_positive` = gris, `resolved` = verde
- Tooltip: muestra count y porcentaje

**Layout:** En la grid de 2 columnas, al lado de `ThreatCategoriesChart`.

### Verificación

1. Muestra la distribución de los 6 estados
2. Con datos frescos, `pending` debería ser mayoría (sin triaje manual)
3. El time range picker afecta el chart

### Archivos afectados

- `backend/routers/metrics.py` — nuevo endpoint `/threat-review-status`
- `frontend/src/features/metrics/contract.ts` — nuevo endpoint
- `frontend/src/features/metrics/api.ts` — nuevo fetch
- `frontend/src/features/metrics/hooks/useAnalytics.ts` — nuevo query
- `frontend/src/features/metrics/components/ThreatReviewChart.tsx` — nuevo componente
- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — integrar
- `frontend/src/shared/i18n/translations.ts` — nuevas keys

---

## M04 — Alert Delivery Health

**Prioridad:** MEDIUM
**Área:** `backend/routers/metrics.py`, `backend/schemas/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Problema

La tabla `alerts` almacena `delivery_status` (pending/sent/delivered/failed), `acknowledged` (bool), `acknowledged_by`, `acknowledged_at`. El frontend solo muestra un count total de alertas y un count de unacknowledged en el dashboard. No hay visibilidad sobre:
- ¿Cuántas alertas se enviaron vs fallaron?
- ¿Cuál es la tasa de acknowledgement?
- ¿Cuántas quedan sin reconocer por severidad?

### Solución — Backend

**`backend/schemas/metrics.py`:**

```python
class AlertHealthSummary(BaseModel):
    """Alert delivery and acknowledgement metrics."""
    model_config = ConfigDict(from_attributes=True)

    total: int
    by_delivery_status: list[CategoryCount]
    acknowledged_count: int
    unacknowledged_count: int
    acknowledgement_rate: float  # 0.0 - 1.0
```

**`backend/routers/metrics.py`:**

```python
@router.get("/alert-health", response_model=AlertHealthSummary)
def get_alert_health(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    base = db.query(Alert).filter(Alert.created_at >= since)
    total = base.count()

    delivery_rows = (
        base.with_entities(
            Alert.delivery_status.label("label"),
            func.count().label("count"),
        )
        .group_by(Alert.delivery_status)
        .all()
    )

    ack_count = base.filter(Alert.acknowledged.is_(True)).count()
    unack_count = total - ack_count

    return AlertHealthSummary(
        total=total,
        by_delivery_status=[CategoryCount(label=r.label or "unknown", count=r.count) for r in delivery_rows],
        acknowledged_count=ack_count,
        unacknowledged_count=unack_count,
        acknowledgement_rate=round(ack_count / total, 3) if total > 0 else 0.0,
    )
```

### Solución — Frontend

**Componente:** `AlertHealthChart.tsx` — combinación de:
- Donut/pie para `by_delivery_status`
- KPI text para `acknowledgement_rate` (e.g., "73% acknowledged")
- Colores: delivered = verde, sent = azul, pending = amarillo, failed = rojo

**Layout:** En la misma fila que `WorkflowHealthChart` y `TopKeywordsChart`, o en una fila nueva.

### Archivos afectados

- `backend/schemas/metrics.py` — nuevo `AlertHealthSummary`
- `backend/routers/metrics.py` — nuevo endpoint `/alert-health`
- `frontend/src/features/metrics/types.ts` — nuevo tipo
- `frontend/src/features/metrics/contract.ts` — nuevo endpoint
- `frontend/src/features/metrics/api.ts` — nuevo fetch
- `frontend/src/features/metrics/hooks/useAnalytics.ts` — nuevo query
- `frontend/src/features/metrics/components/AlertHealthChart.tsx` — nuevo componente
- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — integrar
- `frontend/src/shared/i18n/translations.ts` — nuevas keys

---

## M05 — Platform Sentiment Breakdown

**Prioridad:** MEDIUM
**Área:** `backend/routers/metrics.py`, `frontend/src/features/metrics/`
**Estado:** PENDIENTE

### Problema

`PlatformDistributionChart` muestra conteo de menciones por plataforma como pie chart simple. La vista materializada `daily_mention_stats` ya agrupa por `(date, platform, sentiment_label)` — el sentimiento por plataforma está pre-calculado pero nunca se consulta.

Un analista OSINT necesita saber: ¿GitHub genera más detecciones negativas que Reddit? ¿Twitter tiene sesgo positivo por engagement?

### Solución — Backend

**`backend/schemas/metrics.py`:**

```python
class PlatformSentimentEntry(BaseModel):
    """Sentiment breakdown per platform."""
    model_config = ConfigDict(from_attributes=True)

    platform: str
    positive: int
    neutral: int
    negative: int
    total: int
```

**`backend/routers/metrics.py`:**

```python
@router.get("/platform-sentiment", response_model=list[PlatformSentimentEntry])
def get_platform_sentiment(
    db: Session = Depends(get_db),
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    current_user: TokenData = Depends(require_permission("metrics", "read")),
):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = db.execute(
        text("""
            SELECT
                sm.platform,
                COUNT(*) FILTER (WHERE sa.sentiment_label = 'positive') AS positive,
                COUNT(*) FILTER (WHERE sa.sentiment_label = 'neutral') AS neutral,
                COUNT(*) FILTER (WHERE sa.sentiment_label = 'negative') AS negative,
                COUNT(*) AS total
            FROM social_mentions sm
            LEFT JOIN sentiment_analysis sa ON sm.mention_id = sa.mention_id
            WHERE sm.created_at >= :since
            GROUP BY sm.platform
            ORDER BY total DESC
        """),
        {"since": since},
    ).fetchall()
    return [
        PlatformSentimentEntry(
            platform=row.platform,
            positive=row.positive,
            neutral=row.neutral,
            negative=row.negative,
            total=row.total,
        )
        for row in rows
    ]
```

### Solución — Frontend

**Componente:** `PlatformSentimentChart.tsx` — barras apiladas horizontales:
- Y: plataforma
- X: count
- Segmentos apilados: positive (verde), neutral (gris), negative (rojo)
- Tooltip: muestra breakdown numérico y porcentajes

**Layout:** Reemplaza o acompaña al `PlatformDistributionChart` actual. Si se reemplaza, el pie chart simple se elimina y el stacked bar provee más información con el mismo espacio.

### Archivos afectados

- `backend/schemas/metrics.py` — nuevo `PlatformSentimentEntry`
- `backend/routers/metrics.py` — nuevo endpoint `/platform-sentiment`
- `frontend/src/features/metrics/types.ts` — nuevo tipo
- `frontend/src/features/metrics/contract.ts` — nuevo endpoint
- `frontend/src/features/metrics/api.ts` — nuevo fetch
- `frontend/src/features/metrics/hooks/useAnalytics.ts` — nuevo query
- `frontend/src/features/metrics/components/PlatformSentimentChart.tsx` — nuevo componente
- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — integrar (reemplazar o agregar junto a PlatformDistribution)
- `frontend/src/shared/i18n/translations.ts` — nuevas keys

---

## Orden de Ejecución Recomendado

```
M01 (enriquecer charts existentes — zero backend, quick wins)
  → M02 (risk score distribution — nuevo chart con datos nunca expuestos)
  → M03 (threat review funnel — nuevo chart, reutiliza CategoryCount)
  → M04 (alert health — nuevo chart compuesto)
  → M05 (platform sentiment — chart con breakdown por plataforma)
```

M01 es independiente de todo. M02-M05 son independientes entre sí.

**Commits sugeridos:**

1. `feat(frontend): enrich workflow health and top keywords charts with available data` (M01)
2. `feat: add risk score distribution endpoint and chart` (M02)
3. `feat: add threat review status distribution endpoint and chart` (M03)
4. `feat: add alert delivery health endpoint and chart` (M04)
5. `feat: add platform sentiment breakdown endpoint and chart` (M05)

---

## Notas Arquitecturales

### ¿Por qué no agregar engagement metrics (likes, shares, followers)?

Las columnas de engagement existen en `social_mentions` pero su llenado depende de cada fuente: GitHub Issues no tiene "likes", HackerNews no tiene "followers", RSS no tiene engagement. Mostrar un chart de engagement tendría datos parciales y potencialmente engañosos. Se puede agregar en un plan futuro con un indicador de completitud por plataforma.

### ¿Por qué no keyword effectiveness (match_count, true/false positive)?

Los contadores `true_positive_count` y `false_positive_count` en `keywords_monitor` están en 0 — requieren input manual del operador (triaje). Sin datos de triaje, un chart de efectividad mostraría siempre 0% false positive, lo cual es misleading. Se puede agregar cuando el flujo de triaje esté implementado.

### Relación con PLAN-010

PLAN-010 expuso las vistas materializadas (`top_keywords_stats`, `workflow_performance_stats`). Este plan va un paso más allá: aprovecha datos que están en las tablas BASE (`threat_detections`, `alerts`, `social_mentions`) y que el pipeline enriquece activamente pero que ningún endpoint consulta.

---
