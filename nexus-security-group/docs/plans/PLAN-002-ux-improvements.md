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
| M09 | ✅ DONE | Full-stack | Paginacion en Mentions y Threats (backend + frontend) | DONE |
| M10 | ✅ DONE | Full-stack | Filtros server-side y opciones de filtro globales desde backend | DONE |
| M11 | ✅ DONE | Frontend | Reemplazar tooltips nativos por texto expandible en ThreatCard | DONE |
| M12 | ✅ DONE | Frontend | Rediseño UX de la página de Users y permisos de roles | DONE |

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

## M09 — Paginacion en Mentions y Threats

**Prioridad:** HIGH
**Area:** Full-stack (Backend + Frontend)
**Estado:** DONE

**Que se hizo:**
- Backend: reemplazados params `limit`/`offset` por `page`/`page_size` en ambos endpoints
- Backend: respuesta envuelta en envelope paginado (`data`, `total`, `page`, `page_size`, `total_pages`)
- Backend: total count respeta filtros activos en threats (criticality_level, review_status, mention_id)
- Frontend: componente `Pagination` reutilizable con soporte i18n
- Frontend: hooks de mentions y threats manejan estado de pagina, reset a pagina 1 al cambiar filtros
- Frontend: se muestran controles Anterior/Siguiente cuando hay mas de una pagina

**Archivos afectados:**
- `backend/schemas/metrics.py` — nuevo `PaginatedMentionsResponse`
- `backend/schemas/threat.py` — nuevo `PaginatedThreatsResponse`
- `backend/routers/metrics.py` — paginacion en `get_recent_mentions`
- `backend/routers/threats.py` — paginacion en `get_threats`
- `frontend/src/shared/types.ts` — tipo `PaginatedResponse<T>`
- `frontend/src/shared/components/Pagination.tsx` — componente reutilizable
- `frontend/src/shared/i18n/translations.ts` — strings de paginacion EN/ES
- `frontend/src/features/mentions/` — api, contract, types, hooks, page
- `frontend/src/features/threats/` — api, contract, types, hooks, page, index

**Commits:**
- `feat(backend): add pagination to mentions and threats endpoints`
- `feat(frontend): add pagination controls to mentions and threats pages`

---

## M10 — Filtros server-side y opciones de filtro globales

**Prioridad:** HIGH
**Area:** Full-stack (Backend + Frontend)
**Estado:** DONE

**Que se hizo:**
- Backend mentions: nuevo query param `platform` para filtrar server-side; respuesta incluye `available_platforms` con todas las plataformas existentes en la DB
- Backend threats: respuesta incluye `available_severities` y `available_classifications` con todos los valores existentes en la DB
- Frontend mentions: dropdown de plataforma usa opciones del backend (globales), no de la pagina actual; cambiar plataforma trigerea nueva query server-side
- Frontend threats: dropdown de severity usa opciones del backend; cambiar severity trigerea nueva query server-side via `criticality_level`
- Tests actualizados para reflejar los nuevos response shapes y filtros server-side

**Archivos afectados:**
- `backend/routers/metrics.py` — filtro `platform` + `available_platforms`
- `backend/routers/threats.py` — `available_severities` + `available_classifications`
- `backend/schemas/metrics.py` — campo `available_platforms` en `PaginatedMentionsResponse`
- `backend/schemas/threat.py` — campos `available_severities`/`available_classifications` en `PaginatedThreatsResponse`
- `frontend/src/features/mentions/api.ts` — `MentionsPaginatedResponse`, envio de `platform` param
- `frontend/src/features/mentions/hooks/useMentions.ts` — filtro platform server-side, opciones del backend
- `frontend/src/features/mentions/types.ts` — `platform` en `MentionsQuery`
- `frontend/src/features/threats/api.ts` — `ThreatsPaginatedResponse`, envio de `criticality_level` param
- `frontend/src/features/threats/hooks/useThreats.ts` — filtro severity server-side, opciones del backend
- `frontend/src/features/threats/types.ts` — `criticality_level` en `ThreatsQuery`
- Tests: `mentions/api.test.ts`, `mentions/hooks/useMentions.test.tsx`, `threats/api.test.ts`, `threats/hooks/useThreats.test.tsx`

**Commit:** `feat(api): add server-side filters and available filter options to paginated endpoints`

---

## M11 — Reemplazar tooltips nativos por texto expandible en ThreatCard

**Prioridad:** MEDIUM
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- Eliminado atributo `title` de evidence pills (generaba tooltip nativo con texto crudo al pasar el mouse)
- Eliminado atributo `title` del related mention
- Related mention ahora es expandible con boton show more/show less (truncado a 80 chars por defecto)
- Consistente con el patron de expand/collapse ya usado en summary y en MentionCard

**Archivos afectados:**
- `frontend/src/features/threats/components/ThreatCard.tsx`

**Commit:** `fix(frontend): replace native tooltips with expandable text in ThreatCard`

---

## M12 — Rediseño UX de la página de Users y permisos de roles

**Prioridad:** MEDIUM
**Area:** Frontend
**Estado:** DONE

**Que se hizo:**
- User directory: iconos de seccion (Users, Shield), badges de rol con colores (admin=brand, analyst=cyan), indicadores de estado con dot verde/rojo
- Create user form: cambiado de seccion separada a formulario inline colapsable con boton "Create user" en el header del directorio, layout en grilla 2 columnas (username/password) + 3 columnas (role/active/botones), boton cancelar
- Permissions section: accordion integrado dentro de glass-card (antes era boton suelto + contenido separado), header con icono Shield y descripcion inline, separador visual con border-top
- Permission matrix: checkboxes nativos reemplazados por toggle switches estilizados, filas modificadas resaltadas con fondo amber + dot indicador, tabla con bordes redondeados, agrupamiento de recursos con headers bold
- Confirmacion de usuario creado: movida arriba del directorio con estilo emerald, form se cierra y resetea automaticamente al crear usuario exitosamente
- Traducciones: agregado `cancelLabel` en EN y ES

**Archivos afectados:**
- `frontend/src/features/users/pages/UsersPage.tsx`
- `frontend/src/features/users/components/PermissionMatrix.tsx`
- `frontend/src/shared/i18n/translations.ts`

**Commit:** `feat(frontend): redesign users page with improved UX for roles and permissions`

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
9. ✅ **M09** — Paginacion mentions y threats
10. ✅ **M10** — Filtros server-side y opciones globales
11. ✅ **M11** — Tooltips a expandible en ThreatCard
12. ✅ **M12** — Rediseño UX Users y permisos
