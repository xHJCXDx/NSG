# Resultado de la suite de pruebas del backend

Fecha: 12/11/2026. Base: rama `test/rev76-escenarios`, commit `028cf87`. Entorno: Python 3.14.8, pytest 9.1.1, entorno virtual `backend/.venv`.

La devolución REV74 pide ejecutar las pruebas e informar el resultado aunque haya fallas. Este archivo informa la ejecución completa de la suite del backend, cada falla con su causa y los cambios hechos en las pruebas antes de esta ejecución.

## Comando y resultado

```sh
cd backend
.venv/bin/python -m pytest -q -p no:cacheprovider tests
```

| Resultado | Cantidad |
|---|---|
| Aprobadas | 354 |
| Fallidas | 1 |
| Falla esperada (xfail) | 1 |

- **Falla esperada:** `tests/test_scenarios.py::test_e13_deactivated_user_with_valid_token_is_rejected`. Corresponde al escenario E13 y está declarada en la matriz (A-77, R8B-50): el token no vuelve a verificar que el usuario siga activo. El detalle está en `escenarios.md`.
- **Falla:** `tests/test_no_raw_sql_contract.py::test_backend_application_code_uses_orm_instead_of_raw_sql_queries`. Se declara abajo.

## Falla declarada: consultas SQL escritas a mano en métricas

La prueba es un contrato interno del repositorio: el código de la API debe consultar la base mediante el ORM (SQLAlchemy) y no con SQL escrito a mano. La tesis no exige ORM, así que esta falla no es una divergencia respecto de la especificación y no tiene fila en `matriz_conformidad.md`. Se informa porque la prueba falla.

Salida de la prueba (15 hallazgos), copiada tal cual:

```text
routers/metrics.py:253 uses .execute()
routers/metrics.py:282 uses .execute()
routers/metrics.py:314 uses .execute()
routers/metrics.py:403 uses .execute()
routers/metrics.py:254 uses text()
routers/metrics.py:283 uses text()
routers/metrics.py:315 uses text()
routers/metrics.py:404 uses text()
routers/metrics.py:255 embeds SQL text
routers/metrics.py:284 embeds SQL text
routers/metrics.py:316 embeds SQL text
routers/metrics.py:405 embeds SQL text
routers/roles.py:176 embeds SQL text
routers/users.py:246 embeds SQL text
routers/users.py:264 embeds SQL text
```

**Hallazgos reales (12).** Cuatro endpoints de `routers/metrics.py` usan `db.execute(text("SELECT …"))`; cada consulta genera tres hallazgos (`.execute()`, `text()` y el texto SQL):

| Endpoint | Línea | Consulta |
|---|---|---|
| `GET /api/metrics/top-keywords` | 253 | vista `top_keywords_stats` |
| `GET /api/metrics/workflow-health` | 282 | vista `workflow_performance_stats` |
| `GET /api/metrics/risk-score-distribution` | 314 | `threat_detections`, agrupado por rangos de `risk_score` |
| `GET /api/metrics/platform-sentiment` | 403 | `social_mentions` con `sentiment_analysis`, conteos por plataforma |

Las cuatro consultas son de solo lectura y reciben los valores por parámetros ligados (`:lim`, `:days`, `:since`), no armando el texto con datos de la solicitud. La consecuencia es de mantenimiento y no de seguridad: si el esquema cambia, estas consultas no se ajustan solas como las del ORM. Trabajo futuro: reescribirlas con el ORM o mapear las vistas como modelos de solo lectura.

**Falsos positivos (3).** La prueba marca como SQL cualquier texto que contenga palabras como «delete ». Las tres líneas son mensajes de error HTTP, no consultas:

| Línea | Texto |
|---|---|
| `routers/roles.py:176` | `f"Cannot delete role with {assigned_users} assigned user(s)"` |
| `routers/users.py:246` | `"You cannot delete your own user"` |
| `routers/users.py:264` | `"Cannot delete the last admin user"` |

## Pruebas actualizadas antes de esta ejecución

Una corrida anterior sobre `develop` 9b90270 dio 21 fallas. La causa de cada una se confirmó leyendo la prueba y el código: en 20 casos el código de la aplicación había cambiado y la prueba no, y la restante es la falla declarada arriba. Las pruebas desactualizadas se ajustaron al comportamiento que el código ya tenía, **sin tocar el código de la aplicación**, en el commit `0814501` (9 archivos de `backend/tests/`). Bajan de 21 a 18 porque las dos variantes `trio` de las pruebas de ingreso no se ejecutan en este entorno (falta el módulo `trio`); su causa era la misma que la de las variantes `asyncio`.

| Área | Pruebas | Cambio en el código que la prueba no reflejaba | Ajuste en la prueba |
|---|---|---|---|
| Modelo de usuarios y roles | 4 en `models/test_orm_models.py` | La columna `role` pasó a `role_id`, clave foránea a la tabla `roles` | Se verifican `role_id` y su clave foránea en lugar de la columna y el CHECK anteriores |
| Esquema de usuario | 1 en `schemas/test_user.py` | El rol ya no es una lista cerrada en el esquema: lo valida el endpoint contra la tabla `roles` | El esquema acepta el nombre; prueba nueva en `test_users_router.py`: un rol inexistente responde 400 «Unknown role: owner» y no guarda nada |
| Ingreso con usuario de la base | 2 en `test_auth.py` | El ingreso lee `role_id` del usuario y lo incluye en el token | Los dobles de prueba incluyen `role_id`; se verifica que el token lo lleve |
| Roles | 4 en `test_roles_router.py` | Borrar un rol es ahora una baja lógica; el borrado definitivo y el 409 por usuarios asignados pasaron a `DELETE /api/roles/{id}/permanent` | Se verifica la baja lógica y se prueba `/permanent` (borra un rol inactivo; responde 409 si tiene usuarios) |
| Métricas | 4 en `test_metrics_router.py` y `schemas/test_metrics.py` | El resumen hace una consulta más y devuelve `avg_sentiment_score` (opcional) | Se agrega la consulta y el campo esperado |
| Detecciones | 2 en `test_threats_router.py` | El listado devuelve filas de tres elementos (detección, mención y alerta) | Los dobles devuelven tres elementos; el ítem esperado incluye `reviewed_by`, `reviewed_at` y `alert` |
| Contrato de autenticación de rutas | 1 en `test_route_auth_contract.py` | 13 rutas nuevas (métricas, reactivación y borrado definitivo de roles y usuarios, categorías de palabras clave) no figuraban en el contrato | Se agregan con el permiso que exige cada una; la prueba verifica que coincida con el del código. Todas estaban protegidas |
