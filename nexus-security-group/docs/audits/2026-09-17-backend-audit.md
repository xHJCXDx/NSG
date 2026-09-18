# Backend Audit — NSG Dashboard API

**Fecha:** 2026-09-17
**Stack:** FastAPI 0.115 + SQLAlchemy 2.0 + PostgreSQL 15 + Pydantic v2 + Python 3.11

---

## Resumen Ejecutivo

| Area | Rating |
|------|--------|
| Arquitectura & Estructura | ACCEPTABLE |
| Diseno de API | ACCEPTABLE |
| Auth & Autorizacion | PROFESSIONAL |
| Validacion de Input | PROFESSIONAL |
| Manejo de Errores | PROFESSIONAL |
| Base de Datos | ACCEPTABLE |
| Seguridad | NEEDS WORK |
| Configuracion | PROFESSIONAL |
| Tests | PROFESSIONAL |
| Logging & Monitoreo | CRITICAL |
| Calidad de Codigo | PROFESSIONAL |
| Documentacion API | ACCEPTABLE |
| Dependencias | NEEDS WORK |

---

## 1. Arquitectura & Estructura — ACCEPTABLE

Separacion en capas: `routers/` -> `models/` -> `schemas/`. `models/__init__.py` documenta orden de dependencia FK.

### Problemas

- **Sin capa de servicio.** Logica de negocio directamente en routers. `threats.py` hace mapeo manual, `permissions.py` resuelve logica de asignacion, `dashboard.py` hace 7 queries. No hay `services/`, no hay repositorios.
- **`auth.py` hace demasiado.** Router + hashing + factory de dependencias + logica de autenticacion + serializacion de permisos. 237 lineas, responsabilidades mezcladas.
- **Sin Alembic.** Sin migraciones. Schema en `init.sql`. Cambio de schema = recrear DB o ALTER TABLE manual.

---

## 2. Diseno de API — ACCEPTABLE

Prefijos consistentes `/api/*`. Status codes correctos: 201, 204, 404, 409, 503. `response_model` en todos los endpoints (test contractual lo verifica).

### Problemas

- **Sin paginacion real.** Todos los endpoints de lista usan `limit` sin `offset` ni cursor. No hay forma de obtener pagina 2.
  - `routers/alerts.py:17` — `limit: int = 50` sin offset
  - `routers/threats.py:50` — idem
  - `routers/logs.py:17` — idem
- **`GET /api/users` sin paginacion.** Lista todos sin limite. `routers/users.py:38`.
- **`GET /api/dashboard/summary` hace 7 queries** sin transaccion. Conteos pueden ser inconsistentes. `dashboard.py:20-37`.
- **Naming inconsistente en `metrics.py:67`.** Respuesta mapea `mention_id` -> `id`, `text_content` -> `text`. Nombres distintos al modelo.

---

## 3. Auth & Autorizacion — PROFESSIONAL

- **Bootstrap admin inteligente.** Sin usuarios en DB -> admin de ENV disponible. Con usuarios -> bloqueado. `auth.py:189-219`.
- **RBAC granular.** `resource:action` format. `require_permission()` factory limpia.
- **`hmac.compare_digest`** para bootstrap admin. Previene timing attacks. `auth.py:211`.
- **Permisos en JWT.** Sin round-trip a DB en cada request.
- **Normalizacion** con lowercase + strip. `auth.py:106-107`.

### Problemas

- **Sin token refresh.** `ACCESS_TOKEN_EXPIRE_MINUTES = 60`. Analista trabajando 8h tiene que re-loguearse.
- **Logout es placeholder.** `auth.py:233-236`. Sin blacklist de tokens, sin revocacion. Token robado sigue valido.
- **Password policy minima.** `schemas/user.py:10`: min 8 chars. Sin validacion de complejidad (mayusculas, numeros, simbolos).
- **`ThreatReviewRequest` acepta `reviewed_by` del cliente.** `schemas/threat.py:106`. Router lo ignora y usa `current_user.username`, pero el schema lo acepta. Eliminar campo.
- **`AcknowledgeRequest` acepta `acknowledged_by` del cliente.** `schemas/alert.py:46-55`. Mismo problema.

---

## 4. Validacion de Input — PROFESSIONAL

- `Annotated` types con `StringConstraints` en todos los schemas.
- `Query(ge=1, le=100)` en parametros de limite.
- `model_dump(exclude_unset=True)` en PATCH para partial updates reales.
- `@model_validator(mode="after")` en `UserUpdate`.
- `@field_validator` en `RolePermissionsUpdate` para formato `resource:action`.
- Test contractual AST verifica NO raw SQL.

### Problemas

- **`workflow_name` filter es exact match.** `logs.py:29`. Deberia ser ILIKE.
- **`activity_type` acepta cualquier string.** `activity.py:21`. Sin validacion contra enum.

---

## 5. Manejo de Errores — PROFESSIONAL

- `HTTPException` con `status.HTTP_*` constants. Sin numeros magicos (test contractual lo verifica).
- `IntegrityError` capturada con rollback + 409 en users, keywords, permissions.
- `SQLAlchemyError` capturada en login -> 503.
- n8n proxy captura `httpx.HTTPError` -> 502.

### Problemas

- **Sin exception handler global.** No hay `@app.exception_handler(Exception)` en `main.py`. Un error no previsto devuelve 500 con stacktrace en produccion.
- **`permissions.py:75`** hace `delete()` seguido de inserts sin transaccion explicita. Si inserts fallan, delete ya ocurrio.

---

## 6. Base de Datos — ACCEPTABLE

- Modelos SQLAlchemy 2.0 con tipos correctos.
- `CheckConstraint` en todos los enums.
- `UniqueConstraint` donde corresponde.
- FK con `ondelete="CASCADE"` / `"SET NULL"` segun semantica.
- Tipos PostgreSQL: `ARRAY`, `JSONB`, `INET`, `UUID`.
- Indices en `SystemUser.username` y `SystemUser.is_active`.
- `server_default` en vez de `default`.

### Problemas

- **Sin Alembic.** Schema en `init.sql`. Sin migraciones.
- **`get_db()` sin rollback explicito.** `database.py:11-16`. Si commit falla, sesion se cierra sin rollback.
- **N+1 en `dashboard.py`.** 7 queries separadas para un resumen.
- **`db.query(Model).count()`** en vez de `func.count().scalar()`. `dashboard.py:21`.
- **Sin indices en columnas de filtrado.** `Alert.delivery_status`, `Alert.acknowledged`, `ThreatDetection.review_status`, `ThreatDetection.criticality_level`, `ExecutionLog.status`, `ExecutionLog.workflow_name`.
- **`create_engine` sin pool config.** `database.py:6`. Usa defaults (`pool_size=5`, `max_overflow=10`).

---

## 7. Seguridad — NEEDS WORK

- CORS via env var `CORS_ORIGINS`.
- PBKDF2-SHA256 a 600.000 iteraciones.
- Soporte bcrypt legacy para migracion progresiva.
- JWT con expiracion.

### Problemas

- **Sin rate limiting.** `/api/auth/login` sin proteccion contra fuerza bruta. Sin `slowapi`.
- **CORS default permisivo.** `main.py:12`. Si `CORS_ORIGINS` no esta seteado, default incluye `localhost`.
- **Sin security headers.** No hay `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`.
- **`JWT_SECRET_KEY` sin validacion de longitud.** `config.py:5`. Un secreto de 4 chars es valido.
- **n8n proxy sin sanitizacion de body.** `n8n.py:33-47`. Sin validacion de Content-Type ni tamano maximo.
- **Dockerfile sin usuario non-root.** `Dockerfile:6`. Proceso corre como root.

---

## 8. Configuracion — PROFESSIONAL

- `pydantic-settings` con `BaseSettings`. Variables requeridas fallan al arrancar si no estan.
- Sin `os.getenv()` en modulos (test contractual lo verifica).
- `.env` en `.dockerignore`.

### Problemas

- **`CORS_ORIGINS` no esta en `Settings`.** Se lee con `os.getenv()` en `main.py:12`. Inconsistente.
- **Sin distincion de entorno.** No hay `ENV=production|development`.
- **`requirements.txt` sin lock.** Dependencias pinned pero sin lock de transitivas.

---

## 9. Tests — PROFESSIONAL

- **Tests contractuales AST:** `test_no_raw_sql_contract.py`, `test_error_payloads_contract.py`, `test_router_response_models_contract.py`, `test_route_auth_contract.py`.
- Fake objects (FakeDb, FakeQuery) en vez de mocks.
- `dependency_overrides` de FastAPI para auth.
- Tests de autorizacion: 401 sin token, 403 sin permiso, 200 con permiso.

### Problemas

- **Sin tests de integracion con DB real.** Todo unitario con fakes. Bug en query SQLAlchemy no se detecta.
- **`FakeDb` duplicado en 8+ archivos.** Deberia estar en `conftest.py`.
- **Sin tests de performance.**

---

## 10. Logging & Monitoreo — CRITICAL

- **Sin logging.** Ningun `import logging` en la app. Cero eventos loggeados: login, token rechazado, error 500, cambio de permisos.
- **Sin request tracing.** Sin request ID, sin correlation ID, sin middleware de logging.
- **Health check insuficiente.** `main.py:30-32`. No verifica DB. Si la DB esta caida, devuelve `200 healthy`.

---

## 11. Calidad de Codigo — PROFESSIONAL

- Type hints en todas las funciones.
- Docstrings en schemas y modelos.
- Comentarios explicando decisiones de diseno.
- `Annotated` types con nombres semanticos.

### Problemas

- **`_map_threat_list_item` en `threats.py:23-47`.** Construye dict manual que Pydantic valida. Si modelo cambia, no hay error de tipo en analisis estatico.
- **`MetricsSummaryResponse` muerto.** `schemas/metrics.py:18-31`. Nunca retornado por ningun endpoint.
- **Sin linter configurado.** Sin ruff, black, mypy.

---

## 12. Documentacion API — ACCEPTABLE

- OpenAPI generado por FastAPI.
- Tags en todos los routers.
- `response_model` en todos los endpoints.

### Problemas

- **`FastAPI(title="Dashboard API")` generico.** Sin `description`, `version`, `contact`.
- **Mayoria de endpoints sin docstring.** Swagger muestra descripciones vacias.
- **Sin ejemplos en schemas.** Sin `json_schema_extra`.

---

## 13. Dependencias — NEEDS WORK

- **`python-jose` ABANDONADO.** Ultimo release 2021. CVEs documentados. Reemplazar con `PyJWT`.
- **Versiones desactualizadas.** FastAPI, uvicorn, SQLAlchemy, pydantic, httpx tienen releases mas nuevos.
- **Sin separacion de deps de test.** `httpx`, `pytest`, `anyio` en misma lista que produccion.
