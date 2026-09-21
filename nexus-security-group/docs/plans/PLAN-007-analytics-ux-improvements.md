# PLAN-007: Mejoras UX de Analytics y Charts

**Estado:** COMPLETADO
**Prioridad:** MEDIUM
**Origen:** Revisión de UX de la página Analytics — leyendas faltantes, loading global, rango temporal fijo.
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`

> **Objetivo:** corregir bugs visuales en los gráficos y mejorar la experiencia del usuario en la sección Analytics y Dashboard.

> **Regla de implementación:** un commit por área de cambio, Conventional Commits. Branch: `develop`.

---

## Índice de Modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|-----------|------|-------------|--------|
| M01 | ✅ DONE | Frontend (Dashboard) | Corregir colores individuales por barra en el chart del Dashboard | DONE |
| M02 | ✅ DONE | Frontend (Analytics) | Agregar leyendas a SentimentTrend y PlatformDistribution charts | DONE |
| M03 | ✅ DONE | Frontend (Analytics) | Agregar leyendas a MentionsOverTime, ThreatsBySeverity y ThreatCategories | DONE |
| M04 | ✅ DONE | Frontend (Analytics) | Loading/error progresivo por chart (no global) | DONE |
| M05 | ✅ DONE | Frontend (Analytics) | Selector de rango temporal (7/30/90 días) | DONE |

---

## M01 — Corregir colores por barra en Dashboard chart

**Prioridad:** ALTO
**Área:** Frontend (Dashboard)
**Estado:** DONE

### Problema

El chart de barras del Dashboard definía `fill` por dato en el array `chartData`, pero `<Bar>` de Recharts no usaba `<Cell>` para aplicarlos. Todas las barras se renderizaban con el color default (azul), ignorando los colores semánticos definidos (rojo para threats, ámbar para pending, etc.).

### Solución

Importar `Cell` de Recharts y renderizar un `<Cell fill={entry.fill} />` por cada dato dentro de `<Bar>`.

### Archivos afectados

- `frontend/src/features/dashboard/pages/Dashboard.tsx` — importado `Cell`, agregado mapping dentro de `<Bar>`.
- `frontend/src/features/dashboard/pages/Dashboard.test.tsx` — mock de `Cell` y ajuste de `Bar` para pasar `children`.

### Commit

```
c1e2804 fix(frontend): apply per-bar colors in dashboard chart using Cell components
```

---

## M02 — Leyendas en SentimentTrend y PlatformDistribution

**Prioridad:** ALTO
**Área:** Frontend (Analytics)
**Estado:** DONE

### Problema

- `SentimentTrendChart` — gráfico apilado con 3 series (positive, neutral, negative) sin leyenda. El usuario no podía saber qué color representaba cada sentimiento sin hacer hover.
- `PlatformDistributionChart` — donut sin leyenda ni etiquetas. Las plataformas eran indistinguibles visualmente.

### Solución

- **SentimentTrendChart:** agregado `<Legend wrapperStyle={{ color: 'var(--color-content-secondary)' }} />` después de `<Tooltip>`.
- **PlatformDistributionChart:** agregado `<Legend layout="vertical" align="right" verticalAlign="middle" />` para leyenda lateral, y `label={({ percent }) => ...}` con `labelLine={false}` en `<Pie>` para mostrar porcentajes en cada slice.

### Archivos afectados

- `frontend/src/features/metrics/components/SentimentTrendChart.tsx`
- `frontend/src/features/metrics/components/PlatformDistributionChart.tsx`

---

## M03 — Leyendas en los charts restantes

**Prioridad:** MEDIO
**Área:** Frontend (Analytics)
**Estado:** DONE

### Problema

MentionsOverTimeChart, ThreatsBySeverityChart y ThreatCategoriesChart no tenían leyendas.

### Solución

Agregado `<Legend>` a los tres charts con estilo consistente usando `var(--color-content-secondary)`.

### Archivos afectados

- `frontend/src/features/metrics/components/MentionsOverTimeChart.tsx`
- `frontend/src/features/metrics/components/ThreatsBySeverityChart.tsx`
- `frontend/src/features/metrics/components/ThreatCategoriesChart.tsx`

### Commit (M02 + M03 juntos)

```
1912f53 feat(frontend): add legends to charts and per-chart loading/error states
```

---

## M04 — Loading/error progresivo por chart

**Prioridad:** MEDIO
**Área:** Frontend (Analytics)
**Estado:** DONE

### Problema

`AnalyticsPage` tenía un `if (isLoading) return <spinner>` y `if (error) return <error>` globales. Si UNA de las 6 queries tardaba o fallaba, TODA la página se bloqueaba. Los 5 charts que ya tenían datos no se mostraban.

### Solución

- `useAnalytics` ahora expone estados individuales por query: `summaryLoading`, `summaryError`, `mentionsOverTimeLoading`, `mentionsOverTimeError`, etc.
- `AnalyticsPage` eliminó los early returns globales y pasa `isLoading`/`error` a cada chart.
- Cada chart component (`MentionsOverTimeChart`, `SentimentTrendChart`, `PlatformDistributionChart`, `ThreatsBySeverityChart`, `ThreatCategoriesChart`) ahora maneja su propio estado: spinner si loading, mensaje de error si falla, empty state si no hay datos.

### Archivos afectados

- `frontend/src/features/metrics/hooks/useAnalytics.ts` — exposición de estados individuales.
- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — pasaje de props por chart.
- Los 5 chart components — manejo interno de loading/error/empty.

---

## M05 — Selector de rango temporal

**Prioridad:** MEDIO
**Área:** Frontend (Analytics)
**Estado:** DONE

### Problema

`useAnalytics` aceptaba un parámetro `days` pero `AnalyticsPage` siempre lo llamaba con el default (30). El usuario no tenía forma de cambiar el rango temporal de los gráficos.

### Solución

- Agregado `useState<7 | 30 | 90>(30)` en `AnalyticsPage`.
- Selector segmentado (botones) en el header de la página con opciones 7/30/90 días.
- El `days` seleccionado se pasa a `useAnalytics(days)`, que lo propaga a los endpoints backend.
- Traducciones EN/ES bajo `analytics.timeRange`.

### Archivos afectados

- `frontend/src/features/metrics/pages/AnalyticsPage.tsx` — selector y estado.
- `frontend/src/shared/i18n/translations.ts` — strings `timeRange.label`, `days7`, `days30`, `days90`.

### Commit (M04 + M05 juntos)

```
b366f58 feat(frontend): add time range picker and progressive loading to analytics
```

---

## Verificación final

- Frontend: 210 tests passed, 33 files — 0 failures.
- Working tree limpio.
- 3 commits en `develop`.
