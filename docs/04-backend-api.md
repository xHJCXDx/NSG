# 04 — Contrato de API Backend (Release 1.0)

## Objetivo

El backend de NSG es una API REST construida con FastAPI que actúa como único punto de acceso al sistema para el dashboard web y para las automatizaciones de n8n. Expone recursos de lectura y escritura sobre las entidades principales del sistema (amenazas, alertas, menciones, keywords, logs de ejecución, actividad de usuarios y usuarios del sistema), protege cada ruta mediante autenticación JWT y delega la persistencia a PostgreSQL a través de SQLAlchemy. El único endpoint sin autenticación es el health check; todo lo demás requiere un token válido, y las operaciones de administración de usuarios requieren además rol `admin`.

---

## Modelo de autenticación

### Flujo JWT

1. El cliente envía credenciales como `application/x-www-form-urlencoded` al endpoint `POST /api/auth/login` (formato `OAuth2PasswordRequestForm`).
2. El backend valida las credenciales (ver lógica de bootstrap más abajo) y emite un JWT firmado con HS256.
3. El token tiene una expiración de **60 minutos** desde su emisión.
4. Todas las rutas protegidas exigen el header `Authorization: Bearer <token>`.
5. Si el token es inválido, expiró o falta, la respuesta es `401 Unauthorized` con `WWW-Authenticate: Bearer`.

### Bootstrap vs. usuarios de base de datos

El sistema tiene dos fuentes de autenticación mutuamente excluyentes:

| Condición | Fuente activa | Comportamiento |
|-----------|---------------|----------------|
| Tabla `system_users` vacía | Bootstrap | Se validan `ADMIN_USER` / `ADMIN_PASSWORD` del entorno. El token lleva `auth_source: "bootstrap"` y `role: "admin"`. No hay `user_id` en el payload. |
| Tabla `system_users` con al menos un registro | Base de datos | Se ignoran las variables de entorno. Solo se autentican usuarios activos (`is_active = true`) presentes en la tabla. El token lleva `auth_source: "database"` y el `user_id` del registro. |

Si la base de datos falla durante el login, el sistema responde `503 Service Unavailable` y no cae en modo bootstrap como alternativa.

### Claims del token JWT

| Claim | Tipo | Descripción |
|-------|------|-------------|
| `sub` | `string` | Username del usuario autenticado |
| `role` | `string` | `"admin"` o `"analyst"` |
| `auth_source` | `string` | `"bootstrap"` o `"database"` |
| `exp` | `timestamp` | Expiración (UTC, 60 minutos desde emisión) |
| `user_id` | `int` | Presente solo cuando `auth_source = "database"` |

### Algoritmo de hashing de contraseñas

Las contraseñas de usuarios en base de datos se almacenan usando PBKDF2-SHA256 con 600.000 iteraciones y salt aleatorio de 16 bytes. El verificador también soporta hashes bcrypt para compatibilidad con registros previos.

---

## Clasificación de rutas por protección

| Nivel | Descripción | Dependencia |
|-------|-------------|-------------|
| **Pública** | Sin autenticación requerida | — |
| **Autenticada** | Requiere token JWT válido (`get_current_user`) | Cualquier rol |
| **Permiso granular** | Requiere token JWT con permiso explícito (`require_permission`) | Permiso `recurso:acción` |

---

## Referencia de endpoints

### `GET /api/health` — Health Check

| Método | Path | Response | Status | Auth | Descripción |
|--------|------|----------|--------|------|-------------|
| GET | `/api/health` | `{"status": "healthy"}` | 200 | Pública | Verificación de disponibilidad del servicio |

---

### `/api/auth` — Autenticación

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| POST | `/api/auth/login` | `Token` | 200, 401, 503 | Pública | Emite un token JWT dado username + password (`form-data`) |

**`Token`** — campos: `access_token: str`, `token_type: str` (siempre `"bearer"`).

Errores posibles:
- `401` — credenciales incorrectas o usuario inactivo
- `503` — fallo de conexión con la base de datos durante validación

---

### `/api/dashboard` — Resumen del Dashboard

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| GET | `/api/dashboard/summary` | `DashboardSummaryResponse` | 200, 401 | Autenticada | Contadores agregados para la vista principal del dashboard |

**`DashboardSummaryResponse`** — campos: `total_threats`, `pending_threats`, `total_alerts`, `unacknowledged_alerts`, `active_keywords`, `execution_logs_count`, `activity_count` (todos `int`).

---

### `/api/metrics` — Métricas Agregadas

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| GET | `/api/metrics/summary` | `MetricsSummaryEndpointResponse` | 200, 401 | Autenticada | Totales de menciones, distribución de sentimientos y conteo de alertas |
| GET | `/api/metrics/mentions` | `list[RecentMentionResponse]` | 200, 401 | Autenticada | Menciones recientes ordenadas por fecha de creación descendente |

**`MetricsSummaryEndpointResponse`** — campos: `total_mentions: int`, `sentiment_distribution: dict[str, int]`, `alerts_count: int`. Los campos con valor `None` se omiten de la respuesta (`response_model_exclude_none=True`).

**`RecentMentionResponse`** — campos: `id`, `platform`, `text`, `created_at`, `author` (nullable).

Query params de `/api/metrics/mentions`: `limit` (entero 1–100, default 50).

---

### `/api/threats` — Detecciones de Amenazas

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| GET | `/api/threats` | `list[ThreatListResponse]` | 200, 401 | Autenticada | Lista de amenazas con mención relacionada embebida, ordenadas por `detected_at` desc |
| GET | `/api/threats/{threat_id}` | `ThreatDetail` | 200, 401, 404 | Autenticada | Detalle completo de una amenaza por `detection_id` |
| PATCH | `/api/threats/{threat_id}/review` | `ThreatDetail` | 200, 401, 404 | Autenticada | Actualiza el estado de revisión de una amenaza |

Query params de `GET /api/threats`: `limit` (1–100, default 50), `criticality_level` (`low` | `medium` | `high` | `critical`), `review_status` (`pending` | `reviewing` | `confirmed` | `false_positive` | `investigating` | `resolved`), `mention_id` (entero ≥ 1).

**`ThreatListResponse`** extiende `ThreatListItem` y agrega: `matched_keywords`, `detection_rules_triggered`, `contextual_notes`, `related_mention` (objeto con `mention_id`, `text_content`, `platform`).

**`ThreatDetail`** incluye todos los campos: estado de remediación, escalamiento, IOCs relacionados, assets afectados, impacto potencial, notas de revisión y `last_updated` (trigger-maintained).

**`ThreatReviewRequest`** (body del PATCH): `review_status` (requerido), `review_notes`, `reviewed_by`, `remediation_status` (`none` | `in_progress` | `completed` | `not_required`) — todos opcionales excepto `review_status`.

---

### `/api/alerts` — Alertas

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| GET | `/api/alerts` | `list[AlertResponse]` | 200, 401 | Autenticada | Lista de alertas ordenadas por `created_at` desc |
| GET | `/api/alerts/{alert_id}` | `AlertResponse` | 200, 401, 404 | Autenticada | Detalle de una alerta por `alert_id` |
| PATCH | `/api/alerts/{alert_id}/acknowledge` | `AlertResponse` | 200, 401, 404 | Autenticada | Marca una alerta como reconocida |

Query params de `GET /api/alerts`: `limit` (1–100, default 50), `delivery_status` (`pending` | `sent` | `delivered` | `failed`), `acknowledged` (bool).

**`AlertResponse`** — campos principales: `alert_id`, `detection_id`, `alert_uuid`, `alert_title`, `alert_message`, `alert_severity` (`info` | `warning` | `high` | `critical`), `delivery_status`, `acknowledged`, `acknowledged_by`, `acknowledged_at`, `last_updated` (trigger-maintained).

**`AcknowledgeRequest`** (body del PATCH): `acknowledged_by: str` (1–100 caracteres, requerido).

---

### `/api/keywords` — Keywords de Monitoreo

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| GET | `/api/keywords` | `list[KeywordResponse]` | 200, 401 | Autenticada | Lista de keywords ordenadas por `keyword_id` asc |
| POST | `/api/keywords` | `KeywordResponse` | 201, 401, 409 | Autenticada | Crea un nuevo keyword de monitoreo |
| GET | `/api/keywords/{keyword_id}` | `KeywordResponse` | 200, 401, 404 | Autenticada | Detalle de un keyword por `keyword_id` |
| PATCH | `/api/keywords/{keyword_id}` | `KeywordResponse` | 200, 401, 404, 409 | Autenticada | Actualización parcial de un keyword |
| DELETE | `/api/keywords/{keyword_id}` | — | 204, 401, 404 | Autenticada | Elimina un keyword |

Query params de `GET /api/keywords`: `active_only` (bool, default `false`), `limit` (1–200, default 100).

**`KeywordResponse`** incluye contadores trigger-maintained: `match_count`, `false_positive_count`, `true_positive_count`, `last_match_at`.

**`KeywordCreate`** — único campo requerido: `keyword_text` (1–255 caracteres). Todos los demás (`keyword_type`, `keyword_category`, `keyword_weight` 1–100, `is_active`, `is_regex`, `case_sensitive`, `added_by`, `trigger_immediate_alert`, `min_matches_for_alert`, `description`) son opcionales.

**`KeywordUpdate`** — mismos campos que `KeywordCreate`, todos opcionales (semántica PATCH). Se aplica solo lo que viene en el body.

---

### `/api/logs` — Logs de Ejecución de Workflows

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| GET | `/api/logs` | `list[ExecutionLogResponse]` | 200, 401 | Autenticada | Lista de logs ordenados por `started_at` desc |
| GET | `/api/logs/{log_id}` | `ExecutionLogResponse` | 200, 401, 404 | Autenticada | Detalle de un log de ejecución por `log_id` |

Query params de `GET /api/logs`: `limit` (1–100, default 50), `status` (`success` | `partial_success` | `error` | `warning` | `timeout`), `workflow_name` (1–100 caracteres).

**`ExecutionLogResponse`** — campos: `log_id`, `execution_uuid`, `workflow_name`, `execution_id`, `status`, `mentions_collected`, `mentions_processed`, `detections_generated`, `alerts_generated`, `started_at`, `completed_at`, `duration_seconds` (trigger-maintained), `last_updated`.

---

### `/api/activity` — Actividad de Usuarios

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| GET | `/api/activity` | `list[UserActivityResponse]` | 200, 401 | Autenticada | Log de actividad ordenado por `activity_timestamp` desc |
| GET | `/api/activity/{activity_id}` | `UserActivityResponse` | 200, 401, 404 | Autenticada | Entrada de actividad por `activity_id` |

Query params de `GET /api/activity`: `limit` (1–100, default 50), `username` (1–100 caracteres), `activity_type` (1–50 caracteres).

**`UserActivityResponse`** — registro de auditoría de solo lectura. Incluye `ip_address` (mapeado de tipo PostgreSQL `INET` a `str`) y `activity_data` (mapeado de `JSONB` a `dict | None`). Las FKs `related_mention_id`, `related_detection_id`, `related_alert_id` son nullable con `ON DELETE SET NULL`.

---

### `/api/users` — Administración de Usuarios del Sistema

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| POST | `/api/users` | `UserResponse` | 201, 401, 403, 409 | Solo Admin | Crea un nuevo usuario del sistema |
| GET | `/api/users` | `list[UserResponse]` | 200, 401, 403 | Solo Admin | Lista todos los usuarios ordenados por username asc |
| PATCH | `/api/users/{user_id}` | `UserResponse` | 200, 401, 403, 404 | Solo Admin | Actualización parcial de un usuario |

**`UserCreate`** — campos: `username` (1–100 caracteres, requerido), `password` (8–255 caracteres, requerido), `role` (`"admin"` | `"analyst"`, default `"analyst"`), `is_active` (bool, default `true`).

**`UserUpdate`** — campos opcionales: `password` (8–255 caracteres), `role`, `is_active`. Al menos un campo debe estar presente (validado por `model_validator`).

**`UserResponse`** — excluye `password_hash`. Campos: `user_id`, `username`, `role`, `is_active`, `created_at`, `updated_at`.

No existe endpoint de borrado físico de usuarios en Release 1.0. La desactivación se realiza via `PATCH` con `is_active: false`.

---

### `/api/n8n` — Proxy de Webhooks n8n

| Método | Path | Response Model | Status Codes | Auth | Descripción |
|--------|------|----------------|--------------|------|-------------|
| POST | `/api/n8n/webhook/{webhook_id}` | Passthrough | 200, 401, 502 | Autenticada | Reenvía la solicitud al webhook interno de n8n y retorna su respuesta |

---

## Códigos de error

| Código HTTP | Significado en la API |
|-------------|----------------------|
| `200 OK` | Operación exitosa con cuerpo de respuesta |
| `201 Created` | Recurso creado exitosamente (POST con body de respuesta) |
| `204 No Content` | Eliminación exitosa (DELETE — sin cuerpo) |
| `401 Unauthorized` | Token ausente, inválido o expirado. Incluye `WWW-Authenticate: Bearer` |
| `403 Forbidden` | Token válido pero el usuario no tiene rol `admin` |
| `404 Not Found` | El recurso identificado por el path param no existe |
| `409 Conflict` | Violación de unicidad (username o keyword duplicados) |
| `422 Unprocessable Entity` | Validación Pydantic fallida (body o query params malformados) |
| `502 Bad Gateway` | El proxy n8n no pudo alcanzar el servicio de workflows |
| `503 Service Unavailable` | Fallo de base de datos durante el login |

---

## Excepciones documentadas

### Proxy n8n — sin `response_model`

El endpoint `POST /api/n8n/webhook/{webhook_id}` no declara un `response_model` de Pydantic. Esto es intencional: los payloads de respuesta de los workflows n8n son propietarios del workflow y pueden ser JSON o binario dependiendo de la automatización disparada. La respuesta se pasa tal cual usando `JSONResponse` o `Response` de FastAPI según el `Content-Type` que devuelva n8n.

### Keywords DELETE — 204 sin body

`DELETE /api/keywords/{keyword_id}` responde `204 No Content`. No hay cuerpo de respuesta. FastAPI no serializa nada cuando el status code es 204.

### Usuarios — sin borrado físico

En Release 1.0 no existe `DELETE /api/users/{user_id}`. La desactivación de cuentas se realiza exclusivamente vía `PATCH /api/users/{user_id}` con `{ "is_active": false }`.

### Bootstrap — ausencia de `user_id` en el token

Cuando el sistema opera en modo bootstrap (tabla `system_users` vacía), el JWT no incluye el claim `user_id`. El campo `user_id` en `TokenData` es `Optional[int]` por esta razón. El código no debe asumir su presencia.

### Threats — join externo con `SocialMention`

`GET /api/threats` realiza un `OUTER JOIN` con `social_mentions`. El campo `related_mention` en `ThreatListResponse` puede ser `null` si la mención fue eliminada o si el `mention_id` no tiene registro correspondiente.

---

## Contrato de schemas

Todos los schemas de request y response están implementados en Pydantic v2 con `model_config = ConfigDict(from_attributes=True)` en los schemas de respuesta, lo que permite la serialización directa desde instancias ORM de SQLAlchemy.

### Restricciones clave

| Campo | Restricción |
|-------|-------------|
| `password` (UserCreate, UserUpdate) | Mínimo 8 caracteres, máximo 255 |
| `username` (UserCreate) | 1–100 caracteres, sin espacios iniciales/finales |
| `keyword_text` (KeywordCreate, KeywordUpdate) | 1–255 caracteres |
| `keyword_weight` | Entero entre 1 y 100 |
| `acknowledged_by` (AcknowledgeRequest) | 1–100 caracteres |
| `limit` (actividad, alertas, logs, métricas, threats) | Entero entre 1 y 100 |
| `limit` (keywords) | Entero entre 1 y 200 |
| `UserUpdate` | Al menos un campo debe estar presente (validado por `model_validator`) |

Los schemas de request (input) no usan `from_attributes` dado que son cuerpos HTTP, no entidades ORM. Los schemas de respuesta nunca exponen `password_hash`.
