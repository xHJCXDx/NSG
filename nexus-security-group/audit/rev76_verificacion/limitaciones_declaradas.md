# Limitaciones declaradas (REV76)

Fecha: 12/11/2026. Fuente: `matriz_conformidad.md`, filas con decisión **declarar** (157 filas). Criterio: la devolución REV74 acepta, para cada divergencia, «implementarla o declarar que no se implementó» (T-A1). Estas reglas **no se implementan**: el código no se toca y cada una queda como trabajo futuro. El texto de la tesis (§9.1 y discusión) se ajusta en B7 a partir de este documento.

Los temas siguen la agrupación de la propuesta A6. Cada tema dice qué exige la especificación, qué hace el prototipo, la consecuencia y el trabajo futuro. Las tablas copian la evidencia de la matriz tal cual, tomada sobre `develop` 9b90270. Las filas cuya evidencia cambió con los arreglos de B4 están en la última sección.

## Resumen por tema

| Grupo | Tema | Filas |
|---|---|---|
| 1 | Purga de las confirmadas (365/730 con minimización) | A-32, A-56, A-57, A-58, A-60, A-61, AD-33, AD-35 |
| 1 | Persistencia atómica por mención | R8A-04, R8A-05, R8B-04, R8B-05, R8B-35, AD-59, AD-60 |
| 1 | Superposición: la segunda ejecución no crea ni modifica nada | AD-64, AD-94 |
| 2 | `password_hash` y datos de red legibles por análisis y consulta | A-15, A-50, R8A-34 |
| 2 | Rol de servicio superusuario | A-52, A-53, R8A-32, AD-14 |
| 2 | Permisos leídos del token y no de la base | A-73, R8B-51 |
| 2 | Usuario inactivo con token válido | A-77, R8B-50 |
| 2 | `/api/system/info` público | A-78, R8B-64 |
| 2 | Contraseña inicial del admin en texto plano | A-80, A-81 |
| 2 | Webhook manual sin secreto | R8B-09, R8B-39 |
| 2 | Límite de tasa solo en el ingreso | R8B-40 |
| 2 | Límite de ingreso detrás del proxy | R8B-47 |
| 3 | Transiciones de revisión libres; reapertura por cualquier analista | A-29, A-31 |
| 3 | El rol `viewer` no existe | A-44, R8B-60, R8B-61 |
| 3 | Último admin modificable por PATCH | A-75 |
| 3 | La revisión no queda en la actividad; la ejecución manual fallida no se registra | R8B-53, R8B-54 |
| 3 | `analyst` no edita términos | R8B-58 |
| 4 | Hora de la ejecución y vista previa en el aviso guardado | AD-03, AD-99 |
| 5 | Registrar el resultado real de cada canal después del envío (aceptado, fallido o desconocido) con un id de mensaje | A-34, R8A-07, R8B-24, R8B-25, R8B-26, R8B-27, AD-95, AD-100, AD-101, AD-102, AD-106, AD-107, AD-109, AD-110, AD-111, AD-112 |
| 5 | Reenvío manual | R8B-30, AD-24, AD-105 |
| 5 | Indicadores de mensajes fallidos y salud de los avisos | R8B-86, R8B-99, AD-87 |
| 5 | Estado «en curso» | AD-108 |
| 6 | Estado por fuente, marca más antigua, saturación, resultados incompletos de GitHub, tipo de ejecución | A-38, R8A-08, R8A-46, R8B-10, R8B-13, R8B-15, R8B-31, R8B-75, R8B-101, AD-25, AD-46, AD-47, AD-50, AD-56, AD-90, AD-91, AD-92, AD-93 |
| 6 | Estado general binario: con las tres fuentes caídas registra «success»; cuenta como persistidas menciones no confirmadas | R8B-32, AD-31, AD-85, AD-86, AD-88 |
| 7 | Instantánea, versión de reglas y referencia a la ejecución | A-20, A-25, A-59, A-63, R8A-22, R8A-23, R8A-25, AD-30, AD-73 |
| 8 | Supresión con lápida, bloqueo por titular, registro de supresiones, reaplicación tras restaurar | A-19, A-64, A-65, A-66, A-67, A-69, A-70, AD-40, AD-41, AD-42, AD-45, AD-57 |
| 8 | Purga de la actividad de usuarios a los 365 días | A-62 |
| 8 | Respaldos mensuales | A-68, AD-27 |
| 8 | Historial de n8n de 35 días | A-72, AD-28 |
| 9 | HN guarda la respuesta completa | A-03, A-12, R8A-42 |
| 9 | GitHub guarda la biografía del autor | A-06 |
| 9 | HN pierde el título si hay texto | R8A-40 |
| 9 | Exploit-DB fija autor 'exploit-db' | R8A-44 |
| 9 | Ítems sin id externo no se descartan | R8B-17, AD-52 |
| 9 | Conversión a Buenos Aires | AD-65 |
| 9 | Fecha faltante reemplazada por la hora actual | AD-66 |
| 10 | El método por defecto se registra como 'ensemble' | A-23, R8B-20, AD-74 |
| 10 | Etiqueta calculada sobre el valor sin redondear | AD-82 |
| 11 | Panel con 2 de 8 indicadores; indicadores faltantes o distintos | R8B-66, R8B-69, R8B-70, R8B-72, R8B-76, R8B-80, R8B-82, R8B-83, R8B-84, R8B-85, R8B-89, R8B-91, R8B-92, R8B-95, R8B-96, R8B-98, R8B-100 |
| 11 | Series por fecha de publicación y en UTC | R8B-81, R8B-90, R8B-93 |
| 12 | Término sin FK a categoría | A-36 |
| 12 | Dominios cerrados que faltan (tipo de ejecución, estado por canal) | R8A-28 |
| 12 | Modelo de datos y flujo «en general» (filas resumen) | AD-15, AD-19 |
| | **Total** | **157** |

Por estado en la matriz: No implementada: 70, Parcial: 62, Contraria: 24, Contraria (sin ejecutar): 1.

## Grupo 1 · Purga, persistencia atómica y superposición

### Purga de las confirmadas (365/730 con minimización)

La especificación corta la purga por fecha de adquisición; elimina las menciones vencidas no confirmadas; a las confirmadas (incluidas las resueltas) les borra la autoría y el contenido original, las conserva solo con revisión de minimización y las elimina a los 730 días. `purge_old_data` corta por fecha de publicación (`created_at`), protege solo las detecciones `confirmed` (las resueltas se purgan) y conserva las confirmadas sin plazo y sin minimizar. **Consecuencia:** las menciones confirmadas retienen datos personales por tiempo indefinido, las resueltas se pierden, y el plazo se cuenta desde la publicación y no desde la adquisición. **Trabajo futuro:** reescribir `purge_old_data` según el Anexo A.2 (corte por `collected_at`, minimización a los 365 días y borrado a los 730).

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-32 | «Detección confirmada» = confirmada o resuelta (la resuelta conserva la protección de la purga) | A.1 l.2007 | Contraria | init.sql:463 `WHERE review_status = 'confirmed'`: las resueltas se purgan |
| A-56 | Regla 1: las menciones vencidas no confirmadas se eliminan con su análisis, detección y aviso | A.2 l.2033; §7.8.4 l.1150 | Parcial | init.sql:458-464 + cascadas 78, 111, 167. «Confirmada» excluye las resueltas (A-32) |
| A-57 | El corte usa la fecha de adquisición | A.2 l.2039 | Contraria | init.sql:459 `WHERE created_at < cutoff_date` (fecha de publicación; la de adquisición es `collected_at`, init.sql:24) |
| A-58 | Regla 2: las confirmadas vencidas pierden la autoría (usuario, ID, banda, verificación) y el contenido original | A.2 l.2034; §7.8.4 l.1150; Tabla 8 l.1168, l.1170 | No implementada | init.sql:449-481: no hay UPDATE que borre author_* ni raw_data |
| A-60 | Las confirmadas se conservan solo con la revisión de minimización registrada; sin ella se eliminan | A.2 l.2034; §7.8.4 l.1154; Tabla 8 l.1171 | Contraria | init.sql:460-464 conserva toda 'confirmed' sin marca ni control de minimización |
| A-61 | Las confirmadas conservadas se eliminan al doble del plazo (730 días) | A.2 l.2034; §7.8.4 l.1150 | Contraria | init.sql:460-464: las confirmadas quedan fuera del borrado sin límite (se conservan para siempre) |
| AD-33 | Revisión de minimización de las confirmadas que alcanzan la retención; las no revisadas se eliminan | C.3, l.2126 | No implementada | init.sql:449-480: la purga no tiene revisión de minimización |
| AD-35 | Confirmadas: pierden autoría y contenido original al vencer y se eliminan al doble del período | C.3, l.2127 | Contraria | init.sql:459-465 excluye de la purga y sin plazo las menciones con detección 'confirmed', sin minimizar; tampoco protege 'resolved' |

### Persistencia atómica por mención

La especificación guarda mención, análisis, detección y estadísticas en una única transacción: si una escritura falla, no queda nada y la ejecución es éxito parcial. El prototipo usa tres nodos Postgres independientes con `continueOnFail`, y las estadísticas de términos las actualiza un trigger `AFTER INSERT` que coincide por subcadena (`LIKE`). **Consecuencia:** si falla la segunda o la tercera escritura puede quedar una mención sin análisis o sin detección, y la ejecución nunca se registra como éxito parcial. **Trabajo futuro:** unir los tres INSERT en una sola sentencia con CTE, que es atómica.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8A-04 | Mención, análisis y detección se guardan en una única transacción | §8.1 Etapa 3, l.1277; §8.2 l.1490 | No implementada | Tres nodos Postgres separados («Insert Social Mention», «Insert Sentiment Analysis», «Insert Threat Detection», workflow.json:426/463/500), sin BEGIN/COMMIT |
| R8A-05 | Las estadísticas de términos monitoreados se actualizan solo si la transacción se confirma; coincidencia por subcadena, no por palabra completa | §8.1 l.1277; §8.1.1 l.1410 | Parcial | Trigger `update_keyword_match` AFTER INSERT con `LIKE '%kw%'` (init.sql:339-360): la subcadena se cumple; no hay transacción común (R8A-04) |
| R8B-04 | Persistencia atómica por mención: mención, análisis, detección con instantánea y estadísticas en una única transacción | §8.4 l.1609; Tabla 21 l.1633 | No implementada | Tres nodos independientes con continueOnFail: «Insert Social Mention», «Insert Sentiment Analysis», «Insert Threat Detection»; estadísticas por trigger (init.sql:339-357) |
| R8B-05 | Si falla una escritura no queda nada confirmado, no hay candidata a aviso, no cuenta en estadísticas y la ejecución es éxito parcial | §8.4 l.1609 | No implementada | continueOnFail en los Insert*; «Prep Log Execution»: `status = mentionsProcessed === 0 ? 'error' : 'success'` |
| R8B-35 | Error de persistencia: se revierte la mención, se continúa con las demás y la ejecución queda como éxito parcial | §8.4.3 l.1645 | No implementada | Igual que R8B-04/05: sin transacción; el estado nunca es partial_success |
| AD-59 | Mención, análisis y detección (con instantánea) más estadísticas en una única transacción; si algo falla, se revierte todo | D.1.5, l.2152 | No implementada | tres INSERT independientes, cada uno con continueOnFail: «Insert Social Mention» (:422/439), «Insert Sentiment Analysis» (:457/476), «Insert Threat Detection» (:494/513) |
| AD-60 | Estadísticas de términos actualizadas dentro de la transacción | D.1.5, l.2152 | Parcial | trigger AFTER INSERT init.sql:339-360 (atómico solo con la mención; usa LIKE por subcadena, no palabra completa) |

### Superposición: la segunda ejecución no crea ni modifica nada

Desde `c81c96f` (arreglo b) las inserciones usan `ON CONFLICT … DO NOTHING`, así que una ejecución superpuesta ya no modifica lo guardado, y el índice único impide un segundo aviso en la base. Lo que queda: las candidatas a aviso se arman con lo que pasa por el flujo (passthrough), no con lo que se escribió en esta ejecución, y por eso una detección repetida vuelve a enviarse por Slack y correo. **Consecuencia:** posible aviso duplicado en los canales cuando dos ejecuciones se superponen. **Trabajo futuro:** filtrar las candidatas por las filas que devuelve `RETURNING`. Se reevaluaron en el paso 4 de B4 (12/11/2026) y quedan en «declarar».

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| AD-64 | No generar un segundo aviso | D.1.6, l.2153 | Parcial | «Prep Alert Insert»: `ON CONFLICT (detection_id) DO NOTHING` + índice único init.sql:188; pero «Aggregate Alerts» vuelve a enviar Slack y correo |
| AD-94 | Candidatas: high/critical escritas en esta ejecución, excluidas las repetidas por superposición | D.5.1, l.2180 | Parcial | «IF Critical or High» filtra el nivel, pero sobre el passthrough de «Enrich After Threat» (:517), no sobre lo escrito; incluye las repetidas |

## Grupo 2 · Seguridad y datos personales

### `password_hash` y datos de red legibles por análisis y consulta

La especificación prohíbe que los roles de análisis y consulta lean hashes de contraseña y datos de red o sesión. `init.sql` otorga `SELECT` sobre todas las tablas a esos roles, incluido `system_users` con `password_hash`, y el endpoint de actividad devuelve IP, agente de usuario y sesión a quien tenga `logs:read` (también `analyst`). **Consecuencia:** una credencial de análisis puede leer los hashes y los datos de red de otros usuarios. **Trabajo futuro:** permisos por columna (`REVOKE` + `GRANT` de columnas) y ocultar esos campos en la API.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-15 | Datos de red y sesión de la actividad: solo los leen el rol de servicio y el de administración | Tabla 8 l.1172; Tabla A2 l.2023 | Contraria | init.sql:581, 586 (SELECT ON ALL TABLES a análisis y consulta, sin restricción por columna); API: backend/routers/activity.py:23 (`logs:read`, que tiene analyst, init.sql:818) devuelve ip, user_agent y sesión (backend/schemas/activity.py:58-60) |
| A-50 | Usuario: análisis y consulta leen sin el hash de contraseña | Tabla A2 l.2024 | Contraria | init.sql:686-687 `GRANT SELECT ON TABLE system_users` (incluye password_hash, init.sql:667) |
| R8A-34 | Análisis y consulta no leen hashes de contraseña ni datos de red/sesión de la actividad | §8.2.1 l.1509-1510 | Contraria | `GRANT SELECT ON ALL TABLES` (init.sql:581, 586) y `GRANT SELECT ON system_users` (init.sql:686-687) exponen `password_hash` (init.sql:667) e `ip_address`/`session_id` |

### Rol de servicio superusuario

La especificación pide un rol de servicio sin superusuario, sin `BYPASSRLS` y sin `CREATEROLE` una vez instalada la base. El backend y n8n se conectan con `POSTGRES_USER`, que en la imagen oficial de Postgres es superusuario, y no se revoca el `EXECUTE` de `PUBLIC` sobre la purga. Esto se infiere del comportamiento estándar de la imagen; no se ejecutó. **Consecuencia:** quien obtenga la credencial del backend o de n8n controla toda la base y pasa por encima de las políticas por fila. **Trabajo futuro:** crear un rol de servicio dedicado y quitarle los privilegios al terminar la instalación. No se hace ahora porque cambiar los roles a esta altura arriesga romper la instalación.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-52 | Purga y supresión: solo las ejecuta el rol de servicio | Tabla A2 l.2026; A.2 l.2031, l.2041 | Parcial | init.sql:579 `GRANT EXECUTE ON ALL FUNCTIONS … TO osint_admin`; no se revoca el EXECUTE de PUBLIC sobre purge_old_data; no hay procedimiento de supresión |
| A-53 | El rol de servicio crea los tres roles de grupo y después no puede crear, modificar ni otorgar roles | Tabla A2 l.2027 | No implementada | docker-compose.yml:14, 87, 180: backend y n8n usan `POSTGRES_USER` (superusuario inicial); no hay ALTER ROLE NOCREATEROLE |
| R8A-32 | El rol de servicio no es superusuario y pierde CREATEROLE/ADMIN OPTION al terminar la instalación | §8.2.1 l.1520 | Contraria (sin ejecutar) | `POSTGRES_USER` de la imagen oficial es superusuario (docker-compose.yml:14); no hay ALTER ROLE ... NOSUPERUSER/NOCREATEROLE. Se infiere del comportamiento estándar de la imagen; no se ejecutó |
| AD-14 | Rol de servicio sin superusuario, sin CREATEDB ni BYPASSRLS, con CREATEROLE solo para la instalación; base cuyo propietario es ese rol | C.1.2, l.2103 | No implementada | init.sql:573-575 crea solo los roles de grupo; no hay NOSUPERUSER/NOBYPASSRLS; docker-compose.yml:14 usa POSTGRES_USER (superusuario de la imagen) |

### Permisos leídos del token y no de la base

La especificación comprueba el permiso de cada operación con el rol del usuario. La API compara contra los permisos copiados en el JWT al ingresar. **Consecuencia:** un cambio de rol o de permisos no se aplica hasta que vence el token (hasta 60 minutos). **Trabajo futuro:** leer los permisos de la base en cada solicitud, o invalidar los tokens al cambiar un rol.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-73 | La API comprueba en cada solicitud el permiso de la operación con el rol del usuario | A.3 l.2068 | Parcial | permissions.py:71-77 compara con los permisos copiados en el JWT (tokens.py:52), no con la base: un cambio de rol no se ve hasta que vence el token |
| R8B-51 | En cada solicitud se comprueba que el rol tenga el permiso de la operación | §8.5.2 l.1667 | Parcial | backend/auth/permissions.py:66-72 valida los permisos copiados en el token al ingresar (si el rol cambia, quedan desactualizados hasta 60 min) |

### Usuario inactivo con token válido

La especificación verifica en cada solicitud que el usuario siga activo. El ingreso rechaza a los inactivos, pero la validación del token no vuelve a consultar `is_active`. **Consecuencia:** un usuario desactivado conserva el acceso hasta que vence su token. **Trabajo futuro:** comprobar `is_active` en cada solicitud.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-77 | Un usuario inactivo no puede autenticarse (se verifica en cada solicitud) | A.3 regla 3 l.2072; E13 | Parcial | El ingreso rechaza inactivos (auth/routes.py:96-97), pero tokens.py:36-57 no vuelve a mirar `is_active`: un token válido sigue funcionando |
| R8B-50 | En cada solicitud se verifica que el usuario siga activo | §8.5.2 l.1667 | No implementada | backend/auth/tokens.py:36-56 solo decodifica el JWT, no consulta system_users |

### `/api/system/info` público

La especificación exige usuario autenticado para la información del sistema; solo el control de estado es público. `/api/system/info` no tiene dependencia de autenticación y una prueba lo declara público a propósito. **Consecuencia:** cualquiera que alcance la API puede leer esa información. **Trabajo futuro:** exigir usuario autenticado y actualizar la prueba.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-78 | Inicio, preferencias e información del sistema exigen usuario autenticado | A.3 regla 4 l.2073 | Contraria | backend/routers/system.py:15-17 `/api/system/info` sin dependencia (declarado «intencionalmente público» en tests/test_route_auth_contract.py:16) |
| R8B-64 | Inicio, preferencias e información del sistema exigen usuario autenticado; el control de estado es público | Tabla 22 nota l.1696 | Parcial | Estado público (backend/main.py:104); /info sin autenticación (backend/routers/system.py:15-17) |

### Contraseña inicial del admin en texto plano

La especificación crea un primer usuario `admin` cuya contraseña se guarda solo como hash. `init.sql` no siembra ningún usuario: mientras la tabla está vacía hay un ingreso de arranque con `ADMIN_PASSWORD`, que se lee del entorno y se compara en texto plano. **Consecuencia:** la contraseña inicial queda legible en el archivo de entorno. **Trabajo futuro:** que el entorno reciba el hash y no la contraseña.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-80 | La instalación crea un primer usuario `admin` | A.3 regla 5 l.2074 | Parcial | init.sql no siembra ningún usuario en system_users (758-824); solo hay un ingreso de arranque por variables de entorno mientras la tabla está vacía (auth/routes.py:122-142) |
| A-81 | La contraseña inicial de `admin` se guarda solo como hash | A.3 regla 5 l.2074 | Contraria | backend/config.py:9 `ADMIN_PASSWORD` en el entorno, comparada en texto plano con hmac.compare_digest (auth/routes.py:123) |

### Webhook manual sin secreto

La especificación acepta el disparador manual solo si lo envía la API con un secreto compartido. El webhook de n8n no exige autenticación, la API no envía `WEBHOOK_SECRET` y n8n recibe esa variable pero no la usa. Desde `e990d80` (arreglo d) el puerto 5678 se publica solo en `127.0.0.1`, así que ya no se alcanza desde la red, pero cualquier proceso del equipo o contenedor de la red interna puede disparar el flujo. **Trabajo futuro:** validar el encabezado secreto en el webhook y enviarlo desde la API.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-09 | El disparador manual HTTP solo se acepta si lo envía la API con un secreto compartido | §8.4.1 l.1616 | Contraria | «Manual OSINT Trigger» es un webhook POST sin autenticación; backend/routers/n8n.py:45-49 no envía WEBHOOK_SECRET |
| R8B-39 | La ejecución manual la reenvía la API con un secreto que solo ella conoce; ningún otro componente dispara el flujo | §8.5.1 l.1657 | Contraria | backend/routers/n8n.py:45-49 no agrega el secreto; WEBHOOK_SECRET llega a n8n (docker-compose.yml:77) pero no se usa; el puerto 5678 está expuesto |

### Límite de tasa solo en el ingreso

La especificación limita la tasa de solicitudes de la API. Solo el ingreso tiene límite. **Consecuencia:** el resto de los endpoints no tiene protección contra solicitudes masivas. **Trabajo futuro:** aplicar un límite global.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-40 | La API limita la tasa de solicitudes | §8.5.2 l.1661 | Parcial | backend/rate_limit.py:4; solo hay `@limiter.limit` en el ingreso (backend/auth/routes.py:71) |

### Límite de ingreso detrás del proxy

La especificación permite 5 intentos de ingreso por minuto por IP. Detrás del proxy, uvicorn corre sin `--proxy-headers`, así que la clave del límite es la IP del proxy. **Consecuencia:** todos los clientes comparten el mismo cupo de 5 intentos; los fallos de uno pueden bloquear el ingreso de los demás. **Trabajo futuro:** `--proxy-headers` con la IP del proxy como confiable.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-47 | Máximo 5 intentos de ingreso por minuto por IP | §8.5.2 l.1666 | Parcial | backend/auth/routes.py:71 y backend/rate_limit.py:4 (get_remote_address). Detrás de Traefik, uvicorn corre sin --proxy-headers (backend/Dockerfile:15): la clave es la IP del proxy |

## Grupo 3 · Roles, permisos y reglas de la aplicación

### Transiciones de revisión libres; reapertura por cualquier analista

La especificación admite solo las transiciones definidas del estado de revisión, y solo `admin` reabre una detección decidida, con registro en la actividad. La API asigna cualquier estado sin validar la transición, cualquier usuario con `threats:write` (también `analyst`) cambia un estado decidido, y no queda en la actividad. **Trabajo futuro:** tabla de transiciones permitidas, reapertura solo para `admin` y registro en la actividad.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-29 | Solo se admiten las transiciones definidas (pendiente→en revisión→…; confirmada→resuelta) | A.1 l.2005 | No implementada | backend/routers/threats.py:170 asigna cualquier estado sin validar la transición |
| A-31 | Solo `admin` reabre una detección decidida (vuelve a en revisión) y la reapertura queda en la actividad | A.1 l.2005; A.3 regla 6 l.2075 | No implementada | threats.py:152-187: cualquier `threats:write` (también analyst, init.sql:812) cambia un estado decidido; no llama a record_user_activity |

### El rol `viewer` no existe

La especificación define tres roles iniciales de sistema: `admin`, `analyst` y `viewer`, este último con todos los permisos de lectura. `init.sql` siembra solo `admin` y `analyst`. **Consecuencia:** no hay un perfil de solo lectura; las restricciones de `viewer` se cumplen solo porque el rol no existe. **Trabajo futuro:** sembrar `viewer` con los permisos de lectura de la Tabla 22.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-44 | Los tres roles iniciales (`admin`, `analyst`, `viewer`) son de sistema | A.3 l.2068, regla 1 l.2070 | Parcial | init.sql:758-761 siembra solo admin y analyst; `viewer` no existe en el código |
| R8B-60 | T22: `viewer` tiene todos los permisos de lectura | Tabla 22 l.1677-1688 | No implementada | init.sql:758-761 solo crea admin y analyst; el rol viewer no existe |
| R8B-61 | T22: `viewer` no revisa detecciones, no reconoce avisos, no edita términos ni ejecuta el flujo | Tabla 22 l.1680-1689 | No implementada | El rol no existe (init.sql:758-761); la regla se cumple solo porque no hay usuarios viewer |

### Último admin modificable por PATCH

La especificación rechaza desactivar, eliminar o cambiar de rol al último `admin` activo. La API controla borrar y desactivar, pero el `PATCH` de usuario cambia el rol o `is_active` sin ese control. **Consecuencia:** se puede dejar el sistema sin administrador. **Trabajo futuro:** aplicar el mismo control en el `PATCH`.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-75 | La API rechaza desactivar, eliminar o cambiar de rol al último `admin` activo | A.3 regla 2 l.2071 | Parcial | Se controla borrar y desactivar: users.py:167-178, 254-265. PATCH `update_user` (users.py:125-129) cambia el rol o `is_active=False` sin control |

### La revisión no queda en la actividad; la ejecución manual fallida no se registra

La especificación registra en la actividad de usuarios cada revisión y cada ejecución manual. La revisión de detecciones no se registra, y la ejecución manual no se registra cuando n8n responde con error. **Consecuencia:** la actividad no permite reconstruir quién revisó qué ni los intentos fallidos. **Trabajo futuro:** llamar a `record_user_activity` en ambos casos.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-53 | La actividad de usuarios registra las revisiones | §8.5.2 l.1669 | No implementada | backend/routers/threats.py:152-187 no llama a record_user_activity |
| R8B-54 | La actividad de usuarios registra cada ejecución manual | §8.5.2 l.1669 | Parcial | backend/routers/n8n.py:77-96; no registra si n8n responde ≥400 (:84) |

### `analyst` no edita términos

La especificación permite a `analyst` editar términos y categorías. `analyst` tiene solo `keywords:read`, y la escritura exige `keywords:write`. **Consecuencia:** solo `admin` mantiene los términos. **Trabajo futuro:** dar `keywords:write` a `analyst`, sin borrado.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-58 | T22: `analyst` edita términos y categorías | Tabla 22 l.1684 | Contraria | init.sql:815 solo keywords:read; la escritura exige keywords:write (backend/routers/keywords.py:44,99; keyword_categories.py:40) |

## Grupo 4 · Contenido del aviso guardado

### Hora de la ejecución y vista previa en el aviso guardado

La especificación toma la hora de la ejecución del registro de ejecución y guarda en el aviso la vista previa y el identificador del mensaje consolidado. El flujo usa la hora en que arma el aviso (`new Date()`), y el aviso guardado tiene nivel, tipo y plataforma, pero no vista previa ni identificador. Desde `8ced8ae` (arreglo c) el mensaje guardado ya no incluye la autoría. **Trabajo futuro:** usar el inicio registrado de la ejecución y guardar la vista previa.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| AD-03 | Hora de la ejecución tomada del registro de ejecución, en ambos canales | B1, l.2088 | Parcial | «Aggregate Alerts» (:572) usa `execution_timestamp: new Date()`, no el inicio registrado |
| AD-99 | El aviso registra vista previa, nivel e identificador del mensaje consolidado | D.5.3, l.2182 | Parcial | alert_severity sí (init.sql:172); el mensaje es tipo/plataforma/autor, no vista previa; no hay id de mensaje |

## Grupo 5 · Resultado del aviso por canal (Tabla D1)

### Registrar el resultado real de cada canal después del envío (aceptado, fallido o desconocido) con un id de mensaje

La especificación (Tabla D1) registra por canal (Slack y correo) el intento y su resultado: pendiente, en curso, aceptado, fallido o desconocido, con un identificador común del mensaje consolidado. El prototipo tiene un único `delivery_status`, y «Prep Alert Insert», que corre en una rama paralela al envío, escribe siempre `'sent'` sin leer la respuesta. `'failed'` y `'delivered'` existen en el `CHECK` pero nunca se escriben, y «desconocido» no existe. **Consecuencia:** un envío fallido queda registrado como enviado; para saber si un aviso llegó hay que revisar el historial de n8n. **Trabajo futuro:** una columna de estado por canal escrita con la respuesta de cada nodo, más un identificador del mensaje consolidado.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-34 | Estado por canal (Slack/correo): pendiente, en curso, aceptado, fallido o desconocido | Tabla A1 l.1984 | Contraria | init.sql:174-179: un único `delivery_status` (pending/sent/delivered/failed); «Prep Alert Insert» escribe siempre 'sent' y `ARRAY['slack','email']` |
| R8A-07 | Se registra el resultado por canal: aceptado, fallido o desconocido | §8.1 Etapa 4, l.1278 | No implementada | `alerts.delivery_status` único con los valores pending/sent/delivered/failed (init.sql:179); no hay estado por canal ni «desconocido» |
| R8B-24 | Estados del aviso por canal | Tabla 21 l.1634; §8.4.3 l.1646 | Parcial | init.sql:179 `delivery_status ∈ {pending, sent, delivered, failed}`: un solo campo, no uno por canal |
| R8B-25 | Cada canal registra su intento y su resultado: aceptado, fallido o desconocido | §8.4.3 l.1646 | No implementada | «Prep Alert Insert» corre en una rama paralela al envío y no lee la salida de Slack ni de correo |
| R8B-26 | Ningún resultado desconocido se registra como éxito ni como fallo cierto | §8.4.3 l.1646 | Contraria | «Prep Alert Insert» escribe `delivery_status = 'sent'` y `sent_at = NOW()` fijos, antes de conocer el resultado |
| R8B-27 | El mensaje consolidado tiene un identificador común a sus canales | §8.4.3 l.1646; Tabla 24 l.1735 | No implementada | Solo alert_uuid por aviso (init.sql:168); «Aggregate Alerts» no genera id de mensaje |
| AD-95 | Un único mensaje consolidado con identificador propio, un intento por Slack y otro por correo | D.5.2, l.2181 | Parcial | consolidado y sin reintento («Send Slack Alert», «Send Gmail Alert»); no hay identificador de mensaje |
| AD-100 | Por canal, el intento: id, hora de inicio, hora de respuesta o de agotamiento, estado y error resumido sin secretos | D.5.3, l.2182 | No implementada | alerts (init.sql:165-186): solo channels_sent, sent_at y un delivery_status único |
| AD-101 | Los avisos de un mismo mensaje comparten el resultado por canal; los indicadores cuentan mensajes por id | D.5.3, l.2182 | No implementada | no hay id de mensaje ni resultado por canal |
| AD-102 | «Aceptado» no acredita entrega ni lectura | D.5.4, l.2183 | Parcial | el CHECK admite 'delivered' (init.sql:179), estado que el diseño declara no observable; 'sent' se escribe sin respuesta |
| AD-106 | Estados del intento de aviso por canal (Tabla D1) | D.5, Tabla D1, l.2185-2195 | Parcial | init.sql:179 `delivery_status IN ('pending','sent','delivered','failed')`, un solo campo y no por canal; «Prep Alert Insert» escribe 'sent' en paralelo al envío |
| AD-107 | Estado Pendiente: la solicitud todavía no comenzó | Tabla D1, l.2191 | Parcial | 'pending' es DEFAULT (init.sql:179), pero nunca se escribe por canal |
| AD-109 | Estado Aceptado: el proveedor devolvió aceptación | Tabla D1, l.2193 | Parcial | 'sent' se fija sin condición en «Prep Alert Insert», sin leer la respuesta |
| AD-110 | Estado Fallido: rechazo o error que acredita la no aceptación | Tabla D1, l.2194 | Parcial | 'failed' existe en el CHECK (init.sql:179), pero el flujo nunca lo escribe |
| AD-111 | Estado Desconocido (p. ej., tiempo de espera agotado después de enviar) | Tabla D1, l.2195 | No implementada | no existe en el CHECK init.sql:179 |
| AD-112 | Un intento que queda en curso al terminar se registra como desconocido; éxito/fallo, doble fallo y tiempo agotado son distinguibles | Tabla D1 nota, l.2197 | No implementada | ver AD-106 a AD-111 |

### Reenvío manual

La especificación permite un reenvío manual que registra un intento nuevo y advierte un posible duplicado. No hay endpoint de reenvío ni resultado por canal sobre el cual decidirlo. **Trabajo futuro:** depende del resultado por canal (tema anterior).

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-30 | Un reenvío manual registra un intento nuevo con su id y advierte posible duplicado | §8.4.3 l.1646 | No implementada | No hay endpoint de reenvío (backend/routers/alerts.py solo lista, detalla y reconoce) |
| AD-24 | Revisar el resultado por canal de los mensajes consolidados (fallido o desconocido); un reenvío manual es un intento nuevo | C.2, l.2115 | No implementada | no se persiste el resultado por canal (init.sql:179; «Prep Alert Insert» fija 'sent') |
| AD-105 | Reenvío manual: intento nuevo con id propio y advertencia de duplicado si el anterior quedó desconocido | D.5.4, l.2183 | No implementada | no hay endpoint de reenvío en backend/routers/alerts.py |

### Indicadores de mensajes fallidos y salud de los avisos

La especificación incluye en el panel y en los indicadores los mensajes con canal fallido o desconocido y la salud de los avisos por canal. Sin estado por canal ni identificador de mensaje, el prototipo solo muestra `delivery_status` y la tasa de reconocimiento. **Trabajo futuro:** depende del resultado por canal.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-86 | Panel: mensajes con canal fallido o desconocido (24 h, por identificador) | Tabla 24 l.1735 | No implementada | No hay estado por canal ni id de mensaje (R8B-25, R8B-27) |
| R8B-99 | Indicador: salud de los avisos (por fecha, mensajes por id y resultado por canal; avisos por nivel; proporción reconocida) | Tabla 24 l.1748 | Parcial | metrics.py:365-393: solo delivery_status y tasa de reconocimiento; sin fecha, canal ni id de mensaje |
| AD-87 | Mensajes consolidados: uno por ejecución con candidatas, con el resultado de cada canal | D.4.1, l.2170 | No implementada | execution_logs (init.sql:247-264) sin ese campo |

### Estado «en curso»

La especificación incluye el estado «en curso» del intento. No existe en el `CHECK`. **Trabajo futuro:** depende del resultado por canal.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| AD-108 | Estado En curso | Tabla D1, l.2192 | No implementada | no existe en el CHECK init.sql:179 |

## Grupo 6 · Registro de ejecución y estado por fuente

### Estado por fuente, marca más antigua, saturación, resultados incompletos de GitHub, tipo de ejecución

La especificación registra el tipo de ejecución (programada o manual) y, por fuente, si respondió, la hora, los ítems, los nuevos, la marca más antigua y `incomplete_results` de GitHub; con eso detecta la saturación. `execution_logs` guarda solo totales, estado general, inicio y fin. Una fuente que falla tras los reintentos devuelve una rama vacía sin dejar estado, y `incomplete_results` no se lee. **Consecuencia:** el registro no distingue una fuente caída de una sin novedades, ni avisa cuando una fuente devuelve más ítems que el límite y se pueden perder menciones. **Trabajo futuro:** rediseño del registro de ejecución.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-38 | Tipo de ejecución programada o manual | Tabla A1 l.1987 | No implementada | execution_logs sin columna de tipo (init.sql:247-266) |
| R8A-08 | El registro de ejecución guarda tipo (programada/manual), estado por fuente, estado general, cantidades, inicio y fin | §8.1 Etapa 5, l.1279 | Parcial | `execution_logs` tiene status, contadores, started_at y completed_at (init.sql:247-266); no tiene tipo ni estado por fuente |
| R8A-46 | GitHub: el estado por fuente registra la indicación de resultados incompletos | §8.3.3 l.1542 | No implementada | No se lee `incomplete_results` en workflow.json; no hay columna en execution_logs |
| R8B-10 | Cada disparador guarda el tipo de ejecución (programada o manual) en su registro | §8.4.1 l.1618 | No implementada | execution_logs sin columna de tipo (init.sql:247-262); «Log Execution» |
| R8B-13 | El resultado de cada fuente (respuesta válida o no) queda en el estado por fuente del registro | Tabla 21 l.1627; §8.4.3 l.1643 | No implementada | init.sql:247-262 y «Prep Log Execution»: no hay estado por fuente |
| R8B-15 | La normalización calcula el estado de la fuente (incluido «incompleta») | Tabla 21 l.1628 | No implementada | «Parse GitHub Issues» no lee incomplete_results |
| R8B-31 | El registro de ejecución guarda estado por fuente, estado general, cantidades, inicio y fin | Tabla 21 l.1635 | Parcial | «Log Execution»: status, conteos, started_at, completed_at; sin estado por fuente (init.sql:247-262) |
| R8B-75 | T23 Registros: historial con estado por fuente | Tabla 23 l.1716 | Parcial | backend/routers/logs.py:16-33; sin estado por fuente (init.sql:247-262) |
| R8B-101 | Indicador: salud de las fuentes (respuesta válida, incompletas, ítems nuevos) | Tabla 24 l.1750 | No implementada | No hay estado por fuente en execution_logs (init.sql:247-262) |
| AD-25 | Verificar 96 ejecuciones diarias y menciones nuevas no persistidas | C.2, l.2116 | Parcial | backend/routers/logs.py:16 lista ejecuciones; execution_logs (init.sql:247-264) no tiene «nuevas» ni «no persistidas» |
| AD-46 | Inicio: registrar la hora de inicio y el tipo (programada o manual) | D.1.1, l.2148 | Parcial | «Prep Log Execution» usa `$execution.startedAt`; execution_logs (init.sql:247-264) no tiene columna de tipo |
| AD-47 | Fuente que falla tras los reintentos o con respuesta malformada: rama vacía con 0 ítems | D.1.2, l.2149 | Parcial | retryOnFail/maxTries 3/continueOnFail (workflow.json:159-162,193-196,222-225); los parsers devuelven [] (:229,242,255); no se registra el estado |
| AD-50 | El estado de la fuente registra si respondió, la hora, los ítems, la marca más antigua (HN created, GitHub updated, Exploit-DB ninguna) e incomplete_results de GitHub | D.1.2, l.2149 | No implementada | no hay campo ni nodo; incomplete_results se ignora en «Parse GitHub Issues» |
| AD-56 | El estado de cada fuente registra cuántas de sus menciones son nuevas | D.1.4, l.2151 | No implementada | solo un conteo global en consola («Filter Already Processed») |
| AD-90 | Registro: id del orquestador, tipo, estado por fuente, estado general, cantidades (recolectadas, persistidas, avisos, mensajes), inicio y fin | D.4.3, l.2172 | Parcial | «Log Execution» (:691) guarda execution_id, status, collected, processed, detections, alerts, started_at, completed_at=NOW(); faltan tipo, estado por fuente y mensajes consolidados |
| AD-91 | Estado por fuente: respondió, hora de recepción, ítems, nuevos, marca más antigua, resultados incompletos de GitHub | D.4 «Estado por fuente», l.2174 | No implementada | execution_logs solo con totales (init.sql:247-264) |
| AD-92 | Cada rama produce su estado aunque su fuente falle o no devuelva resultados | D.4, l.2174 | No implementada | los parsers devuelven [] (:229,242,255) y no emiten estado |
| AD-93 | Saturación: 50 ítems y marca más antigua posterior al inicio de la ejecución válida anterior | D.4 «Saturación», l.2176 | No implementada | sin marca más antigua ni estado por fuente |

### Estado general binario: con las tres fuentes caídas registra «success»; cuenta como persistidas menciones no confirmadas

La especificación define error, éxito parcial y éxito según cuántas fuentes respondieron y cuántas menciones se confirmaron. «Prep Log Execution» produce solo `success` o `error`, «Prep Log No Items» fija `success` aunque fallen las tres fuentes, y los conteos toman los ítems que pasan por el flujo, no los INSERT confirmados (desde el arreglo b también cuentan los que no se escribieron por conflicto). **Consecuencia:** una corrida con las tres fuentes caídas figura como exitosa, y las cantidades pueden sobrestimar lo persistido. **Trabajo futuro:** calcular el estado y los conteos a partir de las respuestas de las fuentes y de `RETURNING`.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-32 | Si fallan 1 o 2 fuentes es éxito parcial; si fallan las 3, error | §8.4.3 l.1643 | No implementada | init.sql:254 admite partial_success, pero «Prep Log Execution» solo produce success/error y «Prep Log No Items» siempre 'success' |
| AD-31 | Revisar errores y registros con estado de error o de éxito parcial | C.3, l.2124 | Parcial | el CHECK admite partial_success (init.sql:254), pero «Prep Log Execution» (:677) nunca lo emite |
| AD-85 | Menciones persistidas = las de transacciones confirmadas | D.4.1, l.2170 | Contraria | «Prep Log Execution» (:677): `mentionsProcessed = enrichMentionItems.length` (cuenta los ítems que pasan, no los INSERT confirmados) |
| AD-86 | Avisos registrados = detecciones high/critical persistidas en esta ejecución | D.4.1, l.2170 | Parcial | «Prep Log Execution»: `alertsGenerated = alertCandidates` (con alertResults=[] fijo), no los avisos persistidos |
| AD-88 | Estado general: error si ninguna fuente respondió o no se persistió ninguna nueva; éxito parcial si respondieron 1–2 fuentes o hubo reversiones; si no, éxito; la misma regla sin nuevas | D.4.2, l.2171 | Contraria | «Prep Log Execution»: `mentionsProcessed===0 ? 'error' : 'success'` (sin partial); «Prep Log No Items» (:748) fija 'success' aunque fallen las tres fuentes |

## Grupo 7 · Instantánea de la clasificación y versión de reglas

### Instantánea, versión de reglas y referencia a la ejecución

La especificación guarda en cada detección una instantánea inmutable (insumos, keywords con peso, aportes por factor, puntaje crudo), la versión de reglas y la referencia a la ejecución que la produjo. Nada de eso existe: no hay columnas de instantánea ni `rules_version`, `raw_score` no se persiste, los umbrales están fijos en «Classify Threat», no hay FK hacia `execution_logs`, y la purga borra los registros de ejecución sin respetar referencias. Desde el arreglo b la detección ya no se reclasifica en el lugar. **Consecuencia:** una detección no se puede explicar ni reproducir solo con la base, y un cambio de pesos no deja rastro. **Trabajo futuro:** columnas de instantánea, tabla de versiones de reglas y FK a la ejecución.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-20 | La mención registra la ejecución que la adquirió (FK al registro de ejecución) | Tabla A1 l.1981, l.1987 | No implementada | social_mentions sin execution_id ni FK (init.sql:15-57) |
| A-25 | La instantánea de clasificación no se modifica, salvo el borrado del autor en la purga | Tabla A1 l.1983 | No implementada | No hay columna de instantánea (init.sql:109-147); «Insert Threat Detection» `ON CONFLICT … DO UPDATE` reescribe la clasificación |
| A-59 | La instantánea de la detección confirmada pierde los datos del autor | A.2 l.2034; Tabla 8 l.1168 | No implementada | No hay instantánea ni código de purga para ella (init.sql:109-147, 449-481) |
| A-63 | Los registros de ejecución vencidos se eliminan, salvo los referenciados por una mención o instantánea conservada | A.2 l.2035; Tabla A1 l.1987 | Contraria | init.sql:468-469 borra todo registro con `started_at < cutoff`; no existen las referencias (A-20) |
| R8A-22 | Instantánea inmutable de la clasificación (insumos, keywords con peso, aportes por factor, crudo, longitud del texto, ejecución) | §8.1.1 l.1480 | No implementada | `threat_detections` (init.sql:109-147) no tiene columnas de instantánea; `raw_score` no se persiste («Insert Threat Detection», :494) |
| R8A-23 | Versión de reglas en cada detección; los cambios crean versión nueva y se conserva el registro de versiones | §8.1.1 l.1480 | No implementada | No existe `rules_version` en init.sql, workflow.json ni backend |
| R8A-25 | La detección referencia la ejecución que la clasificó, y la mención la que la adquirió | §8.1.1 l.1480; Fig. 2 l.1340 | No implementada | No hay FK hacia `execution_logs` en social_mentions ni en threat_detections (init.sql:15-147) |
| AD-30 | Ajuste de umbrales si los FP superan el 25 %; todo ajuste crea una versión de reglas nueva; congelamiento durante la campaña | C.3, l.2123 | No implementada | pesos y umbrales fijos en «Classify Threat» (workflow.json:395); no hay versión de reglas en init.sql |
| AD-73 | Instantánea de la clasificación: versión de reglas, insumos, keywords con peso, aportes por factor y puntaje crudo | D.2, l.2158 | No implementada | threat_detections (init.sql:109-147) no tiene versión ni instantánea; raw_score no se persiste |

## Grupo 8 · Derechos del titular, supresión, respaldos y retención

### Supresión con lápida, bloqueo por titular, registro de supresiones, reaplicación tras restaurar

La especificación da al titular el bloqueo inmediato y la supresión en 5 días hábiles: una operación que borra análisis, detección y aviso, deja una lápida que la deduplicación respeta, se registra sin identificar a la persona y se reaplica tras restaurar un respaldo. El prototipo no tiene bloqueo, supresión, lápidas ni registro de supresiones. **Consecuencia:** un pedido del titular se atiende a mano (Anexo C.4) con SQL directo, y una mención borrada así puede volver a adquirirse si la fuente todavía la publica. **Trabajo futuro:** procedimiento de supresión con tabla de lápidas.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-19 | Bloqueo por pedido del titular: la mención bloqueada no se muestra en vistas ni entra en avisos | Tabla A1 l.1981; §7.8.3 l.1141 | No implementada | Sin columna de bloqueo en social_mentions (init.sql:15-57); las vistas (init.sql:525-567) no filtran |
| A-64 | Las menciones suprimidas se eliminan con la misma regla de purga | A.2 l.2039 | No implementada | No hay lápidas ni estado suprimido (ver A-65) |
| A-65 | Supresión a pedido del titular: una sola operación que borra análisis, detección y aviso (incluidas las confirmadas) | A.2 l.2041; §7.8.3 l.1141 | No implementada | No hay procedimiento ni endpoint; init.sql solo define purge_old_data y optimize_database |
| A-66 | La supresión deja una lápida (plataforma, ID externo, fechas, marca, sin autoría, URL ni contenido) que impide volver a adquirir el ítem | A.2 l.2041; Tabla A3 l.2053 | No implementada | No implementada; la deduplicación de «Check Existing IDs» bloquearía una lápida si existiera, pero nunca se crea |
| A-67 | La supresión se registra en la actividad (operador, referencia, cantidad) sin identificar a la persona | A.2 l.2041; Tabla A3 l.2057 | No implementada | No hay operación de supresión |
| A-69 | Toda restauración reaplica las supresiones posteriores y ejecuta la purga antes de habilitar consultas | A.2 l.2043 | No implementada | No hay procedimiento de restauración |
| A-70 | Registro de supresiones fuera de la base: solo clave, fecha y referencia; se conserva como máximo 3 meses | A.2 l.2045; Tabla A3 l.2061 | No implementada | Sin apoyo en el repositorio (procedimental) |
| AD-40 | Bloqueo de menciones por titular mientras se resuelve (fuera de vistas y avisos); desbloqueo con nota | C.4.3, l.2135 | No implementada | no hay columna ni filtro de bloqueo (sin «block/bloque» en init.sql, backend y workflow) |
| AD-41 | Supresión en 5 días hábiles: borra análisis, detección y aviso, deja una lápida que la deduplicación respeta y registra la operación sin identificar a la persona | C.4.4, l.2136 | No implementada | no hay procedimiento de supresión, tabla de lápidas ni registro de supresiones (init.sql) |
| AD-42 | Borrar mensajes de Slack y correos controlados, documentar los no borrables y agregar las claves al registro de supresiones | C.4.4, l.2136 | No implementada | no existe registro de supresiones (la parte externa es manual) |
| AD-45 | La restauración de un respaldo reaplica las supresiones antes de habilitar consultas; la lápida cae con la purga | C.4 límites, l.2140 | No implementada | no hay lápidas ni registro que reaplicar |
| AD-57 | Las lápidas conservan la clave y también se descartan | D.1.4, l.2151 | No implementada | no hay lápidas |

### Purga de la actividad de usuarios a los 365 días

La especificación elimina la actividad de usuarios anterior a 365 días. `purge_old_data` no toca `user_activity`. **Consecuencia:** la actividad, con IP y sesión, se conserva sin plazo. **Trabajo futuro:** agregar ese borrado a `purge_old_data`.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-62 | Regla 3: la actividad de usuarios anterior al plazo se elimina (Tabla A3: 365 días) | A.2 l.2035; §7.8.3 l.1139; Tabla 8 l.1172; Tabla A3 l.2057 | No implementada | purge_old_data (init.sql:449-481) no toca user_activity |

### Respaldos mensuales

La especificación hace un respaldo mensual y conserva los tres últimos, con acceso restringido. No hay servicio ni script de respaldo en el repositorio. **Trabajo futuro:** script con `pg_dump` y rotación; mientras tanto, es un procedimiento manual.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-68 | Se conservan los tres últimos respaldos mensuales, con acceso restringido | A.2 l.2043; Tabla A3 l.2060 | No implementada | No hay servicio ni script de respaldo (docker-compose.yml; scripts/ solo tiene n8n-entrypoint.sh) |
| AD-27 | Respaldo mensual, conservando solo los tres últimos | C.3, l.2121 | No implementada | no hay script de respaldo en el repo (sin pg_dump) |

### Historial de n8n de 35 días

La especificación conserva el historial del orquestador 35 días. `docker-compose.yml` no define `EXECUTIONS_DATA_PRUNE` ni `EXECUTIONS_DATA_MAX_AGE`, así que rige la configuración por defecto de n8n. **Trabajo futuro:** fijar esas dos variables.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-72 | El historial del orquestador se conserva 35 días y se elimina por antigüedad | Tabla A3 l.2058 | No implementada | El entorno de n8n en docker-compose.yml no define EXECUTIONS_DATA_PRUNE/MAX_AGE; rige el valor por defecto de n8n |
| AD-28 | Eliminar del historial del orquestador las ejecuciones de más de 35 días | C.3, l.2121 | No implementada | docker-compose.yml no configura EXECUTIONS_DATA_PRUNE/MAX_AGE |

## Grupo 9 · Normalización y fechas

### HN guarda la respuesta completa

La especificación guarda un contenido original compacto en las tres fuentes. GitHub y Exploit-DB lo hacen; Hacker News guarda el ítem completo de la respuesta (con `_highlightResult`), con solo un tope de tamaño. **Consecuencia:** se guardan más datos que los necesarios. **Trabajo futuro:** un objeto compacto, como en GitHub.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-03 | Minimización de datos (general) | §7.8.3 l.1136 | Parcial | Ver A-06, A-09 a A-12. GitHub y Exploit-DB guardan contenido compacto; HN no; GitHub guarda `author_description` (init.sql:30) |
| A-12 | El contenido original se guarda como objeto compacto en las tres fuentes | Tabla 8 l.1170 | Parcial | Compacto: «Parse GitHub Issues» (`compactIssue`), «Parse RSS Items». Completo: «Parse Items» (HN) `raw_data: item`. Solo hay tope de tamaño (sqlJsonb 8000) |
| R8A-42 | Contenido original compacto por fuente (HN: id, título, texto, URL, autor, votos, comentarios, fecha), no la respuesta completa | §8.3.1 l.1532; §8.3.2 l.1538; Tabla 19 l.1575 | Parcial | HN `raw_data: item`, el hit completo con `_highlightResult` (workflow.json:229); RSS compacto (:242); GH `compactIssue` (:255); tope de 8000 en `sqlJsonb` («Prep Mention Insert») |

### GitHub guarda la biografía del autor

La especificación excluye las variables sensibles no vinculadas con la seguridad técnica. GitHub guarda la biografía del autor (`author_description`), y el esquema tiene `geo_location`, que no se completa. **Trabajo futuro:** dejar de guardar `author_description`.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-06 | Se excluyen las variables sensibles no vinculadas con la seguridad técnica | §7.8.3 l.1142 | Parcial | GitHub guarda la biografía del autor: `author_description` («Parse GitHub Issues»; init.sql:30). El esquema tiene `geo_location` (init.sql:43), que no se completa |

### HN pierde el título si hay texto

La especificación arma el texto de Hacker News como título, salto de línea y texto propio. El prototipo usa `story_text || title`, así que descarta el título cuando hay texto propio. **Consecuencia:** la clasificación no ve las keywords que estén solo en el título. **Trabajo futuro:** concatenar título y texto.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8A-40 | HN: texto = título + salto de línea + texto propio | §8.3.1 l.1532; Tabla 19 | Contraria | `text = item.story_text \|\| item.title` («Parse Items», workflow.json:229): descarta el título cuando hay texto propio |

### Exploit-DB fija autor 'exploit-db'

La especificación deja vacío el autor en Exploit-DB. El prototipo fija `author_username: 'exploit-db'`. **Trabajo futuro:** dejarlo vacío.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8A-44 | Exploit-DB: id = guid (URL); texto = descripción o título; URL = link; fecha = pubDate; sin autor ni interacción | §8.3.2 l.1538; Tabla 19 | Parcial | «Parse RSS Items» (workflow.json:242) cumple id, texto, URL, fecha e interacción 0, pero fija `author_username: 'exploit-db'` en lugar de dejarlo vacío |

### Ítems sin id externo no se descartan

La especificación descarta los ítems sin identificador externo y deja constancia en el historial. «Deduplicate» los conserva, y los parsers y «Prep Mention Insert» les ponen `'unknown'`. **Consecuencia:** pueden persistirse ítems que no se pueden deduplicar entre ejecuciones. **Trabajo futuro:** descartarlos y contarlos.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-17 | El ítem sin identificador externo se descarta | Tabla 21 l.1629 | Contraria | «Deduplicate»: `if (!key \|\| !seen.has(key)) … unique.push(item)` conserva los ítems sin clave |
| AD-52 | Los ítems sin identificador externo se descartan y el descarte queda en el historial | D.1.3, l.2150 | Contraria | «Deduplicate»: `if (!key \|\| !seen.has(key)) unique.push(item)` conserva los que no tienen clave; los parsers y «Prep Mention Insert» sustituyen 'unknown' |

### Conversión a Buenos Aires

La especificación convierte las marcas a hora de Buenos Aires para días y series. Las marcas se guardan con zona horaria, pero la conversión se hace solo en el contenido del aviso. **Trabajo futuro:** va con las series del tema «Series por fecha de publicación y en UTC».

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| AD-65 | Marcas con zona horaria, convertidas a Buenos Aires para días y series | D.1.7, l.2154 | Parcial | TIMESTAMPTZ (init.sql:22-24); conversión a BA solo en «Build Alert Content» (fmtTimestamp) |

### Fecha faltante reemplazada por la hora actual

La especificación no reemplaza una fecha faltante o incoherente: la marca, la excluye del cálculo e informa la cantidad. Los parsers y «Prep Mention Insert» la reemplazan por la hora actual. **Consecuencia:** esos ítems aparecen como publicados en el momento de la corrida, lo que distorsiona las series y el corte de la purga. **Trabajo futuro:** dejar la fecha vacía y contarla.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| AD-66 | Fecha faltante o incoherente: no se reemplaza; se marca y se excluye del cálculo, informando la cantidad | D.1.7, l.2154 | Contraria | «Parse Items» `Date.now()`, «Parse RSS Items» `new Date()`, «Parse GitHub Issues» y «Prep Mention Insert» (sqlTimestamp) sustituyen por la hora actual |

## Grupo 10 · Servicio de sentimiento

### El método por defecto se registra como 'ensemble'

La especificación distingue el sentimiento por defecto (cuando el servicio falla) del calculado. «Classify Threat» usa `neutral` cuando el servicio falla, pero «Insert Sentiment Analysis» registra siempre `analysis_method = 'ensemble'`. **Consecuencia:** no se puede separar un neutral calculado de uno por defecto, ni excluirlos de los indicadores. **Trabajo futuro:** registrar `'default'` en ese caso.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-23 | El método por defecto (sin VADER/TextBlob, combinado y acuerdo en 0, neutral) se distingue del calculado | Tabla A1 l.1982 | No implementada | «Insert Sentiment Analysis» escribe siempre `analysis_method='ensemble'`; no hay CHECK para el caso por defecto |
| R8B-20 | Si falla el sentimiento: `neutral` registrado con método «por defecto» | Tabla 21 l.1631; §8.4.3 l.1644 | Parcial | «Classify Threat» usa neutral si sentimentFailed, pero «Insert Sentiment Analysis» fija `analysis_method = 'ensemble'` |
| AD-74 | Sentimiento sin respuesta: la clasificación usa `neutral` y el análisis se registra con el método por defecto | D.2, l.2158 | Parcial | «Classify Threat»: si sentimentFailed → neutral; pero «Insert Sentiment Analysis» (:457) fija siempre `'ensemble'` |

### Etiqueta calculada sobre el valor sin redondear

La especificación aplica los umbrales ±0,05 sobre el valor ya redondeado. El servicio compara el valor sin redondear. **Consecuencia:** la etiqueta puede diferir en los casos borde. **Trabajo futuro:** redondear antes de comparar.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| AD-82 | Etiqueta con umbrales ±0,05 aplicados sobre el valor ya redondeado | D.3, l.2165 | Contraria | sentiment_api.py:65 compara `ensemble_score` sin redondear (difiere en casos borde) |

## Grupo 11 · Vistas e indicadores (Tablas 23 y 24)

### Panel con 2 de 8 indicadores; indicadores faltantes o distintos

La especificación (Tablas 23 y 24) define las vistas, sus filtros y los indicadores del panel y de la página de indicadores. El panel entrega 2 de los 8 indicadores tal cual y uno a medias; varios indicadores faltan o se calculan de otra forma (intervalos del histograma, agrupación por categoría y no por tipo, ventana máxima de 365 días en la API, entre otros). Ninguna de estas diferencias afecta la seguridad. **Trabajo futuro:** completar los indicadores de la Tabla 24.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-66 | Las listas van de la más reciente a la más antigua y se paginan | §8.5.3 l.1700 | Parcial | threats.py:93 (detected_at desc), alerts.py:39, logs.py:33 con offset/limit; las menciones se ordenan por created_at (publicación), backend/routers/metrics.py:92 |
| R8B-69 | T23 Panel (Ver panel; los ocho indicadores de la Tabla 24) | Tabla 23 l.1710 | Parcial | AppRouter.tsx:43; backend/routers/dashboard.py:20-37 entrega 2 de los 8 indicadores tal cual y uno a medias |
| R8B-70 | T23 Menciones: lista por fecha de adquisición, con filtros por plataforma y por etiqueta de sentimiento | Tabla 23 l.1711 | Parcial | backend/routers/metrics.py:75 (solo filtro de plataforma), :92 (orden por created_at); MentionsToolbar.tsx:27-36 |
| R8B-72 | T23 Avisos: filtros por nivel y por estado de reconocimiento; reconocimiento | Tabla 23 l.1713 | Parcial | backend/routers/alerts.py:25-26 filtra por delivery_status y acknowledged, no por nivel; :57-99 reconocer |
| R8B-76 | T23 Indicadores: un gráfico por indicador analítico | Tabla 23 l.1717 | Parcial | AppRouter.tsx:51; frontend/src/features/metrics/pages/AnalyticsPage.tsx; faltan indicadores (R8B-90 a R8B-101) |
| R8B-80 | Ventana elegida por el usuario: 30 días por defecto, 90 como máximo | §8.5.4 l.1723 | Parcial | AnalyticsPage.tsx:17,22 (7/30/90); la API acepta hasta 365 (backend/routers/metrics.py:129) |
| R8B-82 | Panel: total de menciones (incluidas las suprimidas) | Tabla 24 l.1731 | Parcial | No está en dashboard.py:20-37; sí en backend/routers/metrics.py:39 |
| R8B-83 | Panel: menciones de las últimas 24 h | Tabla 24 l.1732 | No implementada | backend/routers/dashboard.py:20-37 |
| R8B-84 | Panel: detecciones high/critical pendientes de revisión | Tabla 24 l.1733 | Parcial | dashboard.py:22-24 cuenta todas las pendientes, sin filtrar nivel |
| R8B-85 | Panel: avisos de las últimas 24 h | Tabla 24 l.1734 | No implementada | dashboard.py:26 (total histórico) |
| R8B-89 | Panel: última ejecución (estado, inicio, fin) | Tabla 24 l.1738 | Parcial | El panel solo da un conteo (dashboard.py:35); se muestra en Automatización (AutomationPage.tsx:50) |
| R8B-91 | Indicador: sentimiento por día = promedio del puntaje combinado, sin los análisis por defecto | Tabla 24 l.1740 | No implementada | metrics.py:146-185 cuenta por etiqueta, no promedia ni excluye los análisis por defecto |
| R8B-92 | Indicador: distribución de sentimiento por etiqueta y por método | Tabla 24 l.1741 | Parcial | metrics.py:42-50: solo por etiqueta, sin ventana; el método siempre es 'ensemble' |
| R8B-95 | Indicador: histograma del puntaje de riesgo en intervalos 0–9, …, 90–100 | Tabla 24 l.1744 | Parcial | metrics.py:318-329 usa 0–10, 11–20, …, 91–100 |
| R8B-96 | Indicador: tipos de detección | Tabla 24 l.1745 | Parcial | metrics.py:227-244 agrupa por threat_category, no por threat_type |
| R8B-98 | Indicador: las 20 keywords más frecuentes según las coincidentes de cada detección | Tabla 24 l.1747 | Parcial | init.sql:402-413 (vista materializada con ventana fija de 30 d); límite por defecto 15 (metrics.py:250) |
| R8B-100 | Indicador: salud de las ejecuciones (ejecuciones, éxitos, éxitos parciales, errores y duración media por fecha) | Tabla 24 l.1749 | Parcial | init.sql:417-429 (workflow_performance_stats sin partial_success); metrics.py:276-304 |

### Series por fecha de publicación y en UTC

La especificación calcula series y ventanas por fecha de adquisición y en hora de Buenos Aires. La API usa la fecha de publicación (`created_at`) y calcula la ventana en UTC. **Consecuencia:** las series muestran cuándo se publicó cada mención, no cuándo la adquirió el sistema, y el corte de día se corre tres horas. **Trabajo futuro:** usar `collected_at` y convertir a `America/Argentina/Buenos_Aires`.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8B-81 | Series y ventanas de menciones por fecha de adquisición, en hora de Buenos Aires, no por publicación | §8.5.4 l.1723; nota l.1752 | Contraria | backend/routers/metrics.py:135-139, :155-160, :219, :413 usan created_at (publicación) y calculan la ventana en UTC |
| R8B-90 | Indicador: menciones por día, por fecha de adquisición y plataforma | Tabla 24 l.1739 | Parcial | metrics.py:126-143: sin desglose por plataforma y con fecha de publicación |
| R8B-93 | Indicador: distribución por plataforma | Tabla 24 l.1742 | Parcial | metrics.py:207-224 (ventana por created_at) |

## Grupo 12 · Detalles del esquema

### Término sin FK a categoría

La especificación exige que el término pertenezca a una categoría existente. `keyword_category` es texto libre, sin FK, y la API solo valida la longitud. **Trabajo futuro:** FK a la tabla de categorías.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| A-36 | El término pertenece a una categoría existente | Tabla A1 l.1985 | No implementada | init.sql:216 `keyword_category` de texto libre, sin FK; backend/schemas/keyword.py:21-24 solo valida longitud |

### Dominios cerrados que faltan (tipo de ejecución, estado por canal)

La especificación restringe en la base todos los valores de dominio cerrado. Hay `CHECK` en plataforma, etiqueta, nivel, estado de revisión, estado y puntajes; faltan el tipo de ejecución y el estado por canal, que tampoco existen como columnas. Se resuelve junto con los temas de resultado por canal y estado por fuente.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| R8A-28 | Valores de dominio cerrado restringidos en la base y puntajes acotados | §8.2 l.1497 | Parcial | CHECK en platform, label, criticality, review_status, status y puntajes (init.sql:17, 89, 116-118, 131, 254); faltan el tipo de ejecución y el estado por canal |

### Modelo de datos y flujo «en general» (filas resumen)

Son filas resumen del modelo de datos y del flujo. Siguen el resultado de los demás temas: en concreto, falta el procedimiento de supresión y el `INSERT` del administrador inicial, y el flujo tiene las diferencias declaradas en los demás temas.

| ID | Regla de la especificación | Sección | Estado | Evidencia (develop 9b90270) |
|---|---|---|---|---|
| AD-15 | Modelo de datos: entidades, 3 roles de grupo, políticas por fila, purga y supresión, categorías y términos, permisos y roles, administrador inicial con hash | C.1.3, l.2104 | Parcial | init.sql:15,76,109,165,247 (tablas); 573-575 (roles); 618-636 (políticas); 449 (purga); 742/756 (seeds); 759/783 (roles y permisos). No hay procedimiento de supresión ni INSERT de administrador en init.sql |
| AD-19 | Flujo construido con los pasos de la Tabla 21 y las reglas del Anexo D | C.1.7, l.2108 | Parcial | workflow.json (ver D.1–D.5 abajo) |

## Filas cuya evidencia cambió con los arreglos de B4

La matriz se auditó sobre `develop` 9b90270. En la rama `fix/rev76-conformidad` cambió parte de la evidencia de estas filas:

| Fila | Qué cambió |
|---|---|
| AD-20 | `e990d80` publica 5678 solo en `127.0.0.1`. Al reevaluarla en el paso 4 pasó a «implementar», así que ya no figura en este documento. |
| R8B-39 | La evidencia menciona el puerto expuesto, que se corrigió en `e990d80`. La falta del secreto sigue. |
| AD-64, AD-94 | `c81c96f` evita reescribir y el índice único evita el segundo aviso en la base; el reenvío por los canales sigue. Se reevaluaron en el paso 4 y quedan en «declarar». |
| A-25 | La evidencia cita `ON CONFLICT … DO UPDATE`; desde `c81c96f` es `DO NOTHING`. La instantánea sigue sin existir. |
| AD-99 | La evidencia dice que el mensaje lleva el autor; desde `8ced8ae` ya no lo lleva. Siguen faltando la vista previa y el identificador. |
| AD-85 | Desde `c81c96f` el conteo también incluye los ítems que no se escribieron por conflicto (ya anotado en el plan). |
