# PLAN-003: Interacciones de Menú para Permisos RBAC Pendientes

**Estado:** PENDIENTE  
**Prioridad:** HIGH -> MEDIUM  
**Origen:** Revisión de permisos backend vs navegación/interacciones frontend luego de completar Keywords UI.  
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`  
**Planes relacionados:** `docs/plans/PLAN-002-ux-improvements.md`

> **Objetivo:** que cada permiso funcional expuesto por backend tenga una interacción visible, usable y protegida en frontend. Un permiso sin pantalla/botón asociado no demuestra valor operativo en el prototipo.

> **Regla de implementación:** un commit por modificación, con Conventional Commits. No mezclar pantallas nuevas, ajustes backend y documentación en un mismo commit.

---

## Estado actual verificado

### Ya cubierto por menú/interacción

| Permiso | Interacción actual | Estado |
|---|---|---|
| `dashboard:read` | Menú Dashboard `/` | DONE |
| `mentions:read` | Menú Mentions `/mentions` | DONE |
| `threats:read` | Menú Threats `/threats` | DONE |
| `keywords:read` | Menú Keywords `/keywords` | DONE |
| `keywords:write` | Crear/editar/activar keywords en `/keywords` | DONE |
| `keywords:delete` | Borrar keywords con confirmación en `/keywords` | DONE |
| `users:read` | Menú Users `/users` | DONE |
| `users:write` | Crear/editar usuarios en `/users` | DONE |
| `permissions:read` | Matriz de permisos dentro de Users/Settings protegidos | DONE |
| `permissions:write` | Editar permisos de `analyst` en Users | DONE |
| `metrics:read` | Menú Analytics `/analytics` | DONE |

### Permisos con interacción faltante o incompleta

| Permiso | Problema actual | Modificación propuesta |
|---|---|---|
| `workflows:read` | No hay menú/página clara para ver automatizaciones | M01 Automation / Workflows |
| `workflows:execute` | No hay botón operativo visible para ejecutar scan | M01 Automation / Workflows |
| `alerts:read` | No hay pantalla dedicada para revisar alertas | M02 Alerts Center |
| `alerts:write` | No hay interacción para marcar/revisar/resolver alertas | M02 Alerts Center |
| `logs:read` | No hay pantalla de auditoría/logs accesible desde menú | M03 Logs / Activity |
| `users:delete` | El permiso existe pero Users no expone borrado seguro | M04 Delete Users |

---

## Índice de Modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|-----------|------|-------------|--------|
| M01 | HIGH | Frontend | Automation / Workflows: ver estado y ejecutar OSINT scan | DONE |
| M02 | HIGH | Frontend + posible Backend | Alerts Center: listar, filtrar y revisar alertas | DONE |
| M03 | MEDIUM | Frontend + posible Backend | Logs / Activity: auditoría operacional y actividad de usuario | PENDING |
| M04 | MEDIUM | Frontend + posible Backend | Delete Users: borrado seguro de usuarios existentes | PENDING |
| M05 | MEDIUM | Frontend | Navegación agrupada y consistencia UX de permisos | PENDING |
| M06 | MEDIUM | Docs + Tests | Matriz final permiso → menú → acción → tests | PENDING |

---

## M01 — Automation / Workflows

**Prioridad:** HIGH  
**Área:** Frontend  
**Estado:** DONE

### Problema

Existen permisos:

```txt
workflows:read
workflows:execute
```

pero el usuario no tiene un menú claro para ver automatizaciones ni ejecutar manualmente el flujo OSINT.

### Objetivo UX

Agregar una sección de menú:

```txt
Automation
```

o:

```txt
Workflows
```

Debe permitir:

- ver estado operacional de automatizaciones,
- ejecutar manualmente un scan OSINT si el usuario tiene `workflows:execute`,
- mostrar resultado de ejecución,
- mostrar loading state,
- mostrar errores backend de forma clara.

### Permisos involucrados

| Permiso | Efecto UI |
|---|---|
| `workflows:read` | Ver menú y página Automation |
| `workflows:execute` | Ver botón `Run OSINT Scan` / `Ejecutar scan` |

### Backend esperado

Revisar antes de implementar:

- `frontend/src/features/automation/`
- `backend/routers/n8n.py`
- endpoints ya existentes para trigger manual.

No crear backend nuevo si ya existe un endpoint operativo.

### Archivos probables

- `frontend/src/app/layouts/DashboardLayout.tsx`
- `frontend/src/app/router/AppRouter.tsx`
- `frontend/src/features/automation/AutomationTriggers.tsx`
- `frontend/src/features/automation/api.ts`
- `frontend/src/features/automation/hooks/useTriggerWorkflow.ts`
- `frontend/src/shared/i18n/translations.ts`
- tests de router/layout/automation.

### Criterios de aceptación

- Usuario con `workflows:read` ve el item de menú.
- Usuario sin `workflows:read` no ve el item ni accede a la ruta.
- Usuario con `workflows:execute` ve botón de ejecución.
- Usuario sin `workflows:execute` puede ver estado pero no ejecutar.
- Al ejecutar, hay estado loading y feedback de éxito/error.
- `npm run typecheck` pasa.
- Tests focalizados de Automation/router/layout pasan.

### Commit sugerido

```txt
PENDING — orchestrator will commit after verification.
```

### Implementación verificada

- Ruta agregada: `/automation`, protegida por `workflows:read`.
- Menú agregado: `Automation`, visible solo con `workflows:read`.
- Panel operacional reutilizado: `frontend/src/features/automation/AutomationTriggers.tsx`.
- Ejecución manual: botón `Run OSINT scan` / `Ejecutar escaneo OSINT` habilitado solo con `workflows:execute`; usuarios read-only ven nota clara y botón deshabilitado.
- Backend usado: `POST /api/n8n/webhook/osint-trigger` vía `backend/routers/n8n.py`, protegido por `workflows:execute`.
- Archivos afectados:
  - `frontend/src/app/layouts/DashboardLayout.tsx`
  - `frontend/src/app/router/AppRouter.tsx`
  - `frontend/src/features/automation/AutomationPage.tsx`
  - `frontend/src/features/automation/AutomationTriggers.test.tsx`
  - `frontend/src/features/automation/index.ts`
  - `frontend/src/features/dashboard/pages/DashboardPage.tsx`
  - `frontend/src/app/layouts/DashboardLayout.test.tsx`
  - `frontend/src/app/router/AppRouter.test.tsx`
  - `frontend/src/shared/i18n/translations.ts`
- Verificación:
  - `npm run typecheck` → PASS.
  - `npm test -- src/features/automation/AutomationTriggers.test.tsx src/app/router/AppRouter.test.tsx src/app/layouts/DashboardLayout.test.tsx` → PASS, 3 files / 20 tests.

---

## M02 — Alerts Center

**Prioridad:** HIGH  
**Área:** Frontend + posible Backend  
**Estado:** DONE

### Problema

Existen permisos:

```txt
alerts:read
alerts:write
```

pero no hay pantalla dedicada para que el usuario revise alertas generadas por el pipeline.

### Objetivo UX

Agregar una sección de menú:

```txt
Alerts
```

Debe permitir:

- listar alertas,
- ver severidad,
- ver mensaje/canal/estado de entrega,
- filtrar por severidad/status/fecha si el backend lo permite,
- abrir detalle de alerta,
- marcar como revisada/resuelta si existe soporte backend o documentar brecha.

### Permisos involucrados

| Permiso | Efecto UI |
|---|---|
| `alerts:read` | Ver menú y listado de alertas |
| `alerts:write` | Acciones de revisión/cambio de estado si backend lo soporta |

### Backend esperado

Revisar antes de implementar:

- `backend/routers/alerts.py`
- schemas de alertas,
- si existe PATCH/PUT para update de estado.

Si backend solo permite lectura, implementar M02 en dos pasos:

1. `M02A` — Alerts read-only UI.
2. `M02B` — Acción write cuando backend soporte update.

### Archivos probables

- `frontend/src/features/alerts/`
- `frontend/src/app/router/AppRouter.tsx`
- `frontend/src/app/layouts/DashboardLayout.tsx`
- `frontend/src/shared/i18n/translations.ts`
- `frontend/src/shared/components/Pagination.tsx` si aplica.

### Criterios de aceptación

- Usuario con `alerts:read` ve menú Alerts.
- Usuario sin `alerts:read` no ve menú ni accede a ruta.
- Listado maneja loading, empty state y error state.
- Si hay `alerts:write`, las acciones aparecen solo para usuarios autorizados.
- No inventar estados que backend no persista.
- Tests API/UI focalizados pasan.
- `npm run typecheck` pasa.

### Commit sugerido

```txt
PENDING — orchestrator will commit after verification.
```

### Implementación verificada

- Ruta agregada: `/alerts`, protegida por `alerts:read`.
- Menú agregado: `Alerts`, visible solo con `alerts:read`.
- Backend contract usado:
  - `GET /api/alerts` con `limit`, `offset`, `delivery_status`, `acknowledged`; respuesta `AlertResponse[]` sin envelope paginado ni total.
  - `PATCH /api/alerts/{alert_id}/acknowledge` sin body, protegido por `alerts:write`, respuesta `AlertResponse`.
  - Estados de entrega soportados: `pending`, `sent`, `delivered`, `failed`.
  - Acción write soportada: solo `acknowledge`; no se implementaron resolve/reopen/change severity/comments.
- UX implementada:
  - Página Alerts Center con loading, empty y error state.
  - Tabla con título, severidad, mensaje, canales, delivery status, estado de reconocimiento, timestamps de creación/envío/reconocimiento.
  - Filtros solo por parámetros soportados por backend: `delivery_status` y `acknowledged`.
  - Paginación simple Previous/Next con `hasNext = results.length === limit`, sin total pages.
  - Botón `Acknowledge` visible solo con `alerts:write` y solo si `acknowledged === false`; refresca la query tras éxito.
- Archivos afectados:
  - `frontend/src/features/alerts/types.ts`
  - `frontend/src/features/alerts/contract.ts`
  - `frontend/src/features/alerts/api.ts`
  - `frontend/src/features/alerts/hooks/useAlertsQuery.ts`
  - `frontend/src/features/alerts/hooks/useAcknowledgeAlertMutation.ts`
  - `frontend/src/features/alerts/pages/AlertsPage.tsx`
  - `frontend/src/features/alerts/index.ts`
  - `frontend/src/features/alerts/api.test.ts`
  - `frontend/src/features/alerts/pages/AlertsPage.test.tsx`
  - `frontend/src/app/router/AppRouter.tsx`
  - `frontend/src/app/router/AppRouter.test.tsx`
  - `frontend/src/app/layouts/DashboardLayout.tsx`
  - `frontend/src/app/layouts/DashboardLayout.test.tsx`
  - `frontend/src/shared/i18n/translations.ts`
  - `frontend/src/architecture.test.ts`
- Verificación:
  - `npm run typecheck` → PASS.
  - `npm test -- src/features/alerts/api.test.ts src/features/alerts/pages/AlertsPage.test.tsx src/app/router/AppRouter.test.tsx src/app/layouts/DashboardLayout.test.tsx src/architecture.test.ts` → PASS, 5 files / 29 tests.

---

## M03 — Logs / Activity

**Prioridad:** MEDIUM  
**Área:** Frontend + posible Backend  
**Estado:** PENDING

### Problema

Existe permiso:

```txt
logs:read
```

pero no hay acceso claro desde el menú para auditoría operacional.

### Objetivo UX

Agregar una sección:

```txt
Logs
```

o:

```txt
Activity
```

Debe permitir:

- ver ejecuciones del pipeline,
- ver errores/estado de ejecución,
- ver actividad de usuarios si existe endpoint,
- filtrar por fecha/status/tipo si backend lo permite.

### Permisos involucrados

| Permiso | Efecto UI |
|---|---|
| `logs:read` | Ver menú y consultar logs |

### Backend esperado

Revisar antes de implementar:

- `backend/routers/logs.py`
- `backend/routers/activity.py`
- schemas de execution logs y user activity.

Definir si será una sola pantalla con pestañas:

```txt
Logs
├── Executions
└── User Activity
```

o dos menús separados. Preferencia inicial: **una sola pantalla** para no saturar navegación.

### Archivos probables

- `frontend/src/features/logs/`
- `frontend/src/app/router/AppRouter.tsx`
- `frontend/src/app/layouts/DashboardLayout.tsx`
- `frontend/src/shared/i18n/translations.ts`

### Criterios de aceptación

- Usuario con `logs:read` ve menú Logs/Activity.
- Usuario sin `logs:read` no ve menú ni accede a ruta.
- La pantalla tiene loading, empty y error states.
- No exponer datos sensibles innecesarios en UI.
- Tests focalizados pasan.
- `npm run typecheck` pasa.

### Commit sugerido

```txt
feat(frontend): add operational logs view
```

---

## M04 — Delete Users

**Prioridad:** MEDIUM  
**Área:** Frontend + posible Backend  
**Estado:** PENDING

### Problema

Existe permiso:

```txt
users:delete
```

pero la pantalla Users actualmente permite crear/editar usuarios, no borrarlos.

### Objetivo UX

Agregar interacción segura para eliminar usuarios existentes.

### Reglas de seguridad mínimas

- No permitir borrar el usuario actual si se puede identificar desde JWT.
- No permitir borrar el último admin si backend puede validar esa regla.
- Usar confirmación explícita.
- Preferir soft-delete/desactivación si backend no soporta DELETE seguro.

### Permisos involucrados

| Permiso | Efecto UI |
|---|---|
| `users:delete` | Ver botón Delete en Users |

### Backend esperado

Revisar antes de implementar:

- si existe `DELETE /api/users/{user_id}`,
- si hay tests backend para `users:delete`,
- si no existe endpoint, decidir entre:
  - crear backend DELETE seguro,
  - o documentar que el permiso queda reservado y usar `is_active=false` como operación segura.

### Archivos probables

- `frontend/src/features/users/api.ts`
- `frontend/src/features/users/hooks/useDeleteUserMutation.ts`
- `frontend/src/features/users/pages/UsersPage.tsx`
- `frontend/src/features/users/pages/UsersPage.test.tsx`
- posible backend: `backend/routers/users.py`, `backend/tests/test_users_router.py`.

### Criterios de aceptación

- Usuario con `users:delete` ve Delete.
- Usuario sin `users:delete` no ve Delete.
- Confirmación requerida antes de borrar.
- Query de usuarios se invalida/refresca luego de borrar.
- Errores 401/403/404 se muestran correctamente.
- Tests focalizados pasan.
- `npm run typecheck` pasa.

### Commit sugerido

```txt
feat(frontend): add safe user deletion controls
```

Si requiere backend:

```txt
feat(api): add safe user deletion endpoint
feat(frontend): add safe user deletion controls
```

---

## M05 — Navegación agrupada y consistencia UX de permisos

**Prioridad:** MEDIUM  
**Área:** Frontend  
**Estado:** PENDING

### Problema

Al agregar más pantallas, el sidebar puede quedar plano y ruidoso.

### Objetivo UX

Evaluar agrupar navegación por dominio:

```txt
Overview
├── Dashboard
├── Analytics

OSINT
├── Mentions
├── Threats
├── Keywords

Operations
├── Automation
├── Alerts
├── Logs

Administration
├── Users
├── Settings
```

### Reglas

- No mostrar grupos vacíos.
- Cada item sigue filtrado por permiso.
- Mantener navegación simple para demo.
- Si el agrupamiento complica demasiado, mantener lista plana y solo ordenar mejor.

### Archivos probables

- `frontend/src/app/layouts/DashboardLayout.tsx`
- `frontend/src/app/layouts/DashboardLayout.test.tsx`
- `frontend/src/shared/i18n/translations.ts`

### Criterios de aceptación

- Sidebar sigue accesible con roles parciales.
- Tests de visibilidad por permisos pasan.
- No se rompen snapshots/queries por nombre accesible.

### Commit sugerido

```txt
refactor(frontend): group dashboard navigation by domain
```

---

## M06 — Matriz final permiso → menú → acción → tests

**Prioridad:** MEDIUM  
**Área:** Docs + Tests  
**Estado:** PENDING

### Objetivo

Cerrar el ciclo documental y de pruebas dejando explícito que cada permiso tiene una representación UX.

### Entregable documental

Agregar una tabla final:

| Permiso | Ruta/Menu | Acción UI | Test esperado |
|---|---|---|---|
| `workflows:execute` | Automation | Run scan | botón visible solo con permiso |
| `alerts:write` | Alerts | revisar/resolver | acción visible solo con permiso |
| `logs:read` | Logs | ver logs | ruta protegida |
| `users:delete` | Users | delete user | confirmación requerida |

### Criterios de aceptación

- Documento actualizado con matriz final.
- Tests de router/layout cubren los nuevos permisos.
- Tests de página cubren acciones write/delete críticas.
- `npm run typecheck` pasa.

### Commit sugerido

```txt
docs: add final RBAC menu interaction matrix
```

---

## Orden recomendado de implementación

1. **M01 — Automation / Workflows**  
   Mayor valor de demo: permite ejecutar el pipeline OSINT manualmente.

2. **M02 — Alerts Center**  
   Cierra el ciclo operacional: detección → alerta → revisión.

3. **M03 — Logs / Activity**  
   Mejora trazabilidad y defensa técnica.

4. **M04 — Delete Users**  
   Útil pero más delicado; hacerlo después de revisar backend.

5. **M05 — Navegación agrupada**  
   Refactor visual cuando ya estén las pantallas principales.

6. **M06 — Matriz final**  
   Cierre documental y de pruebas.

---

## Riesgos generales

- **No inventar interacciones backend:** si el backend no persiste una acción, no presentarla como funcional.
- **No mezclar dominios en un commit:** Automation, Alerts, Logs y Users delete deben ir separados.
- **No confiar solo en ocultar botones:** backend debe seguir siendo autoridad real.
- **Evitar navegación inflada:** mostrar solo lo que el usuario puede usar según permisos.
- **Cuidar demo:** cada pantalla debe tener loading, empty, error y success states.

---

## Checklist previo a aplicar cada modificación

Antes de implementar cada Mxx:

1. Revisar endpoint backend real.
2. Revisar schema real de respuesta/request.
3. Confirmar permiso requerido en router backend.
4. Diseñar interacción mínima de UI.
5. Agregar ruta protegida.
6. Agregar item de menú filtrado por permiso.
7. Agregar API client + hooks.
8. Agregar tests API.
9. Agregar tests UI/permiso.
10. Ejecutar `npm run typecheck`.
11. Ejecutar tests focalizados.
12. Actualizar este plan con estado DONE y commit.
