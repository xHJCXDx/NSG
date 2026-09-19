# PLAN-002: Mejoras de UX y Funcionalidad

**Estado:** COMPLETADO
**Prioridad:** HIGH -> MEDIUM
**Origen:** Feedback del usuario post-implementacion
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`

> **Estrategia de commits:** Conventional commits con scope — `feat(frontend): ...`, `refactor(frontend): ...`, `feat(workflow): ...`. Branch: `develop`. Un commit por modificacion completada.

---

## Indice de Modificaciones

| # | Prioridad | Area | Descripcion | Estado |
|---|-----------|------|-------------|--------|
| M01 | ✅ DONE | Frontend | Mover permisos de roles de Settings a Users (colapsable) | DONE |
| M02 | ✅ DONE | Frontend | Agregar cambio de idioma (ES/EN) en Settings | DONE |
| M03 | ✅ DONE | Frontend | Agregar cambio de tema (dark/light) en Settings | DONE |
| M04 | ✅ DONE | Frontend | Mejorar visualizacion de Threats (texto legible y prolijo) | DONE |
| M05 | ✅ DONE | Frontend | Mejorar visualizacion de Mentions (texto legible y prolijo) | DONE |
| M06 | ✅ DONE | Frontend | Dashboard con datos en tiempo real (polling/refetch automatico) | DONE |
| M07 | ✅ DONE | Workflow | Mejorar formato de alertas por email (legible y profesional) | DONE |
| M08 | ✅ DONE | Workflow | Consolidar alertas en un solo email resumen por ejecucion | DONE |

---

## M01 — Mover permisos de roles de Settings a Users

**Prioridad:** HIGH
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- Eliminado `PermissionMatrix` de la pagina Settings
- Movido el componente de permisos a la pagina Users como seccion colapsable con chevron
- Movidos hooks, tipos, API functions y tests correspondientes
- Settings quedo solo con SystemInfoCard + tema + idioma

**Archivos afectados:**
- `frontend/src/features/settings/pages/SettingsPage.tsx` — removido PermissionMatrix y hooks de permisos
- `frontend/src/features/settings/api.ts` — removidas funciones de permisos (queda solo fetchHealth)
- `frontend/src/features/settings/types.ts` — removidos tipos de permisos (queda solo HealthResponse)
- `frontend/src/features/settings/contract.ts` — removidos endpoints y copy de permisos
- `frontend/src/features/settings/index.ts` — removidas exports de permisos
- `frontend/src/features/settings/api.test.ts` — removidos tests de permisos
- `frontend/src/features/settings/components/PermissionMatrix.tsx` — ELIMINADO
- `frontend/src/features/settings/hooks/usePermissionsQuery.ts` — ELIMINADO
- `frontend/src/features/settings/hooks/useUpdateRoleMutation.ts` — ELIMINADO
- `frontend/src/features/users/components/PermissionMatrix.tsx` — NUEVO
- `frontend/src/features/users/hooks/usePermissionsQuery.ts` — NUEVO
- `frontend/src/features/users/hooks/useUpdateRoleMutation.ts` — NUEVO
- `frontend/src/features/users/pages/UsersPage.tsx` — agregada seccion colapsable de permisos
- `frontend/src/features/users/api.ts` — agregadas funciones de permisos
- `frontend/src/features/users/types.ts` — agregados tipos de permisos
- `frontend/src/features/users/contract.ts` — agregados endpoints y copy de permisos
- `frontend/src/features/users/index.ts` — agregadas exports de permisos
- `frontend/src/features/users/api.test.ts` — agregados tests de permisos

**Commit:** `refactor(frontend): move permission matrix from settings to users page`

---

## M02 — Cambio de idioma en Settings

**Prioridad:** HIGH
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- Implementado sistema i18n completo con 101 strings por idioma (ES/EN)
- Selector de idioma en Settings con persistencia en localStorage
- Traducidos TODOS los componentes: login, navegacion, dashboard, threats, mentions, users, analytics, settings, automation, 404, error boundary
- Los `*_COPY` constants se mantienen en contract.ts para tests, pero la UI usa `useTranslation()`

**Archivos afectados:**
- `frontend/src/shared/contexts/LanguageContext.tsx` — NUEVO contexto de idioma
- `frontend/src/shared/i18n/translations.ts` — NUEVO archivo con 101 strings EN + 101 strings ES
- `frontend/src/app/providers/AppProviders.tsx` — agregado LanguageProvider
- `frontend/src/features/settings/pages/SettingsPage.tsx` — agregado selector de idioma
- 25 componentes convertidos de `*_COPY` a `useTranslation()` (ver lista completa en commit)

**Commit:** `feat(frontend): add i18n with ES/EN support across all components`

---

## M03 — Cambio de tema en Settings

**Prioridad:** HIGH
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- Implementado sistema de temas con CSS variables semanticas
- Dark theme (default): fondos oscuros (#0b0f19), textos claros
- Light theme: grises claros azulados (#f0f4f8), textos oscuros
- Toggle en Settings con iconos Sun/Moon y persistencia en localStorage
- Tailwind extendido con tokens semanticos (surface.*, content.*, edge.*)
- 21 componentes migrados de clases hardcodeadas a tokens semanticos
- 6 componentes de charts migrados con CSS variables dinamicas via getComputedStyle

**Archivos afectados:**
- `frontend/src/shared/contexts/ThemeContext.tsx` — NUEVO contexto de tema
- `frontend/src/index.css` — CSS variables para ambos temas + glass utilities actualizadas
- `frontend/tailwind.config.js` — tokens semanticos (surface, content, edge)
- `frontend/src/app/providers/AppProviders.tsx` — agregado ThemeProvider
- `frontend/src/features/settings/pages/SettingsPage.tsx` — agregado toggle de tema
- 21 componentes actualizados con tokens semanticos (DashboardLayout, LoginView, Dashboard, KpiCard, etc.)
- 6 charts actualizados con variables CSS dinamicas (Dashboard, 5 charts de analytics)

**Commit:** `feat(frontend): add dark/light theme with semantic CSS tokens`

---

## M04 — Mejorar visualizacion de Threats

**Prioridad:** HIGH
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- Severity badges coloreados por nivel (green/yellow/orange/red en vez de siempre rojo)
- Borde izquierdo coloreado por severidad
- Evidence como pills con limite de 5 visibles y "show more" toggle
- Summary truncado a 200 chars con expand/collapse
- Markdown stripping (elimina ##, backticks, links, listas, pipes)
- Related mention text truncado a 80 chars con markdown stripping
- Fechas relativas ("2 hours ago")
- Filtros de severity y classification como `<select>` en vez de inputs de texto
- Eliminado ruido de "No related mention provided"

**Archivos afectados:**
- `frontend/src/features/threats/components/ThreatCard.tsx` — severity colors, truncation, markdown strip, evidence pills
- `frontend/src/features/threats/components/ThreatsToolbar.tsx` — select dropdowns
- `frontend/src/features/threats/hooks/useThreats.ts` — availableFilters con opciones derivadas
- `frontend/src/features/threats/pages/ThreatsPage.test.tsx` — tests actualizados para selects

**Commit:** `feat(frontend): improve threats page readability and data formatting`

---

## M05 — Mejorar visualizacion de Mentions

**Prioridad:** HIGH
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- Borde izquierdo coloreado por sentimiento (green/gray/red)
- Badge de sentiment con color
- Fechas relativas ("2 hours ago")
- Texto truncado a 200 chars con expand/collapse
- Markdown stripping para texto limpio
- Filtro de plataforma como `<select>` con opciones derivadas de los datos

**Archivos afectados:**
- `frontend/src/features/mentions/components/MentionCard.tsx` — sentiment colors, truncation, markdown strip
- `frontend/src/features/mentions/components/MentionsToolbar.tsx` — select dropdown para plataforma
- `frontend/src/features/mentions/hooks/useMentions.ts` — availableFilters con platformOptions
- `frontend/src/features/mentions/pages/MentionsPage.tsx` — pasar availableFilters al toolbar

**Commit:** `feat(frontend): improve mentions page readability and data formatting`

---

## M06 — Dashboard con datos en tiempo real

**Prioridad:** HIGH
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- Agregado `refetchInterval: 30000` (30 segundos) al useQuery del dashboard
- Indicador "Last updated: HH:MM:SS" en el header de la pagina
- Los datos se refrescan automaticamente sin recargar la pagina

**Archivos afectados:**
- `frontend/src/features/dashboard/hooks/useDashboardSummary.ts` — refetchInterval
- `frontend/src/features/dashboard/pages/Dashboard.tsx` — timestamp de ultima actualizacion

**Commit:** `feat(frontend): add real-time polling to dashboard data`

---

## M07 — Mejorar formato de alertas por email

**Prioridad:** MEDIUM
**Area:** Workflow (n8n)
**Estado:** DONE

**Que se hizo:**
- Template HTML profesional con header NSG (azul oscuro), badges de severidad con color
- Tabla de alertas con columnas: #, Severity, Type, Platform, Author, Confidence, Detected
- Links a source URL en cada fila
- Footer con branding NSG
- Slack blocks con emojis de severidad y preview truncado

**Archivos afectados:**
- `workflow.json` — nodo "Build Alert Content" reescrito con template profesional

**Commit:** `feat(workflow): redesign alert email template for readability`

---

## M08 — Consolidar alertas en un solo email resumen

**Prioridad:** MEDIUM
**Area:** Workflow (n8n)
**Estado:** DONE

**Que se hizo:**
- Nuevo nodo "Aggregate Alerts" que usa `$input.all()` para juntar todas las alertas en un solo item
- Build Alert Content ahora genera UN email con resumen de TODAS las alertas
- Email subject: `[NSG] Scan Report — X alerts detected (Y critical, Z high)`
- Log Alert in DB se mantiene en branch paralelo (una fila por alerta individual)

**Archivos afectados:**
- `workflow.json` — nuevo nodo Aggregate Alerts, conexiones reestructuradas

**Commit:** `feat(workflow): consolidate alerts into single summary email per execution`

---

## Orden de implementacion (completado)

1. ✅ **M06** — Dashboard polling
2. ✅ **M04** — Threats display
3. ✅ **M05** — Mentions display
4. ✅ **M01** — Mover permisos a Users
5. ✅ **M03** — Theme toggle + integracion completa
6. ✅ **M02** — Idioma con i18n completo
7. ✅ **M08** — Consolidar emails
8. ✅ **M07** — Email template profesional
