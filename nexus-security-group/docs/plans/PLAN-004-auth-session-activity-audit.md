# PLAN-004: Hardening de sesión y auditoría de actividad

**Estado:** COMPLETADO  
**Prioridad:** HIGH  
**Origen:** Revisión de comportamiento multi-pestaña, offline y KPI `activity_count` siempre en 0  
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`  

> **Estrategia de commits:** Conventional commits con scope. Branch: `develop`. Un commit por modificación completada. No ejecutar build; usar typecheck y tests focalizados.

---

## Cierre ejecutivo

PLAN-004 quedó completado de punta a punta. El sistema pasó de tener un KPI `activity_count` técnicamente correcto pero operativo/decorativo —porque leía una tabla sin productores reales— a tener eventos reales de sesión, autenticación y acciones críticas registrados en `user_activity`.

El cierre cubre tres frentes:

1. **Hardening de sesión frontend**: sincronización multi-pestaña, limpieza ante `401` y mensajes de login/red diferenciados.
2. **Auditoría backend real**: helper centralizado `record_user_activity`, eventos de auth y eventos de dominio críticos.
3. **Trazabilidad verificable**: tests focalizados para productores, consumidores (`dashboard`/`activity`) y matriz final evento → endpoint → test.

### Estado final

- **M01:** DONE — sincronización multi-pestaña.
- **M02:** DONE — limpieza de sesión ante `401`.
- **M03:** DONE — errores claros de login/backend/red.
- **M04:** DONE — helper backend `record_user_activity`.
- **M05:** DONE — auditoría de login/logout.
- **M06:** DONE — auditoría de acciones críticas.
- **M07:** DONE — verificación dashboard/logs.
- **M08:** DONE — matriz final de trazabilidad.

### Checklist de cierre

- [x] Documentación del plan actualizada.
- [x] Commits convencionales por modificación.
- [x] Tests focalizados registrados en cada etapa.
- [x] Matriz final con referencias `archivo::test` verificadas contra archivos reales.
- [x] Sin cambios de contrato API innecesarios.
- [x] Sin paginación fake en `/api/activity`.
- [x] Sin persistencia de passwords, JWTs, tokens, hashes ni `webhook_id` crudo en auditoría.

### Limitaciones conocidas / fuera de alcance

- El logout sigue siendo **stateless/client-side acknowledgment**: no invalida JWT en servidor. Una blacklist de tokens, refresh tokens o sesiones server-side queda fuera de este plan.
- `/api/activity` mantiene el contrato actual: filtros y `limit`, sin `offset`; por eso la UI no debe mostrar paginación Previous/Next artificial.
- n8n no guarda `webhook_id` crudo; registra `webhook_ref` hash corto no reversible. No se agregó catálogo semántico de workflows.
- La auditoría es best-effort donde corresponde: no debe tumbar flujos críticos secundarios por fallos de logging/audit.
- No se implementó cola offline ni sincronización diferida de mutaciones.

---

## Problema

El sistema ya valida login y permisos en backend, pero todavía tiene huecos operativos:

1. El JWT se guarda en `localStorage`, pero las pestañas no sincronizan estado de login/logout automáticamente.
2. `authFetch` solo adjunta `Authorization`; no hay limpieza centralizada ante `401 Unauthorized`.
3. Los errores de red/login no distinguen claramente credenciales inválidas, backend caído o pérdida de conexión.
4. El KPI `activity_count` cuenta filas de `user_activity`, pero no hay productor de eventos de actividad en código productivo.
5. `/api/activity` y el dashboard ya leen actividad, pero la tabla queda vacía salvo carga externa/manual.

---

## Objetivo

Endurecer la sesión de usuario y hacer que el conteo de actividad represente acciones reales del sistema, manteniendo al backend como autoridad.

---

## Índice de modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|---|---|---|---|
| M01 | HIGH | Frontend Auth | Sincronización multi-pestaña de login/logout/token | DONE |
| M02 | HIGH | Frontend API | Manejo centralizado de `401` y sesión expirada | DONE |
| M03 | MEDIUM | Frontend UX | Errores claros para login/backend offline/red | DONE |
| M04 | HIGH | Backend Audit | Helper/service `record_user_activity` | DONE |
| M05 | HIGH | Backend Auth | Auditar login exitoso/fallido y logout | DONE |
| M06 | HIGH | Backend Domain Actions | Auditar acciones críticas existentes | DONE |
| M07 | MEDIUM | Dashboard/Logs | Verificar que `activity_count` y `/api/activity` reflejen eventos reales | DONE |
| M08 | MEDIUM | Docs + Tests | Matriz final evento → endpoint → actividad → tests | DONE |

---

## M01 — Sincronización multi-pestaña de sesión

**Prioridad:** HIGH  
**Área:** Frontend Auth  
**Estado:** DONE

### Objetivo

Que login/logout/token removal se refleje entre pestañas abiertas sin requerir refresh manual.

### Alcance técnico

- Escuchar evento `storage` en `AuthContext`.
- Si cambia `nsg:auth:token`:
  - actualizar estado local del contexto.
  - si el token se elimina, dejar la pestaña como no autenticada.
  - si aparece/cambia un token válido, cargarlo.
- Mantener limpieza de token expirado.
- Evitar loops innecesarios: el evento `storage` se dispara en otras pestañas, no en la misma.

### Archivos esperados

- `frontend/src/features/auth/AuthContext.tsx`
- `frontend/src/features/auth/AuthContext.test.tsx`
- `frontend/src/shared/storage/tokenStorage.ts` si se necesita exportar la key.

### Criterios de aceptación

- Logout en pestaña A desautentica pestaña B.
- Login/token change en pestaña A actualiza pestaña B.
- Token expirado sigue limpiándose.
- Tests cubren evento `storage`.

### Commit sugerido

```txt
fix(frontend): sync auth state across browser tabs
```

### Resultado

- `TOKEN_STORAGE_KEY` exportado desde `frontend/src/shared/storage/tokenStorage.ts` para evitar duplicar strings mágicos.
- `AuthContext` ahora inicializa sesión desde un token almacenado válido y elimina tokens expirados desde el arranque.
- `AuthContext` escucha eventos `storage`:
  - `nsg:auth:token` agregado/cambiado → actualiza sesión local.
  - `nsg:auth:token` eliminado → deja la pestaña como anónima.
  - `localStorage.clear()` en otra pestaña → re-sincroniza desde storage.
  - cambios no relacionados, como `theme`, se ignoran.
- Tests agregados para login/logout multi-pestaña y cambios no relacionados.

### Archivos modificados

- `frontend/src/features/auth/AuthContext.tsx`
- `frontend/src/features/auth/AuthContext.test.tsx`
- `frontend/src/shared/storage/tokenStorage.ts`
- `frontend/src/shared/storage/tokenStorage.test.ts`
- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- `npm run typecheck` desde `frontend/` → PASS.
- `npm test -- src/features/auth/AuthContext.test.tsx src/shared/storage/tokenStorage.test.ts` desde `frontend/` → PASS, 2 files / 11 tests.

### Commit

```txt
99a8f8e fix(frontend): sync auth state across browser tabs
```

---

## M02 — Manejo centralizado de `401` y sesión expirada

**Prioridad:** HIGH  
**Área:** Frontend API  
**Estado:** DONE

### Objetivo

Si el backend rechaza el token, el frontend debe limpiar sesión de forma consistente.

### Alcance técnico

- Extender `authFetch` para detectar `401 Unauthorized`.
- Definir mecanismo central sin acoplar `apiClient` a React Router:
  - opción recomendada: emitir evento custom `nsg:auth:unauthorized`.
  - `AuthContext` escucha ese evento, limpia token y actualiza estado.
- No limpiar sesión ante `403 Forbidden`: eso es falta de permiso, no sesión inválida.
- No limpiar sesión ante errores de red: red caída no significa token inválido.

### Archivos esperados

- `frontend/src/shared/api/apiClient.ts`
- `frontend/src/features/auth/AuthContext.tsx`
- tests de `apiClient` y `AuthContext`.

### Criterios de aceptación

- `401` borra token y fuerza estado no autenticado.
- `403` conserva token.
- error de red conserva token.
- Tests verifican los tres casos.

### Commit sugerido

```txt
fix(frontend): clear auth session on unauthorized responses
```

### Resultado

- `authFetch` ahora detecta respuestas `401 Unauthorized` y emite el evento custom `nsg:auth:unauthorized`.
- `AuthContext` escucha `nsg:auth:unauthorized`, elimina el token persistido y actualiza el estado local a sesión anónima.
- El mecanismo queda desacoplado de React Router: la capa API no navega ni conoce rutas.
- `403 Forbidden` no limpia la sesión, porque representa falta de permiso y no token inválido.
- Errores de red/rechazos de `fetch` no limpian la sesión, porque conectividad caída no invalida credenciales.

### Archivos modificados

- `frontend/src/shared/api/apiClient.ts`
- `frontend/src/shared/api/apiClient.test.ts`
- `frontend/src/features/auth/AuthContext.tsx`
- `frontend/src/features/auth/AuthContext.test.tsx`
- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- `npm test -- src/features/auth/AuthContext.test.tsx src/shared/api/apiClient.test.ts` desde `frontend/` → PASS, 2 files / 13 tests.
- `npm run typecheck` desde `frontend/` → PASS.

---

## M03 — Errores claros para login y pérdida de conexión

**Prioridad:** MEDIUM  
**Área:** Frontend UX  
**Estado:** DONE

### Objetivo

Mostrar errores correctos para credenciales inválidas, backend caído y pérdida de conexión.

### Alcance técnico

- Mejorar `loginWithCredentials`:
  - `401`: credenciales inválidas.
  - `429`: demasiados intentos.
  - `503`/`5xx`: servicio no disponible.
  - `TypeError`/fetch rejection: posible problema de red.
- Mantener validación frontend de campos antes del request.
- Agregar strings i18n EN/ES.

### Archivos esperados

- `frontend/src/features/auth/api.ts`
- `frontend/src/features/auth/LoginView.tsx`
- `frontend/src/features/auth/LoginView.test.tsx`
- `frontend/src/shared/i18n/translations.ts`

### Criterios de aceptación

- Credenciales inválidas no se confunden con offline.
- Rate limit muestra mensaje entendible.
- Backend caído muestra mensaje de servicio no disponible.
- Tests cubren errores principales.

### Commit sugerido

```txt
fix(frontend): clarify login network and auth errors
```

### Resultado

- `loginWithCredentials` ahora clasifica los fallos de login con `LoginError` y códigos estables:
  - `401` → credenciales inválidas.
  - `429` → demasiados intentos.
  - `503`/`5xx` → servicio de autenticación no disponible.
  - rechazo de `fetch`/`TypeError` → posible problema de conexión.
- `LoginView` mantiene la validación frontend antes del request y traduce los códigos a mensajes i18n.
- Se agregaron mensajes EN/ES para credenciales inválidas, rate limit, servicio no disponible, red y fallback genérico.
- Tests cubren éxito, validaciones locales y los errores principales de login.

### Archivos modificados

- `frontend/src/features/auth/api.ts`
- `frontend/src/features/auth/api.test.ts`
- `frontend/src/features/auth/LoginView.tsx`
- `frontend/src/features/auth/LoginView.test.tsx`
- `frontend/src/shared/i18n/translations.ts`
- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- `npm test -- src/features/auth/api.test.ts src/features/auth/LoginView.test.tsx` desde `frontend/` → PASS, 2 files / 14 tests.
- `npm run typecheck` desde `frontend/` → PASS.

---

## M04 — Helper backend `record_user_activity`

**Prioridad:** HIGH  
**Área:** Backend Audit  
**Estado:** DONE

### Objetivo

Centralizar la escritura de auditoría en `user_activity` para evitar duplicación y errores inconsistentes.

### Alcance técnico

- Crear helper/service backend, por ejemplo:
  - `backend/services/activity_audit.py`
- Firma sugerida:

```py
def record_user_activity(
    db: Session,
    *,
    username: str,
    user_role: str | None,
    activity_type: str,
    activity_description: str | None = None,
    related_mention_id: int | None = None,
    related_detection_id: int | None = None,
    related_alert_id: int | None = None,
    request: Request | None = None,
    activity_data: dict | None = None,
) -> None:
    ...
```

- Capturar opcionalmente:
  - IP (`request.client.host` si existe).
  - User-Agent.
  - Session id si más adelante se agrega.
- No romper la acción principal si falla la auditoría, salvo que se decida lo contrario.
- Loggear warning si la auditoría falla.

### Decisión recomendada

La auditoría debe ser **best-effort** para este prototipo: si falla registrar actividad, no debe impedir login/acknowledge/update. Motivo: la tabla de auditoría no debe tumbar flujos críticos por errores secundarios.

### Archivos esperados

- `backend/services/activity_audit.py`
- `backend/tests/test_activity_audit_service.py`

### Criterios de aceptación

- Helper inserta `UserActivity` con campos esperados.
- Helper soporta request opcional.
- Fallo de insert puede manejarse sin romper flujo principal.

### Commit sugerido

```txt
feat(api): add user activity audit service
```

### Resultado

- Se creó `services.activity_audit.record_user_activity` como helper best-effort para centralizar la creación de filas `UserActivity`.
- El helper hace `db.add(...)` sin `commit`, manteniendo la transacción bajo control del caller.
- Captura opcionalmente IP (`request.client.host`) y User-Agent cuando se recibe `request`, y permite pasar `session_id` porque el modelo ya lo soporta.
- Ante fallos al registrar auditoría, loggea warning y no propaga la excepción al flujo principal.

### Archivos modificados

- `backend/services/__init__.py`
- `backend/services/activity_audit.py`
- `backend/tests/test_activity_audit_service.py`
- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- `python -m pytest tests/test_activity_audit_service.py` desde `backend/` → PASS, 4 tests.

---

## M05 — Auditar login exitoso/fallido y logout

**Prioridad:** HIGH  
**Área:** Backend Auth  
**Estado:** DONE

### Objetivo

Registrar eventos de autenticación relevantes.

### Eventos mínimos

| Evento | `activity_type` sugerido | Cuándo |
|---|---|---|
| Login exitoso | `login_success` | Credenciales válidas y token emitido |
| Login fallido | `login_failed` | Usuario inexistente, inactivo o password incorrecto |
| Logout | `logout` | Cliente llama `/api/auth/logout` |

### Consideraciones

- Login fallido puede no tener `user_id` ni rol.
- No guardar password ni tokens en `activity_data`.
- Logout actual no recibe usuario autenticado; para auditarlo correctamente debería aceptar token opcional/obligatorio o mantenerse como ack cliente. Definir antes de implementar.

### Archivos esperados

- `backend/auth.py`
- `backend/tests/test_auth.py` o tests existentes de auth.

### Criterios de aceptación

- Login exitoso crea actividad.
- Login fallido crea actividad sin filtrar secretos.
- Logout auditado si hay usuario autenticado disponible.
- Tests verifican inserción y no exposición de password/token.

### Commit sugerido

```txt
feat(api): audit authentication activity
```

### Resultado

- `/api/auth/login` registra `login_success` después de emitir credenciales válidas, sin persistir JWTs ni passwords en `activity_data`.
- `/api/auth/login` registra `login_failed` para credenciales inválidas o usuario inactivo, usando `user_role=None` para no afirmar roles en intentos fallidos.
- La auditoría auth es best-effort: si falla el insert/commit de actividad, se loggea warning, se intenta rollback y no se rompe el flujo primario de auth.
- Decisión logout: se preservó la compatibilidad del endpoint stateless. `/api/auth/logout` sigue respondiendo sin requerir token; solo audita `logout` cuando recibe un bearer token válido y puede obtener un usuario autoritativo desde el JWT.

### Archivos modificados

- `backend/auth.py`
- `backend/tests/test_auth.py`
- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- `python -m pytest tests/test_auth.py` desde `backend/` → PASS, 29 tests.

---

## M06 — Auditar acciones críticas existentes

**Prioridad:** HIGH  
**Área:** Backend Domain Actions  
**Estado:** DONE

### Objetivo

Que `activity_count` suba con acciones reales del sistema, no con datos artificiales.

### Eventos mínimos

| Acción | Endpoint/área | `activity_type` sugerido |
|---|---|---|
| Acknowledge de alerta | `PATCH /api/alerts/{id}/acknowledge` | `acknowledge_alert` |
| Crear keyword | `POST /api/keywords` | `create_keyword` |
| Editar keyword | `PATCH /api/keywords/{id}` | `update_keyword` |
| Borrar keyword | `DELETE /api/keywords/{id}` | `delete_keyword` |
| Crear usuario | `POST /api/users` | `create_user` |
| Editar usuario | `PATCH /api/users/{id}` | `update_user` |
| Desactivar usuario | `DELETE /api/users/{id}` | `deactivate_user` |
| Ejecutar workflow manual | Automation/n8n trigger backend | `execute_workflow` |

### Consideraciones

- No guardar secretos, passwords ni tokens en `activity_data`.
- Para cambios de usuario, registrar usuario objetivo y campos cambiados, no valores sensibles.
- Para keywords, evitar volcar datos innecesarios si pudieran ser sensibles.
- En acciones destructivas, registrar resultado exitoso después de confirmar operación.

### Archivos esperados

- `backend/routers/alerts.py`
- `backend/routers/keywords.py`
- `backend/routers/users.py`
- router/backend de automation/n8n si existe endpoint de ejecución manual.
- tests correspondientes.

### Criterios de aceptación

- Cada acción crítica exitosa crea una fila en `user_activity`.
- Acciones fallidas por validación/permisos no generan evento de éxito.
- Tests verifican `activity_type`, username, rol y relación cuando aplique.

### Commit sugerido

```txt
feat(api): audit critical user actions
```

### Resultado

- `PATCH /api/alerts/{alert_id}/acknowledge` registra `acknowledge_alert` en la misma transacción que el acknowledge exitoso, con `related_alert_id` y metadata mínima (`alert_id`).
- `POST /api/keywords`, `PATCH /api/keywords/{keyword_id}` y `DELETE /api/keywords/{keyword_id}` registran `create_keyword`, `update_keyword` y `delete_keyword` sólo en rutas exitosas. La metadata evita volcar el texto/description de la keyword y usa `keyword_id` más `changed_fields` cuando aplica.
- `POST /api/users`, `PATCH /api/users/{user_id}` y `DELETE /api/users/{user_id}` registran `create_user`, `update_user` y `deactivate_user`. Los cambios de usuario auditan usuario objetivo y campos modificados; no guardan passwords, hashes, JWTs ni tokens.
- Automation/n8n: existe `POST /api/n8n/webhook/{webhook_id}` como endpoint backend de ejecución/proxy manual de workflows. Se audita `execute_workflow` sólo cuando n8n responde con status `< 400`; errores de transporte o respuestas `4xx/5xx` no generan evento de éxito. El `webhook_id` no se persiste raw en descripción ni metadata: se registra sólo un `webhook_ref` no reversible. La auditoría n8n es best-effort: si falla el commit/rollback del evento de actividad, se loggea warning y no se rompe la respuesta exitosa del workflow.

### Archivos modificados

- `backend/routers/alerts.py`
- `backend/routers/keywords.py`
- `backend/routers/users.py`
- `backend/routers/n8n.py`
- `backend/tests/test_alerts_router.py`
- `backend/tests/test_keywords_router.py`
- `backend/tests/test_users_router.py`
- `backend/tests/test_n8n.py`
- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- `python -m pytest tests/test_alerts_router.py tests/test_keywords_router.py tests/test_users_router.py tests/test_n8n.py` desde `backend/` → PASS, 71 tests.

---

## M07 — Verificar dashboard y logs con actividad real

**Prioridad:** MEDIUM  
**Área:** Dashboard/Logs  
**Estado:** DONE

### Objetivo

Comprobar que el KPI `activity_count` y la pantalla Logs → User Activity reflejen eventos generados por acciones reales.

### Alcance técnico

- Tests backend de dashboard summary con actividades reales insertadas.
- Tests de `/api/activity` con eventos creados por helper o fixtures equivalentes.
- Frontend probablemente no requiere cambios si el contrato de respuesta no cambia.

### Archivos esperados

- `backend/tests/test_dashboard_router.py`
- `backend/tests/test_activity_router.py`
- frontend tests solo si cambian mensajes/contrato.

### Criterios de aceptación

- `activity_count` deja de ser un contador muerto.
- `/api/activity` lista eventos recientes.
- No se agregan paginaciones falsas: si backend sigue sin `offset`, UI sigue sin Previous/Next.

### Commit sugerido

```txt
test(api): verify dashboard activity audit counts
```

### Resultado

- Se agregó cobertura backend que crea filas `UserActivity` mediante `record_user_activity` y verifica que el dashboard summary las cuenta en `activity_count`.
- Se agregó cobertura backend para `/api/activity` usando eventos producidos por el helper de auditoría, tanto en llamada directa al router como vía endpoint autenticado con `logs:read`.
- No hubo cambios de contrato API ni cambios frontend: el backend sigue exponiendo `limit`, `username` y `activity_type`, sin `offset`, por lo que no se agregó paginación fake.

### Archivos modificados

- `backend/tests/test_dashboard_router.py`
- `backend/tests/test_activity_router.py`
- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- `python -m pytest tests/test_dashboard_router.py tests/test_activity_router.py` desde `backend/` → PASS, 23 tests.

---

## M08 — Matriz final evento → endpoint → actividad → tests

**Prioridad:** MEDIUM  
**Área:** Docs + Tests  
**Estado:** DONE

### Objetivo

Cerrar el plan dejando explícito qué eventos se auditan y dónde están cubiertos.

### Entregable documental

Agregar tabla final:

| Evento | Endpoint/UI | `activity_type` | Test |
|---|---|---|---|
| Login exitoso bootstrap | `POST /api/auth/login` | `login_success` | `backend/tests/test_auth.py::test_login_success` |
| Login exitoso DB user | `POST /api/auth/login` | `login_success` | `backend/tests/test_auth.py::test_login_db_user_success` |
| Login fallido por usuario inactivo | `POST /api/auth/login` | `login_failed` | `backend/tests/test_auth.py::test_login_inactive_db_user_returns_401` |
| Login fallido por usuario inexistente | `POST /api/auth/login` | `login_failed` | `backend/tests/test_auth.py::test_login_nonexistent_db_user_audits_failed_login_without_secret_exposure` |
| Login fallido por password incorrecto | `POST /api/auth/login` | `login_failed` | `backend/tests/test_auth.py::test_login_wrong_password` |
| Logout autenticado | `POST /api/auth/logout` | `logout` | `backend/tests/test_auth.py::test_logout_with_valid_token_audits_user_without_exposing_token` |
| Logout sin token | `POST /api/auth/logout` | _no audita_ | `backend/tests/test_auth.py::test_logout_without_token_preserves_ack_and_skips_audit` |
| Acknowledge alerta | `PATCH /api/alerts/{alert_id}/acknowledge` | `acknowledge_alert` | `backend/tests/test_alerts_router.py::test_acknowledge_alert_updates_fields_commits_refreshes_and_returns_response` |
| Crear keyword | `POST /api/keywords` | `create_keyword` | `backend/tests/test_keywords_router.py::test_create_keyword_adds_commits_refreshes_and_returns_response_valid_object` |
| Editar keyword | `PATCH /api/keywords/{keyword_id}` | `update_keyword` | `backend/tests/test_keywords_router.py::test_update_keyword_changes_only_provided_fields_commits_and_refreshes` |
| Borrar keyword | `DELETE /api/keywords/{keyword_id}` | `delete_keyword` | `backend/tests/test_keywords_router.py::test_delete_keyword_deletes_and_commits` |
| Crear usuario | `POST /api/users` | `create_user` | `backend/tests/test_users_router.py::test_admin_creates_user_hashes_password_and_response_has_no_secret` |
| Editar usuario | `PATCH /api/users/{user_id}` | `update_user` | `backend/tests/test_users_router.py::test_admin_patches_user_role_active_and_password` |
| Desactivar usuario | `DELETE /api/users/{user_id}` | `deactivate_user` | `backend/tests/test_users_router.py::test_valid_delete_soft_deactivates_and_does_not_physically_remove_user` |
| Ejecutar workflow n8n JSON | `POST /api/n8n/webhook/{webhook_id}` | `execute_workflow` | `backend/tests/test_n8n.py::test_proxy_webhook_uses_settings_url` |
| Ejecutar workflow n8n no JSON | `POST /api/n8n/webhook/{webhook_id}` | `execute_workflow` | `backend/tests/test_n8n.py::test_proxy_webhook_passes_through_non_json_workflow_response` |
| Falla de auditoría n8n post-éxito | `POST /api/n8n/webhook/{webhook_id}` | `execute_workflow` best-effort | `backend/tests/test_n8n.py::test_proxy_webhook_audit_commit_failure_does_not_break_success_response` |
| Dashboard cuenta actividad real | `GET /api/dashboard/summary` | `activity_count` | `backend/tests/test_dashboard_router.py::test_dashboard_summary_counts_helper_generated_user_activity_rows` |
| Logs lista actividad real | `GET /api/activity` | lista `UserActivity` | `backend/tests/test_activity_router.py::test_get_activities_endpoint_returns_helper_generated_activity_with_logs_read_permission` |

### Criterios de aceptación

- Documento actualizado.
- Todos los eventos implementados figuran en la matriz.
- Tests focalizados ejecutados y registrados.

### Commit sugerido

```txt
docs: add auth session and activity audit matrix
```

### Resultado

- Se completó la matriz final evento → endpoint/UI → `activity_type` → test focalizado.
- La matriz incluye eventos positivos, decisiones explícitas de no-auditoría (`logout` sin token) y salvaguardas de seguridad/transacción para n8n.
- Se dejó documentado que dashboard/logs consumen eventos reales generados por el helper y que no se agregó paginación fake.

### Archivos modificados

- `docs/plans/PLAN-004-auth-session-activity-audit.md`

### Verificación

- Verificación documental contra tests existentes de M05, M06 y M07.
- No se ejecutaron tests nuevos: M08 no modifica código productivo ni tests.

---

## Orden recomendado

1. **M01 — Multi-pestaña**  
   Primero cerrar consistencia de sesión en frontend.

2. **M02 — `401` centralizado**  
   Evita estados zombis cuando backend invalida/rechaza token.

3. **M03 — Errores de login/red**  
   Mejora UX y reduce confusión durante fallos reales.

4. **M04 — Audit service**  
   Base técnica para no duplicar inserts.

5. **M05 — Auth audit**  
   Login/logout son los eventos de sesión mínimos.

6. **M06 — Domain action audit**  
   Hace útil `activity_count`.

7. **M07 — Dashboard/logs verification**  
   Confirma que el dato llega de punta a punta.

8. **M08 — Matriz final**  
   Cierre documental.

---

## Riesgos y decisiones

### Riesgo: auditoría dentro de la misma transacción

Si se hace `commit` separado dentro del helper, se puede romper la transacción principal. Si se usa la misma sesión sin commit, depende del commit del router.

**Decisión recomendada:** el helper debe hacer `db.add(...)` y dejar que el flujo principal controle commit/rollback, salvo eventos auth donde el router ya maneja su propio flujo.

### Riesgo: registrar secretos

Nunca guardar passwords, JWTs, refresh tokens, headers completos ni datos sensibles en `activity_data`.

### Riesgo: logout stateless

El logout actual es client-side acknowledgment; no invalida JWT en servidor. Si se requiere invalidación real, eso es otro plan: token blacklist/refresh tokens/sesiones server-side.

### Riesgo: offline real

Este plan cubre UX de error y consistencia básica. No incluye cola offline ni sincronización diferida de mutaciones.

---

## Verificación mínima final

- Frontend:
  - `npm run typecheck`
  - tests focalizados de auth, apiClient y login.
- Backend:
  - tests focalizados de auth, activity audit service, routers auditados, dashboard/activity.
- Manual:
  - abrir dos pestañas, login/logout en una y observar la otra.
  - simular `401` y confirmar limpieza de sesión.
  - ejecutar acción auditada y confirmar que sube `activity_count`.
