# Matriz de conformidad especificación ↔ prototipo (REV76)

Prompt B3 del plan REV76. Fecha: 12/11/2026. Fuente de las reglas: `Tesis_NSG_OSINT_REV76.md` (capítulos 7 y 8 y Anexos A–D; los números «l.» son líneas de ese archivo). Código cotejado: rama `develop`, commit `9b90270`. Las rutas son relativas a `nexus-security-group/`. Para `workflow.json` se cita el nombre del nodo de n8n y, cuando existe, la línea del campo de código o consulta.

**Método.** Lectura del código, sin ejecutar el sistema. Cada estado es una inferencia sobre el código y no un resultado de prueba. Los escenarios E01–E31 (Anexo E) se asocian por contenido; ninguno se ejecutó para esta matriz.

**Estados.** *Implementada*: el código hace lo que dice la regla. *Parcial*: lo hace en parte. *No implementada*: no hay código. *Contraria*: el código hace lo opuesto. *No aplica*: procedimiento manual sin código esperado.

**Reglas repetidas.** Algunas reglas aparecen en más de una sección de la tesis (por ejemplo, la persistencia atómica en §8.1, §8.4 y D.1.5). Se conserva una fila por cada aparición, porque cada sección se corrige por separado, de modo que los conteos incluyen esas repeticiones.

## Resumen

| Bloque | Filas | Implementada | Parcial | No implementada | Contraria | No aplica |
|---|---|---|---|---|---|---|
| Capítulo 7 (§7.3–7.8) y Anexo A | 81 | 34 | 13 | 21 | 13 | 0 |
| Capítulo 8, §8.1–8.3 | 49 | 31 | 6 | 6 | 6 | 0 |
| Capítulo 8, §8.4–8.5 | 101 | 44 | 30 | 19 | 8 | 0 |
| Anexos B, C y D | 112 | 38 | 29 | 26 | 10 | 9 |
| **Total** | **343** | **147** | **78** | **72** | **37** | **9** |

## Las 14 reglas de la muestra del profesor (Anexo B.2, auditada sobre f6bc099)

La muestra del profesor se auditó sobre `f6bc099` (02/10/2026). `develop` tiene 18 commits posteriores; dos tocan estas reglas: `1040a87` (políticas por fila) y `876caca` (Hacker News). Cambios de veredicto respecto de la muestra:

- **Política por fila para cada rol:** de *Parcial* a **Implementada** por `1040a87` (A-46, R8A-36). Sin embargo, el backend y n8n se conectan como propietario, así que las políticas solo rigen en conexiones directas. Además, la exclusión del hash de contraseña y de los datos de red es **Contraria** (A-15, A-50, R8A-34).
- **Autenticación:** de *Implementada* a **Parcial**. Los hashes nuevos son PBKDF2-SHA256, no bcrypt (`backend/auth/passwords.py:8-21`; verificado). bcrypt solo se usa para verificar hashes anteriores (R8B-42, R8B-43).
- **Banda de seguidores (Tabla 8):** de *No implementada* a **Contraria**, porque el esquema guarda la cantidad y Hacker News copia `points` en seguidores (A-10, A-11).
- **Hacker News, seguidores = points:** sigue **Contraria**; `876caca` no lo corrigió (R8A-37).
- Las demás coinciden con la muestra.

Filas marcadas con ★:

| ID | Regla | Estado actual |
|---|---|---|
| A-10 | Se guarda la banda de seguidores (ninguna, >1.000, >10.000, >100.000), no la cantidad | Contraria |
| A-11 | Con las 3 fuentes, la banda y la verificación quedan vacías (Factor 4 suma 0) | Contraria |
| A-12 | El contenido original se guarda como objeto compacto en las tres fuentes | Parcial |
| A-19 | Bloqueo por pedido del titular: la mención bloqueada no se muestra en vistas ni entra en avisos | No implementada |
| A-46 | Política por fila en detecciones por rol: administración todas; análisis sin revisor o propias; consulta lee todas | Implementada |
| A-58 | Regla 2: las confirmadas vencidas pierden la autoría (usuario, ID, banda, verificación) y el contenido original | No implementada |
| A-60 | Las confirmadas se conservan solo con la revisión de minimización registrada; sin ella se eliminan | Contraria |
| A-61 | Las confirmadas conservadas se eliminan al doble del plazo (730 días) | Contraria |
| A-65 | Supresión a pedido del titular: una sola operación que borra análisis, detección y aviso (incluidas las confirmadas) | No implementada |
| A-66 | La supresión deja una lápida (plataforma, ID externo, fechas, marca, sin autoría, URL ni contenido) que impide volver a adquirir el ítem | No implementada |
| R8A-11 | Tabla 13: 39 keywords (10 críticas, 15 altas, 14 medias) con sus pesos | Implementada |
| R8A-12 | Coincidencia por palabra completa `\b<kw>\b` sobre el texto en minúsculas | Implementada |
| R8A-13 | Puntuación por presencia: una keyword repetida suma una sola vez; keywords distintas se acumulan | Implementada |
| R8A-14 | Tipificación: crítica → incidente crítico; si no, alta → amenaza de seguridad; si no, general, salvo TLD sospechoso → posible phishing | Implementada |
| R8A-15 | Factor 2: +15 si la etiqueta es `negative`, binario | Implementada |
| R8A-16 | Tabla 14: e = reacciones + compartidas + 2×respuestas; >1000 +20, >100 +10, >10 +5, excluyentes | Implementada |
| R8A-17 | Tabla 15: verificado +10; seguidores >100k +15, >10k +10, >1k +5, excluyentes; máximo 25 | Implementada |
| R8A-18 | Tabla 16: +5 si hay al menos una URL; +15 una sola vez si hay un TLD sospechoso (.tk .ml .ga .cf .gq .xyz .top) | Implementada |
| R8A-20 | Tabla 17: low 0-19, medium 20-39, high 40-59, critical ≥60, sobre el puntaje crudo | Implementada |
| R8A-22 | Instantánea inmutable de la clasificación (insumos, keywords con peso, aportes por factor, crudo, longitud del texto, ejecución) | No implementada |
| R8A-23 | Versión de reglas en cada detección; los cambios crean versión nueva y se conserva el registro de versiones | No implementada |
| R8A-36 | Política por fila en detecciones para cada rol (análisis: sin revisor o propias; consulta: todas; administración: completo); menciones de lectura abierta | Implementada |
| R8A-37 | Seguidores y verificación no disponibles en las 3 fuentes: banda vacía y Factor 4 = 0 | Contraria |
| R8A-39 | Tabla 18 HN: búsqueda Algolia «security», orden por fecha de creación, 50 ítems, sin filtro temporal | Implementada |
| R8A-42 | Contenido original compacto por fuente (HN: id, título, texto, URL, autor, votos, comentarios, fecha), no la respuesta completa | Parcial |
| R8A-45 | Tabla 18 GitHub: issues sin PR, seis términos, 5 OR, orden por updated desc, 50 por consulta | Implementada |
| R8B-04 | Persistencia atómica por mención: mención, análisis, detección con instantánea y estadísticas en una única transacción | No implementada |
| R8B-24 | Estados del aviso por canal | Parcial |
| R8B-42 | Autenticación: bcrypt; JWT HS256 de 60 min; 5 intentos por minuto | Parcial |
| AD-40 | Bloqueo de menciones por titular mientras se resuelve (fuera de vistas y avisos); desbloqueo con nota | No implementada |
| AD-41 | Supresión en 5 días hábiles: borra análisis, detección y aviso, deja una lápida que la deduplicación respeta y registra la operación sin identificar a la persona | No implementada |
| AD-59 | Mención, análisis y detección (con instantánea) más estadísticas en una única transacción; si algo falla, se revierte todo | No implementada |
| AD-62 | Ejecuciones superpuestas: la segunda transacción no crea ni modifica nada (mención, análisis, detección, contadores) | Contraria |
| AD-67 | Scoring y tipificación §8.1.1 (Tablas 13–17): suma de cinco factores y tipo según keywords y TLD | Implementada |
| AD-91 | Estado por fuente: respondió, hora de recepción, ítems, nuevos, marca más antigua, resultados incompletos de GitHub | No implementada |
| AD-106 | Estados del intento de aviso por canal (Tabla D1) | Parcial |

## Hallazgos fuera de la muestra que conviene priorizar

Estas reglas son **Contrarias** y no figuraban en la muestra del profesor:

- **Seguridad de la ejecución manual:** el webhook de n8n no exige el secreto y el puerto 5678 se publica en todas las interfaces (R8B-09, R8B-38, R8B-39).
- **Exposición de datos:** los roles de análisis y consulta leen `password_hash` y los datos de red y sesión (A-15, A-50, R8A-34); `/api/system/info` es público (A-78); la contraseña inicial del administrador se compara en texto plano desde el entorno (A-81).
- **Rol de servicio superusuario** (R8A-32, A-53, AD-14; inferido de la imagen de postgres, no ejecutado).
- **Avisos:** incluyen la autoría y hablan de «amenaza detectada» y «Confidence %» (A-09, AD-10, AD-11, AD-98); el estado 'sent' se escribe antes de conocer el resultado (R8B-26).
- **Registro de ejecución:** estado binario; con las tres fuentes caídas se registra 'success' (AD-88); cuenta como persistidas menciones no confirmadas (AD-85).
- **Normalización:** los ítems sin id no se descartan (AD-52, R8B-17); las fechas faltantes se reemplazan por la hora actual (AD-66); en HN se pierde el título cuando hay texto (R8A-40).
- **Purga:** corta por fecha de publicación y no de adquisición (A-57); purga las detecciones resueltas (A-32); borra registros de ejecución sin respetar referencias (A-63).
- **Indicadores:** usan la fecha de publicación y una ventana en UTC (R8B-81).
- **Permisos:** `analyst` no puede editar términos (R8B-58), y el rol `viewer` no existe (R8B-60, A-44; verificado en `init.sql:758-761`).

## Columnas para completar

- **Decisión (A6):** completada el 12/11/2026 con la Opción B, en cada fila que no está *Implementada*. **implementar** marca solo los cuatro arreglos triviales (13 filas: AD-08 se sumó al arreglo c el 12/11/2026, y AD-20 quedó cubierta por el arreglo d al reevaluarla en el paso 4). **corregir el texto** se usa cuando el código es correcto y la tesis se ajusta a él (14 filas). **manual** se usa para los procedimientos humanos (12 filas). **declarar** es una limitación que se informa y no se implementa (157 filas; el detalle está en `limitaciones_declaradas.md`).
- **Commit:** se completa en B4 con el commit que implementa la regla.

## Matriz

### Capítulo 7 (§7.3–7.8) y Anexo A (prefijo A-)

| ID | Regla | Sección | ★ | Estado | Evidencia (develop 9b90270) | Escenario | Decisión (A6) | Commit |
|---|---|---|---|---|---|---|---|---|
| A-01 | La recolección se hace solo desde fuentes públicas, sin eludir autenticación | §7.8.3 l.1134; §7.8.1 l.1114 | | Implementada | Nodos «Hacker News API Search», «Fetch Exploit-DB RSS», «Fetch GitHub Security Issues» (URL públicas, solo encabezado User-Agent) | sin escenario |  |  |
| A-02 | La finalidad se limita a señales técnicas de ciberseguridad | §7.8.3 l.1135 | | Implementada | Términos de consulta solo de seguridad: HN `query=security`, GitHub `q=vulnerability+OR+CVE…` | E03 (indirecto) |  |  |
| A-03 | Minimización de datos (general) | §7.8.3 l.1136 | | Parcial | Ver A-06, A-09 a A-12. GitHub y Exploit-DB guardan contenido compacto; HN no; GitHub guarda `author_description` (init.sql:30) | E31 | declarar |  |
| A-04 | Control de acceso por roles | §7.8.3 l.1137; A.3 l.2068 | | Implementada | backend/auth/permissions.py:66-80 (`require_permission`); init.sql:786-824 | E12 |  |  |
| A-05 | Documentación de registros (ejecuciones y actividad de usuarios) | §7.8.3 l.1138 | | Implementada | init.sql:247-266 (execution_logs), 278-297 (user_activity); nodo «Log Execution» | sin escenario |  |  |
| A-06 | Se excluyen las variables sensibles no vinculadas con la seguridad técnica | §7.8.3 l.1142 | | Parcial | GitHub guarda la biografía del autor: `author_description` («Parse GitHub Issues»; init.sql:30). El esquema tiene `geo_location` (init.sql:43), que no se completa | sin escenario | declarar |  |
| A-07 | Supervisión humana antes de cualquier decisión operativa | §7.8.3 l.1144 | | Implementada | review_status (init.sql:131); backend/routers/threats.py:152-187; ninguna acción automática | sin escenario |  |  |
| A-08 | La autoría (usuario/ID) no interviene en el scoring | Tabla 8 l.1168 | | Implementada | «Classify Threat» no usa author_username ni author_id (solo verificación y seguidores, ver A-11) | E01 |  |  |
| A-09 | Los avisos (Slack y correo) no incluyen la autoría | §7.8.4 l.1156; Tabla 8 l.1168; Tabla A3 l.2059 | | Contraria | «Aggregate Alerts» (`author: d.author_username`); «Build Alert Content» (authorCell en correo, `_autor_` en Slack); «Prep Alert Insert» (alert_message «… por <autor>», guardado en la base) | sin escenario | implementar | 8ced8ae |
| A-10 | Se guarda la banda de seguidores (ninguna, >1.000, >10.000, >100.000), no la cantidad | Tabla 8 l.1169; Tabla A1 l.1981 | ★ | Contraria | init.sql:29 `author_followers_count INTEGER`; «Prep Mention Insert» escribe la cantidad. No hay columna de banda | E31 | corregir el texto |  |
| A-11 | Con las 3 fuentes, la banda y la verificación quedan vacías (Factor 4 suma 0) | Tabla 8 l.1169; E31 | ★ | Contraria | «Parse Items» (HN): `author_followers_count: item.points`, y «Classify Threat» suma +5/+10/+15. `author_verified` vale FALSE por defecto, no vacío (init.sql:28). GitHub: `issue.user?.followers` | E31 | implementar | d69a210 |
| A-12 | El contenido original se guarda como objeto compacto en las tres fuentes | Tabla 8 l.1170 | ★ | Parcial | Compacto: «Parse GitHub Issues» (`compactIssue`), «Parse RSS Items». Completo: «Parse Items» (HN) `raw_data: item`. Solo hay tope de tamaño (sqlJsonb 8000) | E31 | declarar |  |
| A-13 | Solo el rol de servicio escribe menciones; los roles internos las leen | Tabla 8 l.1170; Tabla A2 l.2017 | | Implementada | init.sql:609 (RLS activa), 615-617 (política solo SELECT); 581, 586 | sin escenario |  |  |
| A-14 | La vista previa del aviso se limita a 100 o 120 caracteres | Tabla 8 l.1171 | | Implementada | «Build Alert Content»: `truncate(...,120)` correo, `truncate(...,100)` Slack | sin escenario |  |  |
| A-15 | Datos de red y sesión de la actividad: solo los leen el rol de servicio y el de administración | Tabla 8 l.1172; Tabla A2 l.2023 | | Contraria | init.sql:581, 586 (SELECT ON ALL TABLES a análisis y consulta, sin restricción por columna); API: backend/routers/activity.py:23 (`logs:read`, que tiene analyst, init.sql:818) devuelve ip, user_agent y sesión (backend/schemas/activity.py:58-60) | sin escenario | declarar |  |
| A-16 | Plataforma e identificador externo obligatorios y únicos en conjunto | Tabla A1 l.1981 | | Implementada | init.sql:17-18, 56 | E09 |  |  |
| A-17 | Plataforma dentro de los valores admitidos | Tabla A1 l.1981 | | Implementada | init.sql:17; «Prep Mention Insert» validPlatforms | sin escenario |  |  |
| A-18 | Contadores no negativos | Tabla A1 l.1981 | | Implementada | init.sql:32-35; «Prep Mention Insert» sqlNonNegativeInt | sin escenario |  |  |
| A-19 | Bloqueo por pedido del titular: la mención bloqueada no se muestra en vistas ni entra en avisos | Tabla A1 l.1981; §7.8.3 l.1141 | ★ | No implementada | Sin columna de bloqueo en social_mentions (init.sql:15-57); las vistas (init.sql:525-567) no filtran | sin escenario | declarar |  |
| A-20 | La mención registra la ejecución que la adquirió (FK al registro de ejecución) | Tabla A1 l.1981, l.1987 | | No implementada | social_mentions sin execution_id ni FK (init.sql:15-57) | E30 | declarar |  |
| A-21 | Como máximo un análisis de sentimiento por mención | Tabla A1 l.1982 | | Implementada | init.sql:95 | E09 |  |  |
| A-22 | Cada puntaje de sentimiento en su rango; etiqueta positive/neutral/negative | Tabla A1 l.1982 | | Implementada | init.sql:80-90 | sin escenario |  |  |
| A-23 | El método por defecto (sin VADER/TextBlob, combinado y acuerdo en 0, neutral) se distingue del calculado | Tabla A1 l.1982 | | No implementada | «Insert Sentiment Analysis» escribe siempre `analysis_method='ensemble'`; no hay CHECK para el caso por defecto | sin escenario | declarar |  |
| A-24 | Como máximo una detección por mención | Tabla A1 l.1983 | | Implementada | init.sql:146 | E09 |  |  |
| A-25 | La instantánea de clasificación no se modifica, salvo el borrado del autor en la purga | Tabla A1 l.1983 | | No implementada | No hay columna de instantánea (init.sql:109-147); «Insert Threat Detection» `ON CONFLICT … DO UPDATE` reescribe la clasificación | E06, E07 | declarar |  |
| A-26 | Nivel low/medium/high/critical; riesgo entre 0 y 100 | Tabla A1 l.1983 | | Implementada | init.sql:116, 118 | E05 |  |  |
| A-27 | Puntaje normalizado entre 0 y 0,99 | Tabla A1 l.1983 | | Parcial | init.sql:117 `confidence_score BETWEEN 0 AND 1` (tope 1, no 0,99) | sin escenario | corregir el texto |  |
| A-28 | Seis estados de revisión; pendiente es el inicial | Tabla A1 l.1983; A.1 l.1996-2003 | | Implementada | init.sql:131 (CHECK + DEFAULT 'pending'); backend/models/threat_detection.py:98 | sin escenario |  |  |
| A-29 | Solo se admiten las transiciones definidas (pendiente→en revisión→…; confirmada→resuelta) | A.1 l.2005 | | No implementada | backend/routers/threats.py:170 asigna cualquier estado sin validar la transición | E12 (indirecto) | declarar |  |
| A-30 | Cada cambio de estado registra revisor, fecha y notas | A.1 l.2005 | | Implementada | backend/routers/threats.py:170-172, 181; alerts.py:80-82 | sin escenario |  |  |
| A-31 | Solo `admin` reabre una detección decidida (vuelve a en revisión) y la reapertura queda en la actividad | A.1 l.2005; A.3 regla 6 l.2075 | | No implementada | threats.py:152-187: cualquier `threats:write` (también analyst, init.sql:812) cambia un estado decidido; no llama a record_user_activity | sin escenario | declarar |  |
| A-32 | «Detección confirmada» = confirmada o resuelta (la resuelta conserva la protección de la purga) | A.1 l.2007 | | Contraria | init.sql:463 `WHERE review_status = 'confirmed'`: las resueltas se purgan | E29 | declarar |  |
| A-33 | Como máximo un aviso por detección | Tabla A1 l.1984 | | Implementada | init.sql:188; «Prep Alert Insert» ON CONFLICT DO NOTHING | E09 |  |  |
| A-34 | Estado por canal (Slack/correo): pendiente, en curso, aceptado, fallido o desconocido | Tabla A1 l.1984 | | Contraria | init.sql:174-179: un único `delivery_status` (pending/sent/delivered/failed); «Prep Alert Insert» escribe siempre 'sent' y `ARRAY['slack','email']` | E10, E11 | declarar |  |
| A-35 | Texto del término monitoreado único | Tabla A1 l.1985 | | Implementada | init.sql:214 | sin escenario |  |  |
| A-36 | El término pertenece a una categoría existente | Tabla A1 l.1985 | | No implementada | init.sql:216 `keyword_category` de texto libre, sin FK; backend/schemas/keyword.py:21-24 solo valida longitud | sin escenario | declarar |  |
| A-37 | Nombre de categoría único | Tabla A1 l.1986 | | Implementada | init.sql:201 | sin escenario |  |  |
| A-38 | Tipo de ejecución programada o manual | Tabla A1 l.1987 | | No implementada | execution_logs sin columna de tipo (init.sql:247-266) | sin escenario | declarar |  |
| A-39 | Estado de ejecución: éxito, éxito parcial o error | Tabla A1 l.1987 | | Parcial | init.sql:254 admite además 'warning' y 'timeout' | sin escenario | corregir el texto |  |
| A-40 | Duración calculada a partir del inicio y el fin | Tabla A1 l.1987 | | Implementada | init.sql:362-375 | sin escenario |  |  |
| A-41 | Actividad: las referencias quedan vacías si se borra la entidad (también tras la purga) | Tabla A1 l.1988; A.2 regla 3 l.2035 | | Implementada | init.sql:287-289 ON DELETE SET NULL | sin escenario |  |  |
| A-42 | Usuario: nombre único; rol existente | Tabla A1 l.1989 | | Implementada | init.sql:666, 668 | sin escenario |  |  |
| A-43 | Rol: nombre único; los roles de sistema no se eliminan ni se desactivan | Tabla A1 l.1990; A.3 regla 1 l.2070 | | Implementada | init.sql:640; backend/routers/roles.py:114-118, 160-164 | sin escenario |  |  |
| A-44 | Los tres roles iniciales (`admin`, `analyst`, `viewer`) son de sistema | A.3 l.2068, regla 1 l.2070 | | Parcial | init.sql:758-761 siembra solo admin y analyst; `viewer` no existe en el código | E12 | declarar |  |
| A-45 | Par recurso–acción único; par rol–permiso único | Tabla A1 l.1991-1992 | | Implementada | init.sql:700, 715 | sin escenario |  |  |
| A-46 | Política por fila en detecciones por rol: administración todas; análisis sin revisor o propias; consulta lee todas | Tabla A2 l.2019 (§8.2.1) | ★ | Implementada | init.sql:610, 619-621 (analyst), 624-626 (readonly, 1040a87), 629-632 (admin, 1040a87) | sin escenario |  |  |
| A-47 | Mención: administración solo lectura (sin política de escritura) | Tabla A2 l.2017 | | Implementada | init.sql:577 da ALL, pero la RLS (609/615) solo tiene política SELECT: la escritura queda bloqueada | sin escenario |  |  |
| A-48 | Aviso: análisis lee, da de alta y actualiza; consulta solo lee | Tabla A2 l.2020 | | Implementada | init.sql:583, 586 | sin escenario |  |  |
| A-49 | Actividad: análisis puede dar de alta actividad | Tabla A2 l.2023 | | Implementada | init.sql:584 | sin escenario |  |  |
| A-50 | Usuario: análisis y consulta leen sin el hash de contraseña | Tabla A2 l.2024 | | Contraria | init.sql:686-687 `GRANT SELECT ON TABLE system_users` (incluye password_hash, init.sql:667) | sin escenario | declarar |  |
| A-51 | Resto de entidades: administración lectura/escritura; análisis y consulta lectura | Tabla A2 l.2018, l.2021-2022, l.2025 | | Implementada | init.sql:577-581, 586, 655-658, 721-727 | sin escenario |  |  |
| A-52 | Purga y supresión: solo las ejecuta el rol de servicio | Tabla A2 l.2026; A.2 l.2031, l.2041 | | Parcial | init.sql:579 `GRANT EXECUTE ON ALL FUNCTIONS … TO osint_admin`; no se revoca el EXECUTE de PUBLIC sobre purge_old_data; no hay procedimiento de supresión | sin escenario | declarar |  |
| A-53 | El rol de servicio crea los tres roles de grupo y después no puede crear, modificar ni otorgar roles | Tabla A2 l.2027 | | No implementada | docker-compose.yml:14, 87, 180: backend y n8n usan `POSTGRES_USER` (superusuario inicial); no hay ALTER ROLE NOCREATEROLE | sin escenario | declarar |  |
| A-54 | La purga recibe el plazo en días (365 por defecto) | A.2 l.2031; §7.8.4 l.1150 | | Implementada | init.sql:449 | E14 |  |  |
| A-55 | La purga se ejecuta en el mantenimiento mensual (como máximo un mes de demora) | A.2 l.2031, l.2037 | | No implementada | Nada programa la llamada a purge_old_data (solo está definida en init.sql:449) | sin escenario | manual |  |
| A-56 | Regla 1: las menciones vencidas no confirmadas se eliminan con su análisis, detección y aviso | A.2 l.2033; §7.8.4 l.1150 | | Parcial | init.sql:458-464 + cascadas 78, 111, 167. «Confirmada» excluye las resueltas (A-32) | E29 | declarar |  |
| A-57 | El corte usa la fecha de adquisición | A.2 l.2039 | | Contraria | init.sql:459 `WHERE created_at < cutoff_date` (fecha de publicación; la de adquisición es `collected_at`, init.sql:24) | sin escenario | declarar |  |
| A-58 | Regla 2: las confirmadas vencidas pierden la autoría (usuario, ID, banda, verificación) y el contenido original | A.2 l.2034; §7.8.4 l.1150; Tabla 8 l.1168, l.1170 | ★ | No implementada | init.sql:449-481: no hay UPDATE que borre author_* ni raw_data | E14 | declarar |  |
| A-59 | La instantánea de la detección confirmada pierde los datos del autor | A.2 l.2034; Tabla 8 l.1168 | | No implementada | No hay instantánea ni código de purga para ella (init.sql:109-147, 449-481) | E14 | declarar |  |
| A-60 | Las confirmadas se conservan solo con la revisión de minimización registrada; sin ella se eliminan | A.2 l.2034; §7.8.4 l.1154; Tabla 8 l.1171 | ★ | Contraria | init.sql:460-464 conserva toda 'confirmed' sin marca ni control de minimización | E14 | declarar |  |
| A-61 | Las confirmadas conservadas se eliminan al doble del plazo (730 días) | A.2 l.2034; §7.8.4 l.1150 | ★ | Contraria | init.sql:460-464: las confirmadas quedan fuera del borrado sin límite (se conservan para siempre) | E14, E29 | declarar |  |
| A-62 | Regla 3: la actividad de usuarios anterior al plazo se elimina (Tabla A3: 365 días) | A.2 l.2035; §7.8.3 l.1139; Tabla 8 l.1172; Tabla A3 l.2057 | | No implementada | purge_old_data (init.sql:449-481) no toca user_activity | sin escenario | declarar |  |
| A-63 | Los registros de ejecución vencidos se eliminan, salvo los referenciados por una mención o instantánea conservada | A.2 l.2035; Tabla A1 l.1987 | | Contraria | init.sql:468-469 borra todo registro con `started_at < cutoff`; no existen las referencias (A-20) | E30 | declarar |  |
| A-64 | Las menciones suprimidas se eliminan con la misma regla de purga | A.2 l.2039 | | No implementada | No hay lápidas ni estado suprimido (ver A-65) | E15 | declarar |  |
| A-65 | Supresión a pedido del titular: una sola operación que borra análisis, detección y aviso (incluidas las confirmadas) | A.2 l.2041; §7.8.3 l.1141 | ★ | No implementada | No hay procedimiento ni endpoint; init.sql solo define purge_old_data y optimize_database | E15 | declarar |  |
| A-66 | La supresión deja una lápida (plataforma, ID externo, fechas, marca, sin autoría, URL ni contenido) que impide volver a adquirir el ítem | A.2 l.2041; Tabla A3 l.2053 | ★ | No implementada | No implementada; la deduplicación de «Check Existing IDs» bloquearía una lápida si existiera, pero nunca se crea | E15 | declarar |  |
| A-67 | La supresión se registra en la actividad (operador, referencia, cantidad) sin identificar a la persona | A.2 l.2041; Tabla A3 l.2057 | | No implementada | No hay operación de supresión | E15 | declarar |  |
| A-68 | Se conservan los tres últimos respaldos mensuales, con acceso restringido | A.2 l.2043; Tabla A3 l.2060 | | No implementada | No hay servicio ni script de respaldo (docker-compose.yml; scripts/ solo tiene n8n-entrypoint.sh) | E15 | declarar |  |
| A-69 | Toda restauración reaplica las supresiones posteriores y ejecuta la purga antes de habilitar consultas | A.2 l.2043 | | No implementada | No hay procedimiento de restauración | E15 | declarar |  |
| A-70 | Registro de supresiones fuera de la base: solo clave, fecha y referencia; se conserva como máximo 3 meses | A.2 l.2045; Tabla A3 l.2061 | | No implementada | Sin apoyo en el repositorio (procedimental) | E15 | declarar |  |
| A-71 | Análisis, detección y aviso se borran con su mención o detección | Tabla A3 l.2054-2056 | | Implementada | init.sql:78, 111, 167 ON DELETE CASCADE | E08 |  |  |
| A-72 | El historial del orquestador se conserva 35 días y se elimina por antigüedad | Tabla A3 l.2058 | | No implementada | El entorno de n8n en docker-compose.yml no define EXECUTIONS_DATA_PRUNE/MAX_AGE; rige el valor por defecto de n8n | sin escenario | declarar |  |
| A-73 | La API comprueba en cada solicitud el permiso de la operación con el rol del usuario | A.3 l.2068 | | Parcial | permissions.py:71-77 compara con los permisos copiados en el JWT (tokens.py:52), no con la base: un cambio de rol no se ve hasta que vence el token | E12 | declarar |  |
| A-74 | Un administrador puede crear roles y asignarles permisos | A.3 l.2068 | | Implementada | backend/routers/roles.py (alta ~l.40-65); backend/routers/permissions.py (`permissions:write`) | sin escenario |  |  |
| A-75 | La API rechaza desactivar, eliminar o cambiar de rol al último `admin` activo | A.3 regla 2 l.2071 | | Parcial | Se controla borrar y desactivar: users.py:167-178, 254-265. PATCH `update_user` (users.py:125-129) cambia el rol o `is_active=False` sin control | sin escenario | declarar |  |
| A-76 | Las bajas de usuarios y roles son lógicas | A.3 regla 3 l.2072 | | Parcial | Lógicas: users.py:180, roles.py:123. También hay borrado físico: users.py:234-283, roles.py:150-181 | sin escenario | corregir el texto |  |
| A-77 | Un usuario inactivo no puede autenticarse (se verifica en cada solicitud) | A.3 regla 3 l.2072; E13 | | Parcial | El ingreso rechaza inactivos (auth/routes.py:96-97), pero tokens.py:36-57 no vuelve a mirar `is_active`: un token válido sigue funcionando | E13 | declarar |  |
| A-78 | Inicio, preferencias e información del sistema exigen usuario autenticado | A.3 regla 4 l.2073 | | Contraria | backend/routers/system.py:15-17 `/api/system/info` sin dependencia (declarado «intencionalmente público» en tests/test_route_auth_contract.py:16) | sin escenario | declarar |  |
| A-79 | El control de estado del servicio es público | A.3 regla 4 l.2073 | | Implementada | backend/main.py:103-111 | sin escenario |  |  |
| A-80 | La instalación crea un primer usuario `admin` | A.3 regla 5 l.2074 | | Parcial | init.sql no siembra ningún usuario en system_users (758-824); solo hay un ingreso de arranque por variables de entorno mientras la tabla está vacía (auth/routes.py:122-142) | sin escenario | declarar |  |
| A-81 | La contraseña inicial de `admin` se guarda solo como hash | A.3 regla 5 l.2074 | | Contraria | backend/config.py:9 `ADMIN_PASSWORD` en el entorno, comparada en texto plano con hmac.compare_digest (auth/routes.py:123) | sin escenario | declarar |  |

### Capítulo 8, §8.1–8.3 (prefijo R8A-)

| ID | Regla | Sección | ★ | Estado | Evidencia (develop 9b90270) | Escenario | Decisión (A6) | Commit |
|---|---|---|---|---|---|---|---|---|
| R8A-01 | Las tres fuentes se consultan en ramas independientes dentro de la misma ejecución | §8.1 Etapa 1, l.1275 | | Implementada | Nodos «Hacker News API Search» (workflow.json:137), «Fetch Exploit-DB RSS» (:166) y «Fetch GitHub Security Issues» (:200) → «Merge HN + ExploitDB» → «Merge All Sources» (modo append) | sin escenario |  |  |
| R8A-02 | La fecha de adquisición es la hora de recepción de la respuesta | §8.1 Etapa 1, l.1275 | | Parcial | `collected_at DEFAULT NOW()` (init.sql:24): toma la hora del INSERT, no la de recepción | E16 | corregir el texto |  |
| R8A-03 | Se descartan los duplicados del lote y las claves (plataforma, id externo) ya persistidas antes del análisis | §8.1 Etapa 2, l.1276 | | Implementada | «Deduplicate» (workflow.json:294); «Prep Existing Check» / «Check Existing IDs» / «Filter Already Processed» (:307, :343); `UNIQUE (platform, external_id)` (init.sql:56) | E09 |  |  |
| R8A-04 | Mención, análisis y detección se guardan en una única transacción | §8.1 Etapa 3, l.1277; §8.2 l.1490 | | No implementada | Tres nodos Postgres separados («Insert Social Mention», «Insert Sentiment Analysis», «Insert Threat Detection», workflow.json:426/463/500), sin BEGIN/COMMIT | E08 | declarar |  |
| R8A-05 | Las estadísticas de términos monitoreados se actualizan solo si la transacción se confirma; coincidencia por subcadena, no por palabra completa | §8.1 l.1277; §8.1.1 l.1410 | | Parcial | Trigger `update_keyword_match` AFTER INSERT con `LIKE '%kw%'` (init.sql:339-360): la subcadena se cumple; no hay transacción común (R8A-04) | E08, E09 | declarar |  |
| R8A-06 | Un único mensaje consolidado por Slack y correo si hay detecciones high o critical; un aviso por detección | §8.1 Etapa 4, l.1278 | | Implementada | «IF Critical or High»; «Aggregate Alerts» (1 correo + 1 Slack, workflow.json:575); «Prep Alert Insert» (:642); `idx_alerts_detection_id` UNIQUE (init.sql:188) | E10 |  |  |
| R8A-07 | Se registra el resultado por canal: aceptado, fallido o desconocido | §8.1 Etapa 4, l.1278 | | No implementada | `alerts.delivery_status` único con los valores pending/sent/delivered/failed (init.sql:179); no hay estado por canal ni «desconocido» | E10, E11 | declarar |  |
| R8A-08 | El registro de ejecución guarda tipo (programada/manual), estado por fuente, estado general, cantidades, inicio y fin | §8.1 Etapa 5, l.1279 | | Parcial | `execution_logs` tiene status, contadores, started_at y completed_at (init.sql:247-266); no tiene tipo ni estado por fuente | E17, E18, E20 | declarar |  |
| R8A-09 | Reintentos ante errores de las fuentes y del servicio de sentimiento; se continúa ante la falla de un paso | §8.1 l.1283 | | Implementada | retryOnFail, maxTries 3 y continueOnFail en los 3 fetch y en «Sentiment Analysis»; neutral por defecto en «Classify Threat» | sin escenario |  |  |
| R8A-10 | Función aditiva de 5 factores aplicada a cada mención nueva tras el sentimiento; puntaje entero no negativo | §8.1.1 l.1346-1356 | | Implementada | «Classify Threat» `classifyThreat()` (workflow.json:395), después de «Sentiment Analysis» | E01 |  |  |
| R8A-11 | Tabla 13: 39 keywords (10 críticas, 15 altas, 14 medias) con sus pesos | §8.1.1 Tabla 13, l.1360-1406 | ★ | Implementada | «Classify Threat» `criticalKeywords`/`highKeywords`/`mediumKeywords` (workflow.json:395); las 39 keywords y todos los pesos coinciden | E01–E04 |  |  |
| R8A-12 | Coincidencia por palabra completa `\b<kw>\b` sobre el texto en minúsculas | §8.1.1 l.1412 | ★ | Implementada | `text = rawText.toLowerCase()`; `new RegExp('\\b'+kw+'\\b')` («Classify Threat») | E02, E03 |  |  |
| R8A-13 | Puntuación por presencia: una keyword repetida suma una sola vez; keywords distintas se acumulan | §8.1.1 l.1358, l.1412 | ★ | Implementada | `.test()` una vez por keyword en `forEach` («Classify Threat») | E03, E04 |  |  |
| R8A-14 | Tipificación: crítica → incidente crítico; si no, alta → amenaza de seguridad; si no, general, salvo TLD sospechoso → posible phishing | §8.1.1 l.1412, l.1459 | ★ | Implementada | `critical_security_incident` / `security_threat` / `potential_phishing` / `general` («Classify Threat») | E01, E02 |  |  |
| R8A-15 | Factor 2: +15 si la etiqueta es `negative`, binario | §8.1.1 l.1416 | ★ | Implementada | `if (sentiment.sentiment_label === 'negative') score += 15` («Classify Threat») | E01 |  |  |
| R8A-16 | Tabla 14: e = reacciones + compartidas + 2×respuestas; >1000 +20, >100 +10, >10 +5, excluyentes | §8.1.1 Tabla 14, l.1418-1431 | ★ | Implementada | `totalEngagement` y cadena if/else if («Classify Threat»); valores idénticos | E04, E06 |  |  |
| R8A-17 | Tabla 15: verificado +10; seguidores >100k +15, >10k +10, >1k +5, excluyentes; máximo 25 | §8.1.1 Tabla 15, l.1433-1446 | ★ | Implementada | Bloque «Author credibility boost» («Classify Threat»); valores idénticos. Los insumos no cumplen la especificación (R8A-37) | E31 |  |  |
| R8A-18 | Tabla 16: +5 si hay al menos una URL; +15 una sola vez si hay un TLD sospechoso (.tk .ml .ga .cf .gq .xyz .top) | §8.1.1 Tabla 16, l.1450-1459 | ★ | Implementada | `urls.length>0` +5; `hostname.endsWith(tld)` con `some` +15 («Classify Threat»); lista idéntica | E01 |  |  |
| R8A-19 | Solo la URL propia, sin extraer URLs del cuerpo | §8.1.1 l.1461 | | Implementada | HN `urls=[item.url]`, RSS `[link]`, GH `[html_url]` (workflow.json:229/242/255) | sin escenario |  |  |
| R8A-20 | Tabla 17: low 0-19, medium 20-39, high 40-59, critical ≥60, sobre el puntaje crudo | §8.1.1 Tabla 17, l.1465-1478 | ★ | Implementada | `score>=60/40/20` («Classify Threat»); bordes correctos | E05 |  |  |
| R8A-21 | Métricas derivadas: normalizado = min(puntaje/100; 0,99) y riesgo = crudo acotado a [0,100] | §8.1.1 l.1476 | | Implementada | `confidence_score: Math.min(score/100,0.99)` («Classify Threat»); `riskScore` acotado 0-100 («Enrich Sentiment + Prep Threat», workflow.json:480); CHECK en init.sql:117-118 | sin escenario |  |  |
| R8A-22 | Instantánea inmutable de la clasificación (insumos, keywords con peso, aportes por factor, crudo, longitud del texto, ejecución) | §8.1.1 l.1480 | ★ | No implementada | `threat_detections` (init.sql:109-147) no tiene columnas de instantánea; `raw_score` no se persiste («Insert Threat Detection», :494) | E06 | declarar |  |
| R8A-23 | Versión de reglas en cada detección; los cambios crean versión nueva y se conserva el registro de versiones | §8.1.1 l.1480 | ★ | No implementada | No existe `rules_version` en init.sql, workflow.json ni backend | E07 | declarar |  |
| R8A-24 | Una detección no se reclasifica en el lugar | §8.1.1 l.1480 | | Contraria | «Insert Threat Detection» `ON CONFLICT (mention_id) DO UPDATE SET threat_type, criticality_level, ...` (workflow.json:494); mitigado por «Filter Already Processed» | E07, E09 | implementar | c81c96f |
| R8A-25 | La detección referencia la ejecución que la clasificó, y la mención la que la adquirió | §8.1.1 l.1480; Fig. 2 l.1340 | | No implementada | No hay FK hacia `execution_logs` en social_mentions ni en threat_detections (init.sql:15-147) | E30 | declarar |  |
| R8A-26 | Borrado de una mención: cascada a análisis, detección y aviso; SET NULL en actividad y en detección→análisis | §8.2 l.1497; Fig. 2 l.1340 | | Implementada | init.sql:78, 111, 112, 167 (CASCADE / SET NULL); 287-289 (SET NULL) | E14, E15 |  |  |
| R8A-27 | Unicidad: un análisis y una detección por mención; un aviso por detección | §8.2 l.1497 | | Implementada | init.sql:95, 146, 188 | E09 |  |  |
| R8A-28 | Valores de dominio cerrado restringidos en la base y puntajes acotados | §8.2 l.1497 | | Parcial | CHECK en platform, label, criticality, review_status, status y puntajes (init.sql:17, 89, 116-118, 131, 254); faltan el tipo de ejecución y el estado por canal | sin escenario | declarar |  |
| R8A-29 | La categoría de la detección se deriva de su tipo | §8.2 l.1499 | | Implementada | `getThreatCategory()` («Classify Threat») | sin escenario |  |  |
| R8A-30 | Cinco plataformas reservadas; un valor no reconocido se normaliza a «other» | §8.2 l.1501 | | Implementada | CHECK platform (init.sql:17); `validPlatforms` y fallback a 'other' («Prep Mention Insert», workflow.json:408) | sin escenario |  |  |
| R8A-31 | Rol de servicio: propietario de las tablas, único que usan el orquestador y la API, no sujeto a RLS | §8.2.1 l.1507; l.1516 | | Implementada | `DATABASE_URL` y n8n con `${POSTGRES_USER}` (docker-compose.yml:87, 128, 180) | sin escenario |  |  |
| R8A-32 | El rol de servicio no es superusuario y pierde CREATEROLE/ADMIN OPTION al terminar la instalación | §8.2.1 l.1520 | | Contraria (sin ejecutar) | `POSTGRES_USER` de la imagen oficial es superusuario (docker-compose.yml:14); no hay ALTER ROLE ... NOSUPERUSER/NOCREATEROLE. Se infiere del comportamiento estándar de la imagen; no se ejecutó | sin escenario | declarar |  |
| R8A-33 | Rol de administración: accede a todo, pero no puede escribir menciones | §8.2.1 l.1508 | | Implementada | GRANT ALL (init.sql:577); RLS activo en social_mentions con política solo FOR SELECT (init.sql:609, 615-617) | sin escenario |  |  |
| R8A-34 | Análisis y consulta no leen hashes de contraseña ni datos de red/sesión de la actividad | §8.2.1 l.1509-1510 | | Contraria | `GRANT SELECT ON ALL TABLES` (init.sql:581, 586) y `GRANT SELECT ON system_users` (init.sql:686-687) exponen `password_hash` (init.sql:667) e `ip_address`/`session_id` | E12 | declarar |  |
| R8A-35 | Análisis registra revisiones y reconocimientos y agrega actividad; consulta es solo lectura; roles de grupo sin login | §8.2.1 l.1509-1512 | | Implementada | init.sql:573-584 (CREATE ROLE sin LOGIN = NOLOGIN); 586. El rol de análisis también recibe INSERT en detecciones y avisos | E12 |  |  |
| R8A-36 | Política por fila en detecciones para cada rol (análisis: sin revisor o propias; consulta: todas; administración: completo); menciones de lectura abierta | §8.2.1 l.1514 | ★ | Implementada | `user_isolation_policy` (init.sql:619-621), `threat_detections_read_policy` (624-626), `threat_detections_admin_policy` (629-632), agregadas en 1040a87; `social_mentions_read_policy` (615-617) | sin escenario |  |  |
| R8A-37 | Seguidores y verificación no disponibles en las 3 fuentes: banda vacía y Factor 4 = 0 | Tabla 19 l.1572, nota l.1577; §8.3.1 l.1532; §8.1.1 l.1446 | ★ | Contraria | «Parse Items» `author_followers_count: item.points \|\| 0` (workflow.json:229), sin cambios tras 876caca: una historia con >1000 puntos suma +5..+15. GH usa `issue.user?.followers`; se guarda 0/false en lugar de vacío | E31 | implementar | d69a210 |
| R8A-38 | La mención guarda la banda de seguidores, no la cantidad | §8.1.1 l.1446 | | Contraria | `author_followers_count INTEGER` (init.sql:29); «Prep Mention Insert» inserta el entero | E31 | corregir el texto |  |
| R8A-39 | Tabla 18 HN: búsqueda Algolia «security», orden por fecha de creación, 50 ítems, sin filtro temporal | §8.3.1 l.1528; Tabla 18 l.1558 | ★ | Implementada | `search_by_date?tags=story&hitsPerPage=50&query=security` (workflow.json:137); nodo reactivado en 876caca | E18 |  |  |
| R8A-40 | HN: texto = título + salto de línea + texto propio | §8.3.1 l.1532; Tabla 19 | | Contraria | `text = item.story_text \|\| item.title` («Parse Items», workflow.json:229): descarta el título cuando hay texto propio | sin escenario | declarar |  |
| R8A-41 | HN: votos → reacciones; comentarios → respuestas; id = historia; autor; fecha de creación; URL enlazada | §8.3.1 l.1528-1532; Tabla 19 | | Implementada | `likes_count: points`, `replies_count: num_comments`, `objectID`, `author`, `created_at_i`, `item.url` («Parse Items») | E31 |  |  |
| R8A-42 | Contenido original compacto por fuente (HN: id, título, texto, URL, autor, votos, comentarios, fecha), no la respuesta completa | §8.3.1 l.1532; §8.3.2 l.1538; Tabla 19 l.1575 | ★ | Parcial | HN `raw_data: item`, el hit completo con `_highlightResult` (workflow.json:229); RSS compacto (:242); GH `compactIssue` (:255); tope de 8000 en `sqlJsonb` («Prep Mention Insert») | E31 | declarar |  |
| R8A-43 | Tabla 18 Exploit-DB: feed RSS completo, sin parámetros | §8.3.2 l.1536; Tabla 18 | | Implementada | `https://www.exploit-db.com/rss.xml` (workflow.json:166) | sin escenario |  |  |
| R8A-44 | Exploit-DB: id = guid (URL); texto = descripción o título; URL = link; fecha = pubDate; sin autor ni interacción | §8.3.2 l.1538; Tabla 19 | | Parcial | «Parse RSS Items» (workflow.json:242) cumple id, texto, URL, fecha e interacción 0, pero fija `author_username: 'exploit-db'` en lugar de dejarlo vacío | sin escenario | declarar |  |
| R8A-45 | Tabla 18 GitHub: issues sin PR, seis términos, 5 OR, orden por updated desc, 50 por consulta | §8.3.3 l.1542; Tabla 18 l.1560 | ★ | Implementada | `q=vulnerability+OR+CVE+OR+exploit+OR+malware+OR+"security advisory"+OR+"data breach"+type:issue&per_page=50&sort=updated&order=desc` (workflow.json:200) | sin escenario |  |  |
| R8A-46 | GitHub: el estado por fuente registra la indicación de resultados incompletos | §8.3.3 l.1542 | | No implementada | No se lee `incomplete_results` en workflow.json; no hay columna en execution_logs | E20 | declarar |  |
| R8A-47 | GitHub: título + cuerpo ≤4000; autor = login; +1 → reacciones; comentarios → respuestas; URL html; sin etiquetas | §8.3.3 l.1546; Tabla 19 | | Implementada | «Parse GitHub Issues» (workflow.json:255) `truncateText(...,4000)`, `reactions['+1']`, `comments`, `html_url`; `compactIssue` sin `labels` | sin escenario |  |  |
| R8A-48 | Ventana fija de 50 sin cursor ni paginación | §8.3.1 l.1530; §8.3.5 l.1601 | | Implementada | URLs de workflow.json:137 y :200 sin page/cursor | E18 |  |  |
| R8A-49 | Frecuencia de 15 min, una consulta GitHub por ejecución (dentro de 10 req/min) | §8.3.5 Tabla 20, l.1597 | | Implementada | «Schedule Every 15 Minutes» minutesInterval 15; un único nodo GitHub | sin escenario |  |  |

### Capítulo 8, §8.4–8.5 (prefijo R8B-)

| ID | Regla | Sección | ★ | Estado | Evidencia (develop 9b90270) | Escenario | Decisión (A6) | Commit |
|---|---|---|---|---|---|---|---|---|
| R8B-01 | Un orquestador autoalojado coordina la ejecución periódica del pipeline | §8.4 l.1605 | | Implementada | docker-compose.yml:47-48 (n8n); workflow.json | sin escenario |  |  |
| R8B-02 | En cada mención, el análisis va antes del scoring y ambos antes de la persistencia | §8.4 l.1607 | | Implementada | Conexiones: «Has New Items?» → «Sentiment Analysis» → «Classify Threat» → «Prep Mention Insert» | sin escenario |  |  |
| R8B-03 | Adquisición en 3 ramas independientes, sin estado compartido, ejecutadas en secuencia | §8.4 l.1607 | | Implementada | «Schedule Every 15 Minutes»/«Manual OSINT Trigger» → 3 nodos HTTP → Parse* → «Merge HN + ExploitDB»/«Merge All Sources» | sin escenario |  |  |
| R8B-04 | Persistencia atómica por mención: mención, análisis, detección con instantánea y estadísticas en una única transacción | §8.4 l.1609; Tabla 21 l.1633 | ★ | No implementada | Tres nodos independientes con continueOnFail: «Insert Social Mention», «Insert Sentiment Analysis», «Insert Threat Detection»; estadísticas por trigger (init.sql:339-357) | E08 | declarar |  |
| R8B-05 | Si falla una escritura no queda nada confirmado, no hay candidata a aviso, no cuenta en estadísticas y la ejecución es éxito parcial | §8.4 l.1609 | | No implementada | continueOnFail en los Insert*; «Prep Log Execution»: `status = mentionsProcessed === 0 ? 'error' : 'success'` | E08 | declarar |  |
| R8B-06 | La clave única de deduplicación impide que una segunda transacción cree otra mención, detección o aviso | §8.4 l.1609 | | Parcial | init.sql:56 UNIQUE(platform, external_id), :146, :188; pero «Prep Mention Insert» e «Insert Threat Detection» hacen `ON CONFLICT … DO UPDATE`: la segunda ejecución sobrescribe | E09 | implementar | c81c96f |
| R8B-07 | Disparador programado cada 15 min | §8.4.1 l.1615 | | Implementada | «Schedule Every 15 Minutes» (minutesInterval 15) | sin escenario |  |  |
| R8B-08 | Zona horaria de Buenos Aires para el disparador y el día calendario | §8.4.1 l.1615 | | Implementada | docker-compose.yml:82 GENERIC_TIMEZONE=America/Argentina/Buenos_Aires | sin escenario |  |  |
| R8B-09 | El disparador manual HTTP solo se acepta si lo envía la API con un secreto compartido | §8.4.1 l.1616 | | Contraria | «Manual OSINT Trigger» es un webhook POST sin autenticación; backend/routers/n8n.py:45-49 no envía WEBHOOK_SECRET | sin escenario | declarar |  |
| R8B-10 | Cada disparador guarda el tipo de ejecución (programada o manual) en su registro | §8.4.1 l.1618 | | No implementada | execution_logs sin columna de tipo (init.sql:247-262); «Log Execution» | sin escenario | declarar |  |
| R8B-11 | Consulta de fuente: hasta 3 intentos con 5 s; después la rama sigue vacía | Tabla 21 l.1627; §8.4.3 l.1643 | | Implementada | Nodos HTTP de las tres fuentes: retryOnFail, maxTries 3, waitBetweenTries 5000, continueOnFail | sin escenario |  |  |
| R8B-12 | Se registra la hora de recepción de la respuesta de la fuente | Tabla 21 l.1627 | | Parcial | init.sql:24 `collected_at DEFAULT NOW()`: hora del INSERT, no de la recepción | E16 | corregir el texto |  |
| R8B-13 | El resultado de cada fuente (respuesta válida o no) queda en el estado por fuente del registro | Tabla 21 l.1627; §8.4.3 l.1643 | | No implementada | init.sql:247-262 y «Prep Log Execution»: no hay estado por fuente | E17 | declarar |  |
| R8B-14 | La normalización lleva la respuesta al registro común; si está malformada devuelve lista vacía | Tabla 21 l.1628; §8.4.3 l.1644 | | Implementada | «Parse Items»/«Parse RSS Items»/«Parse GitHub Issues»: try/catch con `return []` | sin escenario |  |  |
| R8B-15 | La normalización calcula el estado de la fuente (incluido «incompleta») | Tabla 21 l.1628 | | No implementada | «Parse GitHub Issues» no lee incomplete_results | E20 | declarar |  |
| R8B-16 | Se unen las 3 ramas y se conserva la primera aparición de cada clave (plataforma, id externo) | Tabla 21 l.1629 | | Implementada | «Merge All Sources»; «Deduplicate» (Set seen) | sin escenario |  |  |
| R8B-17 | El ítem sin identificador externo se descarta | Tabla 21 l.1629 | | Contraria | «Deduplicate»: `if (!key \|\| !seen.has(key)) … unique.push(item)` conserva los ítems sin clave | sin escenario | declarar |  |
| R8B-18 | Deduplicación entre ejecuciones contra las claves persistidas; sin menciones nuevas pasa a la Etapa 5 | Tabla 21 l.1630 | | Implementada | «Prep Existing Check» → «Check Existing IDs» → «Filter Already Processed» → «Has New Items?» (rama falsa → «Prep Log No Items») | E09 |  |  |
| R8B-19 | Sentimiento: hasta 3 intentos con 2 s de espera | Tabla 21 l.1631; §8.4.3 l.1643 | | Implementada | «Sentiment Analysis»: maxTries 3, waitBetweenTries 2000, continueOnFail | sin escenario |  |  |
| R8B-20 | Si falla el sentimiento: `neutral` registrado con método «por defecto» | Tabla 21 l.1631; §8.4.3 l.1644 | | Parcial | «Classify Threat» usa neutral si sentimentFailed, pero «Insert Sentiment Analysis» fija `analysis_method = 'ensemble'` | sin escenario | declarar |  |
| R8B-21 | Clasificación heurística con el scoring de §8.1.1 | Tabla 21 l.1632 | | Implementada | «Classify Threat» (detalle en R8A-10 a R8A-20) | E01 |  |  |
| R8B-22 | Solo las detecciones high/critical generan un mensaje consolidado por Slack y por correo | Tabla 21 l.1634 | | Implementada | «IF Critical or High» → «Aggregate Alerts» → «Build Alert Content» → «Send Slack Alert» + «Send Gmail Alert» | sin escenario |  |  |
| R8B-23 | Se registra un aviso por detección | Tabla 21 l.1634 | | Implementada | «Prep Alert Insert»/«Log Alert in DB» (`ON CONFLICT (detection_id) DO NOTHING`); init.sql:188 | E09 |  |  |
| R8B-24 | Estados del aviso por canal | Tabla 21 l.1634; §8.4.3 l.1646 | ★ | Parcial | init.sql:179 `delivery_status ∈ {pending, sent, delivered, failed}`: un solo campo, no uno por canal | E10, E11 | declarar |  |
| R8B-25 | Cada canal registra su intento y su resultado: aceptado, fallido o desconocido | §8.4.3 l.1646 | | No implementada | «Prep Alert Insert» corre en una rama paralela al envío y no lee la salida de Slack ni de correo | E10 | declarar |  |
| R8B-26 | Ningún resultado desconocido se registra como éxito ni como fallo cierto | §8.4.3 l.1646 | | Contraria | «Prep Alert Insert» escribe `delivery_status = 'sent'` y `sent_at = NOW()` fijos, antes de conocer el resultado | E11 | declarar |  |
| R8B-27 | El mensaje consolidado tiene un identificador común a sus canales | §8.4.3 l.1646; Tabla 24 l.1735 | | No implementada | Solo alert_uuid por aviso (init.sql:168); «Aggregate Alerts» no genera id de mensaje | E10 | declarar |  |
| R8B-28 | El envío no interrumpe la ejecución | Tabla 21 l.1634 | | Implementada | «Send Slack Alert»/«Send Gmail Alert» con continueOnFail | sin escenario |  |  |
| R8B-29 | Un solo intento por canal y ejecución | §8.4.3 l.1646 | | Implementada | «Send Slack Alert»/«Send Gmail Alert» sin retryOnFail | E11 |  |  |
| R8B-30 | Un reenvío manual registra un intento nuevo con su id y advierte posible duplicado | §8.4.3 l.1646 | | No implementada | No hay endpoint de reenvío (backend/routers/alerts.py solo lista, detalla y reconoce) | E11 | declarar |  |
| R8B-31 | El registro de ejecución guarda estado por fuente, estado general, cantidades, inicio y fin | Tabla 21 l.1635 | | Parcial | «Log Execution»: status, conteos, started_at, completed_at; sin estado por fuente (init.sql:247-262) | sin escenario | declarar |  |
| R8B-32 | Si fallan 1 o 2 fuentes es éxito parcial; si fallan las 3, error | §8.4.3 l.1643 | | No implementada | init.sql:254 admite partial_success, pero «Prep Log Execution» solo produce success/error y «Prep Log No Items» siempre 'success' | E17 | declarar |  |
| R8B-33 | Agotados los intentos, el paso sigue con salida de error y la ejecución no se interrumpe | §8.4.3 l.1643 | | Implementada | continueOnFail en nodos HTTP y Postgres | sin escenario |  |  |
| R8B-34 | El error de datos queda en el historial del orquestador | §8.4.3 l.1644 | | Implementada | «Parse Items»: `console.error('Parse Items ERROR…')` | sin escenario |  |  |
| R8B-35 | Error de persistencia: se revierte la mención, se continúa con las demás y la ejecución queda como éxito parcial | §8.4.3 l.1645 | | No implementada | Igual que R8B-04/05: sin transacción; el estado nunca es partial_success | E08 | declarar |  |
| R8B-36 | Servicios en contenedores en un único servidor (base, base del orquestador, orquestador, sentimiento, API, interfaz) | §8.5.1 l.1655 | | Implementada | docker-compose.yml:2, :29, :47, :140, :176, :208 | sin escenario |  |  |
| R8B-37 | Un proxy inverso es el único punto de entrada y sirve interfaz y API en el mismo origen | §8.5.1 l.1655 | | Implementada | docker-compose.yml:158-167 (traefik :80), :189 (PathPrefix /api), :213 | sin escenario |  |  |
| R8B-38 | Los demás servicios quedan solo en la red interna; el editor del orquestador, solo en la interfaz local | §8.5.1 l.1655 | | Contraria | docker-compose.yml:64-65 `"5678:5678"` publica en todas las interfaces | sin escenario | implementar | `e990d80` |
| R8B-39 | La ejecución manual la reenvía la API con un secreto que solo ella conoce; ningún otro componente dispara el flujo | §8.5.1 l.1657 | | Contraria | backend/routers/n8n.py:45-49 no agrega el secreto; WEBHOOK_SECRET llega a n8n (docker-compose.yml:77) pero no se usa; el puerto 5678 está expuesto | sin escenario | declarar |  |
| R8B-40 | La API limita la tasa de solicitudes | §8.5.2 l.1661 | | Parcial | backend/rate_limit.py:4; solo hay `@limiter.limit` en el ingreso (backend/auth/routes.py:71) | sin escenario | declarar |  |
| R8B-41 | Encabezados de seguridad: origen restringido a la interfaz y bloqueo de marcos | §8.5.2 l.1661 | | Implementada | backend/main.py:57 (X-Frame-Options DENY), :71 (allow_origins); backend/config.py:12 | sin escenario |  |  |
| R8B-42 | Autenticación: bcrypt; JWT HS256 de 60 min; 5 intentos por minuto | §8.5.2 l.1663-1666 | ★ | Parcial | JWT HS256/60 sí (backend/auth/tokens.py:18-19). El hash nuevo es PBKDF2, no bcrypt (backend/auth/passwords.py:8,12). Límite 5/min presente (routes.py:71), con la reserva de R8B-47 | E13 | corregir el texto |  |
| R8B-43 | Contraseñas solo como hash bcrypt de costo 12 | §8.5.2 l.1663 | | Contraria | backend/auth/passwords.py:8,12 (pbkdf2_sha256, 600.000 iteraciones); bcrypt solo para verificar hashes viejos (:25-27); backend/routers/users.py:42,95,124 | sin escenario | corregir el texto |  |
| R8B-44 | La contraseña en texto plano no se registra ni se devuelve | §8.5.2 l.1663 | | Implementada | backend/schemas/user.py:43 (la respuesta excluye password_hash) | sin escenario |  |  |
| R8B-45 | JWT HS256 firmado con clave del entorno; lleva usuario y rol; vence a los 60 min; sin renovación | §8.5.2 l.1664 | | Implementada | backend/auth/tokens.py:17-19; backend/auth/routes.py:144,150; backend/config.py:7; no hay endpoint de renovación | sin escenario |  |  |
| R8B-46 | El cierre de sesión se registra en la actividad de usuarios | §8.5.2 l.1665 | | Implementada | backend/auth/routes.py:168-191 (solo si el token es válido) | sin escenario |  |  |
| R8B-47 | Máximo 5 intentos de ingreso por minuto por IP | §8.5.2 l.1666 | | Parcial | backend/auth/routes.py:71 y backend/rate_limit.py:4 (get_remote_address). Detrás de Traefik, uvicorn corre sin --proxy-headers (backend/Dockerfile:15): la clave es la IP del proxy | sin escenario | declarar |  |
| R8B-48 | Cada intento de ingreso, exitoso o no, se registra en la actividad | §8.5.2 l.1666 | | Implementada | backend/auth/routes.py:103-111, :124-133, :156-164 | sin escenario |  |  |
| R8B-49 | En cada solicitud se valida el token | §8.5.2 l.1667 | | Implementada | backend/auth/tokens.py:36-43 | E13 |  |  |
| R8B-50 | En cada solicitud se verifica que el usuario siga activo | §8.5.2 l.1667 | | No implementada | backend/auth/tokens.py:36-56 solo decodifica el JWT, no consulta system_users | E13 | declarar |  |
| R8B-51 | En cada solicitud se comprueba que el rol tenga el permiso de la operación | §8.5.2 l.1667 | | Parcial | backend/auth/permissions.py:66-72 valida los permisos copiados en el token al ingresar (si el rol cambia, quedan desactualizados hasta 60 min) | E12 | declarar |  |
| R8B-52 | La revisión guarda como revisor al usuario de la aplicación, con la hora | §8.5.2 l.1668 | | Implementada | backend/routers/threats.py:172 (reviewed_by), :181 (reviewed_at) | sin escenario |  |  |
| R8B-53 | La actividad de usuarios registra las revisiones | §8.5.2 l.1669 | | No implementada | backend/routers/threats.py:152-187 no llama a record_user_activity | sin escenario | declarar |  |
| R8B-54 | La actividad de usuarios registra cada ejecución manual | §8.5.2 l.1669 | | Parcial | backend/routers/n8n.py:77-96; no registra si n8n responde ≥400 (:84) | sin escenario | declarar |  |
| R8B-55 | T22: `admin` tiene los 18 permisos | Tabla 22 l.1677-1694 | | Implementada | init.sql:790-807; backend/auth/permissions.py:8-27 | sin escenario |  |  |
| R8B-56 | T22: `analyst` ve panel, menciones, detecciones, avisos, términos, indicadores, registros y automatización | Tabla 22 l.1677-1688 | | Implementada | init.sql:808-818 | sin escenario |  |  |
| R8B-57 | T22: `analyst` revisa detecciones, reconoce avisos y ejecuta el flujo | Tabla 22 l.1680, 1682, 1689 | | Implementada | init.sql:812, 814, 817; backend/routers/threats.py:157; alerts.py:62; n8n.py:33 | sin escenario |  |  |
| R8B-58 | T22: `analyst` edita términos y categorías | Tabla 22 l.1684 | | Contraria | init.sql:815 solo keywords:read; la escritura exige keywords:write (backend/routers/keywords.py:44,99; keyword_categories.py:40) | sin escenario | declarar |  |
| R8B-59 | T22: `analyst` no borra términos ni administra usuarios, roles o permisos | Tabla 22 l.1685, 1690-1694 | | Implementada | init.sql:808-818 (no tiene esos permisos) | sin escenario |  |  |
| R8B-60 | T22: `viewer` tiene todos los permisos de lectura | Tabla 22 l.1677-1688 | | No implementada | init.sql:758-761 solo crea admin y analyst; el rol viewer no existe | sin escenario | declarar |  |
| R8B-61 | T22: `viewer` no revisa detecciones, no reconoce avisos, no edita términos ni ejecuta el flujo | Tabla 22 l.1680-1689 | | No implementada | El rol no existe (init.sql:758-761); la regla se cumple solo porque no hay usuarios viewer | E12 | declarar |  |
| R8B-62 | T22: «Ver automatización» habilita el estado del flujo y las últimas ejecuciones | Tabla 22 l.1688 | | Parcial | workflows:read solo se aplica en la interfaz (frontend/src/app/router/AppRouter.tsx:47); la API usa logs:read (AutomationPage.tsx:48; backend/routers/logs.py:23) | sin escenario | corregir el texto |  |
| R8B-63 | T22: alta, edición y reactivación de usuarios; baja lógica; roles y matriz de permisos | Tabla 22 l.1690-1694 | | Implementada | backend/routers/users.py:36,115,205,155,180; roles.py:41,51; permissions.py:38,63. Extra no especificado: borrado definitivo en users.py:234 | sin escenario |  |  |
| R8B-64 | Inicio, preferencias e información del sistema exigen usuario autenticado; el control de estado es público | Tabla 22 nota l.1696 | | Parcial | Estado público (backend/main.py:104); /info sin autenticación (backend/routers/system.py:15-17) | sin escenario | declarar |  |
| R8B-65 | Cada vista exige su permiso y la API aplica el mismo permiso a los datos | §8.5.3 l.1700 | | Implementada | frontend/src/app/router/AppRouter.tsx:43-51 (ProtectedRoute) + require_permission en los routers | E12 |  |  |
| R8B-66 | Las listas van de la más reciente a la más antigua y se paginan | §8.5.3 l.1700 | | Parcial | threats.py:93 (detected_at desc), alerts.py:39, logs.py:33 con offset/limit; las menciones se ordenan por created_at (publicación), backend/routers/metrics.py:92 | sin escenario | declarar |  |
| R8B-67 | T23 Ingreso (pública, autenticación) | Tabla 23 l.1708 | | Implementada | AppRouter.tsx:29; frontend/src/features/auth/LoginView.tsx; backend/auth/routes.py:70 | sin escenario |  |  |
| R8B-68 | T23 Inicio (autenticado, bienvenida y accesos) | Tabla 23 l.1709 | | Implementada | AppRouter.tsx:42; frontend/src/features/home/HomePage.tsx | sin escenario |  |  |
| R8B-69 | T23 Panel (Ver panel; los ocho indicadores de la Tabla 24) | Tabla 23 l.1710 | | Parcial | AppRouter.tsx:43; backend/routers/dashboard.py:20-37 entrega 2 de los 8 indicadores tal cual y uno a medias | sin escenario | declarar |  |
| R8B-70 | T23 Menciones: lista por fecha de adquisición, con filtros por plataforma y por etiqueta de sentimiento | Tabla 23 l.1711 | | Parcial | backend/routers/metrics.py:75 (solo filtro de plataforma), :92 (orden por created_at); MentionsToolbar.tsx:27-36 | sin escenario | declarar |  |
| R8B-71 | T23 Detecciones: cola con filtros por nivel y estado de revisión; registro de la revisión | Tabla 23 l.1712 | | Implementada | backend/routers/threats.py:73-74, :152-187; AppRouter.tsx:45 | E12 |  |  |
| R8B-72 | T23 Avisos: filtros por nivel y por estado de reconocimiento; reconocimiento | Tabla 23 l.1713 | | Parcial | backend/routers/alerts.py:25-26 filtra por delivery_status y acknowledged, no por nivel; :57-99 reconocer | sin escenario | declarar |  |
| R8B-73 | T23 Términos: gestión de términos y categorías con estadísticas de coincidencia | Tabla 23 l.1714 | | Implementada | backend/routers/keywords.py, keyword_categories.py; init.sql:339-357; AppRouter.tsx:46 | sin escenario |  |  |
| R8B-74 | T23 Automatización: estado, últimas ejecuciones y pedido de ejecución manual | Tabla 23 l.1715 | | Implementada | frontend/src/features/automation/AutomationPage.tsx:48-50; backend/routers/n8n.py:33 | sin escenario |  |  |
| R8B-75 | T23 Registros: historial con estado por fuente | Tabla 23 l.1716 | | Parcial | backend/routers/logs.py:16-33; sin estado por fuente (init.sql:247-262) | sin escenario | declarar |  |
| R8B-76 | T23 Indicadores: un gráfico por indicador analítico | Tabla 23 l.1717 | | Parcial | AppRouter.tsx:51; frontend/src/features/metrics/pages/AnalyticsPage.tsx; faltan indicadores (R8B-90 a R8B-101) | sin escenario | declarar |  |
| R8B-77 | T23 Usuarios: gestión de usuarios, roles y permisos | Tabla 23 l.1718 | | Implementada | AppRouter.tsx:50; backend/routers/users.py, roles.py, permissions.py | sin escenario |  |  |
| R8B-78 | T23 Preferencias: perfil, formato de fechas e intervalo de actualización | Tabla 23 l.1719 | | Implementada | AppRouter.tsx:52; ProfileCard.tsx, DateFormatCard.tsx, PollingCard.tsx | sin escenario |  |  |
| R8B-79 | Los indicadores del panel se calculan en el momento de la consulta | §8.5.4 l.1723 | | Implementada | backend/routers/dashboard.py:20-37 (consultas directas) | sin escenario |  |  |
| R8B-80 | Ventana elegida por el usuario: 30 días por defecto, 90 como máximo | §8.5.4 l.1723 | | Parcial | AnalyticsPage.tsx:17,22 (7/30/90); la API acepta hasta 365 (backend/routers/metrics.py:129) | sin escenario | declarar |  |
| R8B-81 | Series y ventanas de menciones por fecha de adquisición, en hora de Buenos Aires, no por publicación | §8.5.4 l.1723; nota l.1752 | | Contraria | backend/routers/metrics.py:135-139, :155-160, :219, :413 usan created_at (publicación) y calculan la ventana en UTC | E16 | declarar |  |
| R8B-82 | Panel: total de menciones (incluidas las suprimidas) | Tabla 24 l.1731 | | Parcial | No está en dashboard.py:20-37; sí en backend/routers/metrics.py:39 | sin escenario | declarar |  |
| R8B-83 | Panel: menciones de las últimas 24 h | Tabla 24 l.1732 | | No implementada | backend/routers/dashboard.py:20-37 | sin escenario | declarar |  |
| R8B-84 | Panel: detecciones high/critical pendientes de revisión | Tabla 24 l.1733 | | Parcial | dashboard.py:22-24 cuenta todas las pendientes, sin filtrar nivel | sin escenario | declarar |  |
| R8B-85 | Panel: avisos de las últimas 24 h | Tabla 24 l.1734 | | No implementada | dashboard.py:26 (total histórico) | sin escenario | declarar |  |
| R8B-86 | Panel: mensajes con canal fallido o desconocido (24 h, por identificador) | Tabla 24 l.1735 | | No implementada | No hay estado por canal ni id de mensaje (R8B-25, R8B-27) | E10, E11 | declarar |  |
| R8B-87 | Panel: avisos sin reconocer | Tabla 24 l.1736 | | Implementada | dashboard.py:27-29 | sin escenario |  |  |
| R8B-88 | Panel: términos activos | Tabla 24 l.1737 | | Implementada | dashboard.py:31-33 | sin escenario |  |  |
| R8B-89 | Panel: última ejecución (estado, inicio, fin) | Tabla 24 l.1738 | | Parcial | El panel solo da un conteo (dashboard.py:35); se muestra en Automatización (AutomationPage.tsx:50) | sin escenario | declarar |  |
| R8B-90 | Indicador: menciones por día, por fecha de adquisición y plataforma | Tabla 24 l.1739 | | Parcial | metrics.py:126-143: sin desglose por plataforma y con fecha de publicación | E16 | declarar |  |
| R8B-91 | Indicador: sentimiento por día = promedio del puntaje combinado, sin los análisis por defecto | Tabla 24 l.1740 | | No implementada | metrics.py:146-185 cuenta por etiqueta, no promedia ni excluye los análisis por defecto | sin escenario | declarar |  |
| R8B-92 | Indicador: distribución de sentimiento por etiqueta y por método | Tabla 24 l.1741 | | Parcial | metrics.py:42-50: solo por etiqueta, sin ventana; el método siempre es 'ensemble' | sin escenario | declarar |  |
| R8B-93 | Indicador: distribución por plataforma | Tabla 24 l.1742 | | Parcial | metrics.py:207-224 (ventana por created_at) | sin escenario | declarar |  |
| R8B-94 | Indicador: distribución por nivel | Tabla 24 l.1743 | | Implementada | metrics.py:187-204 (criticality_level, detected_at) | sin escenario |  |  |
| R8B-95 | Indicador: histograma del puntaje de riesgo en intervalos 0–9, …, 90–100 | Tabla 24 l.1744 | | Parcial | metrics.py:318-329 usa 0–10, 11–20, …, 91–100 | sin escenario | declarar |  |
| R8B-96 | Indicador: tipos de detección | Tabla 24 l.1745 | | Parcial | metrics.py:227-244 agrupa por threat_category, no por threat_type | sin escenario | declarar |  |
| R8B-97 | Indicador: estado de revisión | Tabla 24 l.1746 | | Implementada | metrics.py:345-362 | sin escenario |  |  |
| R8B-98 | Indicador: las 20 keywords más frecuentes según las coincidentes de cada detección | Tabla 24 l.1747 | | Parcial | init.sql:402-413 (vista materializada con ventana fija de 30 d); límite por defecto 15 (metrics.py:250) | sin escenario | declarar |  |
| R8B-99 | Indicador: salud de los avisos (por fecha, mensajes por id y resultado por canal; avisos por nivel; proporción reconocida) | Tabla 24 l.1748 | | Parcial | metrics.py:365-393: solo delivery_status y tasa de reconocimiento; sin fecha, canal ni id de mensaje | E10 | declarar |  |
| R8B-100 | Indicador: salud de las ejecuciones (ejecuciones, éxitos, éxitos parciales, errores y duración media por fecha) | Tabla 24 l.1749 | | Parcial | init.sql:417-429 (workflow_performance_stats sin partial_success); metrics.py:276-304 | sin escenario | declarar |  |
| R8B-101 | Indicador: salud de las fuentes (respuesta válida, incompletas, ítems nuevos) | Tabla 24 l.1750 | | No implementada | No hay estado por fuente en execution_logs (init.sql:247-262) | E17, E20 | declarar |  |

### Anexos B, C y D (prefijo AD-)

| ID | Regla | Sección | ★ | Estado | Evidencia (develop 9b90270) | Escenario | Decisión (A6) | Commit |
|---|---|---|---|---|---|---|---|---|
| AD-01 | Ejecución con detecciones high/critical: un único mensaje consolidado por canal | B intro, l.2079 | | Implementada | «Aggregate Alerts» (workflow.json:572) y «Build Alert Content» (:585) → «Send Slack Alert»/«Send Gmail Alert» | E10 |  |  |
| AD-02 | El aviso muestra la cantidad de señales: total y por nivel (critical, high), en Slack y en correo | B, Tabla B1, l.2087 | | Implementada | «Build Alert Content» (:585): statTotal/statCritical/statHigh y sección Slack con conteos | sin escenario |  |  |
| AD-03 | Hora de la ejecución tomada del registro de ejecución, en ambos canales | B1, l.2088 | | Parcial | «Aggregate Alerts» (:572) usa `execution_timestamp: new Date()`, no el inicio registrado | sin escenario | declarar |  |
| AD-04 | Nivel de cada detección (en Slack por color, en correo) | B1, l.2089 | | Implementada | «Build Alert Content»: emoji rojo/naranja en Slack, badgeStyle en correo | sin escenario |  |  |
| AD-05 | Tipo de cada detección en ambos canales | B1, l.2090 | | Implementada | «Build Alert Content»: threat_type en Slack y en la fila del correo | sin escenario |  |  |
| AD-06 | Vista previa del texto: hasta 100 caracteres en Slack y 120 en correo | B1, l.2091 | | Implementada | «Build Alert Content»: `truncate(a.text_content,100)` / `truncate(...,120)` | sin escenario |  |  |
| AD-07 | Plataforma en ambos canales | B1, l.2092 | | Implementada | «Build Alert Content» (platform en Slack y en correo) | sin escenario |  |  |
| AD-08 | Puntaje (normalizado ×100, un decimal) solo en correo | B1, l.2093 | | Parcial | «Build Alert Content»: `fmtConfidence` = confidence_score×100 con un decimal, rotulado «Confidence» y con «%» (se presenta como probabilidad); tope 0.99 | sin escenario | implementar | 8ced8ae |
| AD-09 | Slack lista hasta cinco detecciones y la cantidad restante; el correo las lista todas | B1, l.2094 | | Implementada | «Build Alert Content»: `alerts.slice(0,5)` + «…and N more»; alertRows con todas | sin escenario |  |  |
| AD-10 | Hablar de «señales para revisión» y «puntaje», sin sugerir amenaza confirmada ni probabilidad | B nota, l.2096 | | Contraria | «Build Alert Content»: «threats detected», «Detected Threats», «Confidence %»; «Prep Alert Insert» (:642): «Amenaza … detectada» | sin escenario | implementar | 8ced8ae |
| AD-11 | Minimización: los avisos no incluyen la autoría | B nota, l.2096 | | Contraria | «Build Alert Content»: columna Author en el correo y `_author_` en Slack; «Prep Alert Insert»: el mensaje incluye «por <author>» | sin escenario | implementar | 8ced8ae |
| AD-12 | Remitente, destinatarios y canal de Slack configurados en el despliegue | B nota, l.2096; C.1.5 | | Implementada | docker-compose.yml:74-76 (SLACK_WEBHOOK_URL, ALERT_EMAIL_FROM/TO); «Send Gmail Alert» | sin escenario |  |  |
| AD-13 | Requisitos de servidor y contenedores | C.1.1, l.2102 | | No aplica (procedimiento manual) | apoyo: docker-compose.yml (postgres, n8n, sentiment-api, traefik) | sin escenario | manual |  |
| AD-14 | Rol de servicio sin superusuario, sin CREATEDB ni BYPASSRLS, con CREATEROLE solo para la instalación; base cuyo propietario es ese rol | C.1.2, l.2103 | | No implementada | init.sql:573-575 crea solo los roles de grupo; no hay NOSUPERUSER/NOBYPASSRLS; docker-compose.yml:14 usa POSTGRES_USER (superusuario de la imagen) | sin escenario | declarar |  |
| AD-15 | Modelo de datos: entidades, 3 roles de grupo, políticas por fila, purga y supresión, categorías y términos, permisos y roles, administrador inicial con hash | C.1.3, l.2104 | | Parcial | init.sql:15,76,109,165,247 (tablas); 573-575 (roles); 618-636 (políticas); 449 (purga); 742/756 (seeds); 759/783 (roles y permisos). No hay procedimiento de supresión ni INSERT de administrador en init.sql | sin escenario | declarar |  |
| AD-16 | Cierre de la instalación: retirar CREATEROLE y la pertenencia con admin option; crear usuarios de base por persona | C.1.4, l.2105 | | No aplica (procedimiento manual) | sin script de apoyo (no hay CREATEROLE en init.sql) | sin escenario | manual |  |
| AD-17 | Archivo de entorno no versionado con credenciales, clave de tokens, secreto manual, Slack y correo | C.1.5, l.2106 | | Implementada | nexus-security-group/.gitignore:2-3; solo .env.example está versionado (git ls-files) | sin escenario |  |  |
| AD-18 | Servicio de sentimiento con el contrato D.3, con VADER y TextBlob | C.1.6, l.2107 | | Implementada | sentiment-api/sentiment_api.py:2-3,21 | sin escenario |  |  |
| AD-19 | Flujo construido con los pasos de la Tabla 21 y las reglas del Anexo D | C.1.7, l.2108 | | Parcial | workflow.json (ver D.1–D.5 abajo) | sin escenario | declarar |  |
| AD-20 | Proxy inverso como único punto de entrada | C.1.8, l.2109 | | Parcial | docker-compose.yml:166-167 (traefik :80), pero n8n publica 5678 en docker-compose.yml:64-65 | sin escenario | implementar | `e990d80` |
| AD-21 | Revisar diariamente los avisos en Slack y en el correo | C.2, l.2113 | | No aplica (procedimiento manual) | — | sin escenario | manual |  |
| AD-22 | Registrar la revisión de cada detección (estado y notas) desde la vista de detecciones | C.2, l.2114 | | Implementada (apoyo) | backend/routers/threats.py:152-185 (PATCH /{id}/review) | E12 |  |  |
| AD-23 | Decidir antes del mantenimiento las detecciones pendientes, en revisión o en investigación que alcanzan la retención; notas sin datos personales | C.2, l.2114 | | No aplica (procedimiento manual) | — | E29 | manual |  |
| AD-24 | Revisar el resultado por canal de los mensajes consolidados (fallido o desconocido); un reenvío manual es un intento nuevo | C.2, l.2115 | | No implementada | no se persiste el resultado por canal (init.sql:179; «Prep Alert Insert» fija 'sent') | E10, E11 | declarar |  |
| AD-25 | Verificar 96 ejecuciones diarias y menciones nuevas no persistidas | C.2, l.2116 | | Parcial | backend/routers/logs.py:16 lista ejecuciones; execution_logs (init.sql:247-264) no tiene «nuevas» ni «no persistidas» | sin escenario | declarar |  |
| AD-26 | Control de integridad: ninguna mención sin análisis o sin detección (salvo las suprimidas) | C.2, l.2117 | | No aplica (procedimiento manual) | no hay consulta de apoyo; la premisa de atomicidad no se cumple (AD-59) | E08 | manual |  |
| AD-27 | Respaldo mensual, conservando solo los tres últimos | C.3, l.2121 | | No implementada | no hay script de respaldo en el repo (sin pg_dump) | E15 | declarar |  |
| AD-28 | Eliminar del historial del orquestador las ejecuciones de más de 35 días | C.3, l.2121 | | No implementada | docker-compose.yml no configura EXECUTIONS_DATA_PRUNE/MAX_AGE | sin escenario | declarar |  |
| AD-29 | Auditoría periódica de pertinencia temática (Tabla 9, criterio 1) | C.3, l.2122 | | No aplica (procedimiento manual) | — | sin escenario | manual |  |
| AD-30 | Ajuste de umbrales si los FP superan el 25 %; todo ajuste crea una versión de reglas nueva; congelamiento durante la campaña | C.3, l.2123 | | No implementada | pesos y umbrales fijos en «Classify Threat» (workflow.json:395); no hay versión de reglas en init.sql | E07, E28 | declarar |  |
| AD-31 | Revisar errores y registros con estado de error o de éxito parcial | C.3, l.2124 | | Parcial | el CHECK admite partial_success (init.sql:254), pero «Prep Log Execution» (:677) nunca lo emite | sin escenario | declarar |  |
| AD-32 | Actualizar los resúmenes diarios del panel | C.3, l.2125 | | Implementada | init.sql:433 refresh_all_materialized_views(); 381 daily_mention_stats | sin escenario |  |  |
| AD-33 | Revisión de minimización de las confirmadas que alcanzan la retención; las no revisadas se eliminan | C.3, l.2126 | | No implementada | init.sql:449-480: la purga no tiene revisión de minimización | E14 | declarar |  |
| AD-34 | Purga con el rol de servicio y retención de 365 días por defecto | C.3, l.2127 | | Implementada | init.sql:449 `purge_old_data(retention_days INTEGER DEFAULT 365)` | E29 |  |  |
| AD-35 | Confirmadas: pierden autoría y contenido original al vencer y se eliminan al doble del período | C.3, l.2127 | | Contraria | init.sql:459-465 excluye de la purga y sin plazo las menciones con detección 'confirmed', sin minimizar; tampoco protege 'resolved' | E14, E29 | declarar |  |
| AD-36 | Mantenimiento del motor (espacio, estadísticas, índices) | C.3, l.2127 | | Parcial | init.sql:483 optimize_database(); VACUUM/REINDEX como nota manual (476-479, 493-494) | sin escenario | manual |  |
| AD-37 | El responsable ejecuta los derechos de titulares con el rol de servicio; el rol de administración no modifica menciones | C.4, l.2131 | | Parcial | init.sql:577 da ALL a osint_admin sobre todas las tablas (incluye social_mentions); RLS de solo lectura en menciones (ver R8A-33) | sin escenario | corregir el texto |  |
| AD-38 | Recepción, verificación de identidad y número de referencia | C.4.1, l.2133 | | No aplica (procedimiento manual) | — | sin escenario | manual |  |
| AD-39 | Acceso en 10 días corridos: menciones de su autoría (plataforma + usuario) y las que la nombran (FTS + filtro literal, revisión manual) | C.4.2, l.2134 | | Parcial | apoyo: índice FTS init.sql:67 (gin to_tsvector) e índice de autor; no hay consulta ni procedimiento de acceso | sin escenario | manual |  |
| AD-40 | Bloqueo de menciones por titular mientras se resuelve (fuera de vistas y avisos); desbloqueo con nota | C.4.3, l.2135 | ★ | No implementada | no hay columna ni filtro de bloqueo (sin «block/bloque» en init.sql, backend y workflow) | sin escenario | declarar |  |
| AD-41 | Supresión en 5 días hábiles: borra análisis, detección y aviso, deja una lápida que la deduplicación respeta y registra la operación sin identificar a la persona | C.4.4, l.2136 | ★ | No implementada | no hay procedimiento de supresión, tabla de lápidas ni registro de supresiones (init.sql) | E15 | declarar |  |
| AD-42 | Borrar mensajes de Slack y correos controlados, documentar los no borrables y agregar las claves al registro de supresiones | C.4.4, l.2136 | | No implementada | no existe registro de supresiones (la parte externa es manual) | E15 | declarar |  |
| AD-43 | El pedido de supresión prevalece sobre el plazo de las confirmadas, salvo las excepciones del art. 16, documentadas | C.4.5, l.2137 | | No aplica (procedimiento manual) | — | sin escenario | manual |  |
| AD-44 | Registro del pedido en un expediente fuera de la base | C.4.6, l.2138 | | No aplica (procedimiento manual) | — | sin escenario | manual |  |
| AD-45 | La restauración de un respaldo reaplica las supresiones antes de habilitar consultas; la lápida cae con la purga | C.4 límites, l.2140 | | No implementada | no hay lápidas ni registro que reaplicar | E15 | declarar |  |
| AD-46 | Inicio: registrar la hora de inicio y el tipo (programada o manual) | D.1.1, l.2148 | | Parcial | «Prep Log Execution» usa `$execution.startedAt`; execution_logs (init.sql:247-264) no tiene columna de tipo | sin escenario | declarar |  |
| AD-47 | Fuente que falla tras los reintentos o con respuesta malformada: rama vacía con 0 ítems | D.1.2, l.2149 | | Parcial | retryOnFail/maxTries 3/continueOnFail (workflow.json:159-162,193-196,222-225); los parsers devuelven [] (:229,242,255); no se registra el estado | E17 | declarar |  |
| AD-48 | La hora de recepción de la respuesta es la fecha de adquisición de todos sus ítems | D.1.2, l.2149 | | No implementada | collected_at DEFAULT NOW() al insertar (init.sql:24); no se captura la hora de recepción | E16 | corregir el texto |  |
| AD-49 | Cada ítem se normaliza según la Tabla 19 | D.1.2, l.2149 | | Parcial | «Parse Items»/«Parse RSS Items»/«Parse GitHub Issues»; en HN `author_followers_count: item.points` (no queda vacío, contra E31) | E31 | implementar | d69a210 |
| AD-50 | El estado de la fuente registra si respondió, la hora, los ítems, la marca más antigua (HN created, GitHub updated, Exploit-DB ninguna) e incomplete_results de GitHub | D.1.2, l.2149 | | No implementada | no hay campo ni nodo; incomplete_results se ignora en «Parse GitHub Issues» | E20 | declarar |  |
| AD-51 | Plataforma en minúsculas; un valor no admitido pasa a «otra» | D.1.3, l.2150 | | Implementada | «Deduplicate» (workflow.json:294) allowedPlatforms → 'other' | sin escenario |  |  |
| AD-52 | Los ítems sin identificador externo se descartan y el descarte queda en el historial | D.1.3, l.2150 | | Contraria | «Deduplicate»: `if (!key \|\| !seen.has(key)) unique.push(item)` conserva los que no tienen clave; los parsers y «Prep Mention Insert» sustituyen 'unknown' | sin escenario | declarar |  |
| AD-53 | Se conserva la primera aparición de cada clave plataforma–id (con trim) | D.1.3, l.2150 | | Implementada | «Deduplicate» (Set seen, `.trim()`) | E09 |  |  |
| AD-54 | La cantidad resultante es la de menciones recolectadas | D.1.3, l.2150 | | Implementada | «Prep Log Execution» (:677) `mentionsCollected = Deduplicate.length` | sin escenario |  |  |
| AD-55 | Deduplicación entre ejecuciones: buscar en la base las claves ya persistidas y descartarlas | D.1.4, l.2151 | | Implementada | «Prep Existing Check» (:307), «Check Existing IDs» (:321), «Filter Already Processed» (:343). Nota: continueOnFail en :339 deja pasar todo si la consulta falla | E09 |  |  |
| AD-56 | El estado de cada fuente registra cuántas de sus menciones son nuevas | D.1.4, l.2151 | | No implementada | solo un conteo global en consola («Filter Already Processed») | E20 | declarar |  |
| AD-57 | Las lápidas conservan la clave y también se descartan | D.1.4, l.2151 | | No implementada | no hay lápidas | E15 | declarar |  |
| AD-58 | Sin menciones nuevas se pasa al registro de la ejecución | D.1.4, l.2151 | | Implementada | «Has New Items?» → «Prep Log No Items» (:748) → «Log Execution (No Items)» (:762) | sin escenario |  |  |
| AD-59 | Mención, análisis y detección (con instantánea) más estadísticas en una única transacción; si algo falla, se revierte todo | D.1.5, l.2152 | ★ | No implementada | tres INSERT independientes, cada uno con continueOnFail: «Insert Social Mention» (:422/439), «Insert Sentiment Analysis» (:457/476), «Insert Threat Detection» (:494/513) | E08 | declarar |  |
| AD-60 | Estadísticas de términos actualizadas dentro de la transacción | D.1.5, l.2152 | | Parcial | trigger AFTER INSERT init.sql:339-360 (atómico solo con la mención; usa LIKE por subcadena, no palabra completa) | E08 | declarar |  |
| AD-61 | El análisis registra el momento de respuesta del servicio; la detección, el de la confirmación | D.1.5, l.2152 | | Parcial | analyzed_at DEFAULT NOW() (init.sql:93) es la hora de inserción, no la de respuesta; detected_at DEFAULT NOW() (init.sql:129) | sin escenario | corregir el texto |  |
| AD-62 | Ejecuciones superpuestas: la segunda transacción no crea ni modifica nada (mención, análisis, detección, contadores) | D.1.6, l.2153 | ★ | Contraria | «Insert Threat Detection» (:494): `ON CONFLICT (mention_id) DO UPDATE` sobrescribe nivel, tipo y puntaje; «Prep Mention Insert» (:408): DO UPDATE de contadores; «Insert Sentiment Analysis» (:457): DO UPDATE | E06, E09 | implementar | c81c96f |
| AD-63 | No volver a contar la mención en las estadísticas de términos | D.1.6, l.2153 | | Implementada | el trigger AFTER INSERT (init.sql:356-360) no se dispara en la rama UPDATE del ON CONFLICT | E09 |  |  |
| AD-64 | No generar un segundo aviso | D.1.6, l.2153 | | Parcial | «Prep Alert Insert»: `ON CONFLICT (detection_id) DO NOTHING` + índice único init.sql:188; pero «Aggregate Alerts» vuelve a enviar Slack y correo | E09 | declarar |  |
| AD-65 | Marcas con zona horaria, convertidas a Buenos Aires para días y series | D.1.7, l.2154 | | Parcial | TIMESTAMPTZ (init.sql:22-24); conversión a BA solo en «Build Alert Content» (fmtTimestamp) | sin escenario | declarar |  |
| AD-66 | Fecha faltante o incoherente: no se reemplaza; se marca y se excluye del cálculo, informando la cantidad | D.1.7, l.2154 | | Contraria | «Parse Items» `Date.now()`, «Parse RSS Items» `new Date()`, «Parse GitHub Issues» y «Prep Mention Insert» (sqlTimestamp) sustituyen por la hora actual | E16 | declarar |  |
| AD-67 | Scoring y tipificación §8.1.1 (Tablas 13–17): suma de cinco factores y tipo según keywords y TLD | D.2, l.2158 | ★ | Implementada | «Classify Threat» (workflow.json:395) classifyThreat() | E01, E02, E03 |  |  |
| AD-68 | Keywords críticas, altas y medias con palabra completa sobre el texto en minúsculas | D.2, l.2158 | | Implementada | «Classify Threat»: `text.toLowerCase()` + `new RegExp('\\b'+kw+'\\b')` | E02, E03 |  |  |
| AD-69 | Bandas de engagement y seguidores excluyentes; cada keyword y bonificación de URL suman una vez | D.2, l.2158 | | Implementada | «Classify Threat»: if/else if por banda; `.test()` por presencia; URL +5 y TLD +15 una vez | E04 |  |  |
| AD-70 | Categoría derivada del tipo (incidente crítico, amenaza, phishing, otra) | D.2, l.2158 | | Implementada | «Classify Threat» getThreatCategory | E01 |  |  |
| AD-71 | Nivel según los umbrales de la Tabla 17 | D.2, l.2158 | | Implementada | «Classify Threat»: ≥60 critical, ≥40 high, ≥20 medium, si no low | E05 |  |  |
| AD-72 | Devuelve tipo, categoría, nivel, keywords, puntaje normalizado y de riesgo | D.2, l.2158 | | Implementada | retorno de «Classify Threat»; persistido en «Insert Threat Detection» (:494) | E01 |  |  |
| AD-73 | Instantánea de la clasificación: versión de reglas, insumos, keywords con peso, aportes por factor y puntaje crudo | D.2, l.2158 | | No implementada | threat_detections (init.sql:109-147) no tiene versión ni instantánea; raw_score no se persiste | E06, E07 | declarar |  |
| AD-74 | Sentimiento sin respuesta: la clasificación usa `neutral` y el análisis se registra con el método por defecto | D.2, l.2158 | | Parcial | «Classify Threat»: si sentimentFailed → neutral; pero «Insert Sentiment Analysis» (:457) fija siempre `'ensemble'` | sin escenario | declarar |  |
| AD-75 | Servicio interno, alcanzable solo por la red del despliegue | D.3, l.2162 | | Implementada | docker-compose.yml:140-152 (sentiment-api sin `ports`) | sin escenario |  |  |
| AD-76 | Operaciones de análisis y de estado | D.3, l.2162 | | Implementada | sentiment_api.py:16 (/health), :21 (/analyze) | sin escenario |  |  |
| AD-77 | Con token configurado, cada solicitud debe presentarlo; se rechazan las que no lo traen o no coinciden | D.3, l.2162 | | Parcial | sentiment_api.py:28-34 solo en /analyze; /health (:16-19) no lo exige | sin escenario | corregir el texto |  |
| AD-78 | Texto vacío rechazado | D.3, l.2163 | | Implementada | sentiment_api.py:38-40 (400) | sin escenario |  |  |
| AD-79 | Texto de más de 5.000 caracteres truncado, y la respuesta lo indica | D.3, l.2163 | | Implementada | sentiment_api.py:44-47, :85 | sin escenario |  |  |
| AD-80 | Salida: VADER (neg, neu, pos, compound), TextBlob (polaridad, subjetividad), combinado, etiqueta, acuerdo | D.3, l.2164 | | Implementada | sentiment_api.py:76-82 | sin escenario |  |  |
| AD-81 | Combinado = (compound + polaridad)/2, redondeado a 4 decimales | D.3, l.2165 | | Implementada | sentiment_api.py:62, :79 | sin escenario |  |  |
| AD-82 | Etiqueta con umbrales ±0,05 aplicados sobre el valor ya redondeado | D.3, l.2165 | | Contraria | sentiment_api.py:65 compara `ensemble_score` sin redondear (difiere en casos borde) | sin escenario | declarar |  |
| AD-83 | Acuerdo = 1 − \|c − p\|/2, acotado a [0,1] y redondeado a 3 decimales | D.3, l.2165 | | Implementada | sentiment_api.py:74, :80 | sin escenario |  |  |
| AD-84 | Error interno con mensaje genérico, sin detalle | D.3, l.2166 | | Implementada | sentiment_api.py:92 | sin escenario |  |  |
| AD-85 | Menciones persistidas = las de transacciones confirmadas | D.4.1, l.2170 | | Contraria | «Prep Log Execution» (:677): `mentionsProcessed = enrichMentionItems.length` (cuenta los ítems que pasan, no los INSERT confirmados) | E08 | declarar |  |
| AD-86 | Avisos registrados = detecciones high/critical persistidas en esta ejecución | D.4.1, l.2170 | | Parcial | «Prep Log Execution»: `alertsGenerated = alertCandidates` (con alertResults=[] fijo), no los avisos persistidos | E09 | declarar |  |
| AD-87 | Mensajes consolidados: uno por ejecución con candidatas, con el resultado de cada canal | D.4.1, l.2170 | | No implementada | execution_logs (init.sql:247-264) sin ese campo | E10 | declarar |  |
| AD-88 | Estado general: error si ninguna fuente respondió o no se persistió ninguna nueva; éxito parcial si respondieron 1–2 fuentes o hubo reversiones; si no, éxito; la misma regla sin nuevas | D.4.2, l.2171 | | Contraria | «Prep Log Execution»: `mentionsProcessed===0 ? 'error' : 'success'` (sin partial); «Prep Log No Items» (:748) fija 'success' aunque fallen las tres fuentes | E08, E17 | declarar |  |
| AD-89 | El resultado de los avisos no cambia el estado general | D.4.2, l.2171 | | Implementada | «Prep Log Execution» no usa el resultado del envío | E10 |  |  |
| AD-90 | Registro: id del orquestador, tipo, estado por fuente, estado general, cantidades (recolectadas, persistidas, avisos, mensajes), inicio y fin | D.4.3, l.2172 | | Parcial | «Log Execution» (:691) guarda execution_id, status, collected, processed, detections, alerts, started_at, completed_at=NOW(); faltan tipo, estado por fuente y mensajes consolidados | sin escenario | declarar |  |
| AD-91 | Estado por fuente: respondió, hora de recepción, ítems, nuevos, marca más antigua, resultados incompletos de GitHub | D.4 «Estado por fuente», l.2174 | ★ | No implementada | execution_logs solo con totales (init.sql:247-264) | E17, E20 | declarar |  |
| AD-92 | Cada rama produce su estado aunque su fuente falle o no devuelva resultados | D.4, l.2174 | | No implementada | los parsers devuelven [] (:229,242,255) y no emiten estado | E17 | declarar |  |
| AD-93 | Saturación: 50 ítems y marca más antigua posterior al inicio de la ejecución válida anterior | D.4 «Saturación», l.2176 | | No implementada | sin marca más antigua ni estado por fuente | E18 | declarar |  |
| AD-94 | Candidatas: high/critical escritas en esta ejecución, excluidas las repetidas por superposición | D.5.1, l.2180 | | Parcial | «IF Critical or High» filtra el nivel, pero sobre el passthrough de «Enrich After Threat» (:517), no sobre lo escrito; incluye las repetidas | E09 | declarar |  |
| AD-95 | Un único mensaje consolidado con identificador propio, un intento por Slack y otro por correo | D.5.2, l.2181 | | Parcial | consolidado y sin reintento («Send Slack Alert», «Send Gmail Alert»); no hay identificador de mensaje | E10 | declarar |  |
| AD-96 | Una falla de envío no interrumpe la ejecución | D.5.2, l.2181 | | Implementada | continueOnFail workflow.json:613, :638 | E10 |  |  |
| AD-97 | Como máximo un aviso por detección | D.5.3, l.2182 | | Implementada | init.sql:188 índice único; «Prep Alert Insert» `ON CONFLICT (detection_id) DO NOTHING` | E09 |  |  |
| AD-98 | Título «Señal <nivel> para revisión» | D.5.3, l.2182 | | Contraria | «Prep Alert Insert»: `'Amenaza ' + severity + ' detectada'` | sin escenario | implementar | 8ced8ae |
| AD-99 | El aviso registra vista previa, nivel e identificador del mensaje consolidado | D.5.3, l.2182 | | Parcial | alert_severity sí (init.sql:172); el mensaje es tipo/plataforma/autor, no vista previa; no hay id de mensaje | E10 | declarar |  |
| AD-100 | Por canal, el intento: id, hora de inicio, hora de respuesta o de agotamiento, estado y error resumido sin secretos | D.5.3, l.2182 | | No implementada | alerts (init.sql:165-186): solo channels_sent, sent_at y un delivery_status único | E10, E11 | declarar |  |
| AD-101 | Los avisos de un mismo mensaje comparten el resultado por canal; los indicadores cuentan mensajes por id | D.5.3, l.2182 | | No implementada | no hay id de mensaje ni resultado por canal | E10 | declarar |  |
| AD-102 | «Aceptado» no acredita entrega ni lectura | D.5.4, l.2183 | | Parcial | el CHECK admite 'delivered' (init.sql:179), estado que el diseño declara no observable; 'sent' se escribe sin respuesta | E10 | declarar |  |
| AD-103 | El reconocimiento en la interfaz es un evento distinto, registrado por un usuario | D.5.4, l.2183 | | Implementada | backend/routers/alerts.py:57-80 (acknowledged_by/at) | sin escenario |  |  |
| AD-104 | Sin reintentos automáticos | D.5.4, l.2183 | | Implementada | «Send Slack Alert»/«Send Gmail Alert» sin retryOnFail (workflow.json:613,638) | E11 |  |  |
| AD-105 | Reenvío manual: intento nuevo con id propio y advertencia de duplicado si el anterior quedó desconocido | D.5.4, l.2183 | | No implementada | no hay endpoint de reenvío en backend/routers/alerts.py | E11 | declarar |  |
| AD-106 | Estados del intento de aviso por canal (Tabla D1) | D.5, Tabla D1, l.2185-2195 | ★ | Parcial | init.sql:179 `delivery_status IN ('pending','sent','delivered','failed')`, un solo campo y no por canal; «Prep Alert Insert» escribe 'sent' en paralelo al envío | E10, E11 | declarar |  |
| AD-107 | Estado Pendiente: la solicitud todavía no comenzó | Tabla D1, l.2191 | | Parcial | 'pending' es DEFAULT (init.sql:179), pero nunca se escribe por canal | E10 | declarar |  |
| AD-108 | Estado En curso | Tabla D1, l.2192 | | No implementada | no existe en el CHECK init.sql:179 | E11 | declarar |  |
| AD-109 | Estado Aceptado: el proveedor devolvió aceptación | Tabla D1, l.2193 | | Parcial | 'sent' se fija sin condición en «Prep Alert Insert», sin leer la respuesta | E10 | declarar |  |
| AD-110 | Estado Fallido: rechazo o error que acredita la no aceptación | Tabla D1, l.2194 | | Parcial | 'failed' existe en el CHECK (init.sql:179), pero el flujo nunca lo escribe | E10 | declarar |  |
| AD-111 | Estado Desconocido (p. ej., tiempo de espera agotado después de enviar) | Tabla D1, l.2195 | | No implementada | no existe en el CHECK init.sql:179 | E11 | declarar |  |
| AD-112 | Un intento que queda en curso al terminar se registra como desconocido; éxito/fallo, doble fallo y tiempo agotado son distinguibles | Tabla D1 nota, l.2197 | | No implementada | ver AD-106 a AD-111 | E10, E11 | declarar |  |

## Notas de cada bloque

**Capítulo 7 (§7.3–7.8) y Anexo A:**

1. A-46 (★): tras 1040a87, init.sql:619-632 tiene RLS en threat_detections para los tres roles; el «Parcial» del profesor pasa a Implementada. Pero la RLS solo está activa en social_mentions y threat_detections, y backend y n8n se conectan como POSTGRES_USER (propietario/superusuario), así que las políticas solo rigen en conexiones directas.
2. A-10/A-11: se clasifican Contraria, no «No implementada» como el profesor: el esquema guarda la cantidad y HN copia points en seguidores, lo que da puntos de Factor 4 (contra E31).
3. A-72: el valor por defecto de n8n no es 35 días; no se verificó la versión de la imagen.
4. Quedaron fuera las recomendaciones de §7.8.3 que no son reglas del sistema (sellado/hash, inscripción del art. 21, el inventario documental) y los pasos manuales del responsable.

**Capítulo 8, §8.1–8.3:**

1. Las Tablas 13 a 17 coinciden valor por valor con «Classify Threat». La desviación que afecta al puntaje está en los insumos: en HN, author_followers_count = points (R8A-37). 876caca solo reactivó el nodo HN y el modo append; no corrigió esto.
2. ★ «Política por fila para cada rol»: ahora Implementada por 1040a87 (el profesor la había marcado Parcial). Pero la exclusión de password_hash y de los datos de red es Contraria (R8A-34). La regla de HN sigue siendo Contraria.
3. No se persisten la instantánea, la versión de reglas ni raw_score; el upsert permite reclasificar en el lugar (R8A-24). E06 y E07 no son reproducibles.
4. R8A-04 (transacción) afecta a E08. En HN el texto es story_text || title (R8A-40).
5. R8A-32 se infiere del comportamiento estándar de la imagen postgres; no se ejecutó. La credencial Postgres de n8n se configura en la interfaz de n8n y no está en el repositorio.

**Capítulo 8, §8.4–8.5:**

- Tres hallazgos más allá del profesor. ★ Autenticación (R8B-42): develop genera hashes PBKDF2-SHA256, no bcrypt (passwords.py:8,12; bcrypt solo verifica hashes viejos), por eso Parcial y no Implementada. Además, el límite por IP queda detrás de Traefik sin proxy-headers.
- ★ Estados del aviso por canal: Parcial (R8B-24), pero 'sent' se fija en una rama paralela al envío, lo que es Contraria a la regla de «desconocido» (R8B-26, E11).
- El rol viewer no está sembrado y analyst no tiene keywords:write: la Tabla 22 diverge en ambos.
- E13 no se cumple: get_current_user no comprueba is_active. El webhook manual de n8n no tiene secreto y el puerto 5678 se publica en todas las interfaces (R8B-09, R8B-38, R8B-39).
- Quedó fuera la «Limitación» de l.1647: declara ausencias, no es una regla.

**Anexos B, C y D:**

- workflow.json:NNN apunta a la línea functionCode/jsCode/query de cada nodo; las de settings (continueOnFail) se citan aparte. Las líneas de init.sql, sentiment_api.py, docker-compose.yml y backend se verificaron en develop.
- Las seis ★ coinciden con la muestra del profesor. Hay dos contrarias nuevas: AD-52 (los ítems sin id no se descartan) y AD-88 (estado general binario; con todas las fuentes caídas se registra success).
- AD-10, AD-11 y AD-98: el texto de los avisos contradice B1 y D.5.3 (autoría, «amenaza/threats detected», «Confidence %»).
- AD-35: la purga conserva las confirmadas sin plazo y sin minimizar; no hay paso a 730 días.
- La mayor parte del Anexo C es manual. No hay scripts de respaldo, supresión, lápidas ni bloqueo.

