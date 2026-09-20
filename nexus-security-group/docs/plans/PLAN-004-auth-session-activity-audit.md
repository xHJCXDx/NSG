# PLAN-004: Hardening de sesión y auditoría de actividad

**Estado:** PENDIENTE  
**Prioridad:** HIGH  
**Origen:** Revisión de comportamiento multi-pestaña, offline y KPI `activity_count` siempre en 0  
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`  

> **Estrategia de commits:** Conventional commits con scope. Branch: `develop`. Un commit por modificación completada. No ejecutar build; usar typecheck y tests focalizados.

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
| M02 | HIGH | Frontend API | Manejo centralizado de `401` y sesión expirada | PENDING |
| M03 | MEDIUM | Frontend UX | Errores claros para login/backend offline/red | PENDING |
| M04 | HIGH | Backend Audit | Helper/service `record_user_activity` | PENDING |
| M05 | HIGH | Backend Auth | Auditar login exitoso/fallido y logout | PENDING |
| M06 | HIGH | Backend Domain Actions | Auditar acciones críticas existentes | PENDING |
| M07 | MEDIUM | Dashboard/Logs | Verificar que `activity_count` y `/api/activity` reflejen eventos reales | PENDING |
| M08 | MEDIUM | Docs + Tests | Matriz final evento → endpoint → actividad → tests | PENDING |

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
**Estado:** PENDING

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

---

## M03 — Errores claros para login y pérdida de conexión

**Prioridad:** MEDIUM  
**Área:** Frontend UX  
**Estado:** PENDING

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

---

## M04 — Helper backend `record_user_activity`

**Prioridad:** HIGH  
**Área:** Backend Audit  
**Estado:** PENDING

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

---

## M05 — Auditar login exitoso/fallido y logout

**Prioridad:** HIGH  
**Área:** Backend Auth  
**Estado:** PENDING

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

---

## M06 — Auditar acciones críticas existentes

**Prioridad:** HIGH  
**Área:** Backend Domain Actions  
**Estado:** PENDING

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

---

## M07 — Verificar dashboard y logs con actividad real

**Prioridad:** MEDIUM  
**Área:** Dashboard/Logs  
**Estado:** PENDING

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

---

## M08 — Matriz final evento → endpoint → actividad → tests

**Prioridad:** MEDIUM  
**Área:** Docs + Tests  
**Estado:** PENDING

### Objetivo

Cerrar el plan dejando explícito qué eventos se auditan y dónde están cubiertos.

### Entregable documental

Agregar tabla final:

| Evento | Endpoint/UI | `activity_type` | Test |
|---|---|---|---|
| Login exitoso | `/api/auth/login` | `login_success` | pendiente |
| Login fallido | `/api/auth/login` | `login_failed` | pendiente |
| Acknowledge alerta | `/api/alerts/{id}/acknowledge` | `acknowledge_alert` | pendiente |
| Desactivar usuario | `/api/users/{id}` | `deactivate_user` | pendiente |

### Criterios de aceptación

- Documento actualizado.
- Todos los eventos implementados figuran en la matriz.
- Tests focalizados ejecutados y registrados.

### Commit sugerido

```txt
docs: add auth session and activity audit matrix
```

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
