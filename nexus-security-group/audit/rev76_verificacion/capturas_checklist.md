# Corrida funcional y capturas de la Tabla 23

Fecha: 12/11/2026. Base: rama `feat/corrida-funcional`, que sale de `develop` d2446d9. Actualizado el 17/11/2026 para la REV77 (sección «Cambios REV77»).

Este archivo explica cómo registrar la corrida funcional breve con `scripts/functional_run.sh` y enumera las 12 capturas de la Tabla 23 (vistas de la interfaz). La suite de pruebas, la corrida y las capturas se hacen sobre **el mismo commit**, con el sistema levantado, y los resultados se guardan en esta carpeta sin editarlos.

## 1. Antes de empezar

- [x] El repositorio está en el commit candidato y sin cambios sin commitear: `git -c core.fileMode=false status --untracked-files=no` no muestra nada.
- [x] Los contenedores están levantados: `docker compose up -d` desde `nexus-security-group/`. Tienen que estar en ejecución `osint-postgres`, `osint-postgres-n8n`, `osint-n8n`, `osint-sentiment-api`, `osint-dashboard-api`, `osint-frontend` y `osint-traefik`.
- [x] La interfaz responde en `http://localhost/` y la API en `http://localhost/api/health`.

## 2. Corrida funcional

1. Anotar la hora de inicio, con su desfase horario. Por ejemplo, con `date '+%Y-%m-%d %H:%M:%S%:z'` se obtiene `2026-11-20 14:00:00-03:00`.
2. Dejar que el flujo se ejecute: esperar las ejecuciones programadas o pedir una ejecución manual desde la vista Automatización.
3. Al terminar, desde `nexus-security-group/`:

   ```sh
   sh scripts/functional_run.sh --since "2026-11-20 14:00:00-03:00" --dry-run   # muestra qué va a hacer
   sh scripts/functional_run.sh --since "2026-11-20 14:00:00-03:00"
   ```

   El script escribe `audit/rev76_verificacion/corrida_funcional_<fecha-hora>.log` y no lo sobrescribe si ya existe. Si un paso falla, lo marca con `!!` en el log, sigue con los demás y termina con código 1.
4. No editar el log.

**Qué registra el log.** El commit (`git rev-parse HEAD`) y los cambios sin commitear, si los hay; la fecha y la hora, local y UTC; la versión de Docker y, por contenedor, la imagen, su identificador, el estado y la hora de inicio; la respuesta de `/api/health`; la versión y la zona horaria de PostgreSQL; las ejecuciones de la ventana (por estado y una por una, con sus cantidades); las menciones persistidas en la ventana, por fuente (`social_mentions.platform`, según la hora de adquisición `collected_at`); y los avisos de la ventana, por estado de envío, con el total de enviados (`sent` o `delivered`).

**Qué no registra, y por qué.** El estado por fuente y la saturación de la ventana de adquisición: el prototipo no los guarda. Son limitaciones declaradas en la matriz (estado por fuente: AD-91, R8A-08, R8A-46, R8B-13, R8B-31 y R8B-75; saturación: AD-93), y el log lo dice al final.

**Garantías.** El script solo lee: consulta git, Docker y la base, y las consultas corren en una transacción de solo lectura (`default_transaction_read_only=on`). Usa las credenciales que ya tiene el contenedor de PostgreSQL, sin leer `.env`. El valor de `--since` se valida (fecha, hora y desfase obligatorio) y se pasa a la consulta como parámetro.

## 3. Capturas de la Tabla 23

Se ingresa con un usuario administrador, que tiene todos los permisos. Cada captura muestra la vista completa con los datos que dejó la corrida. Si una vista queda vacía porque la corrida no produjo ese tipo de dato (por ejemplo, ninguna detección), la captura se toma igual y se anota en la columna de observaciones; no se cargan datos de prueba para llenarla.

La columna «Matriz» remite a la fila de `matriz_conformidad.md`. Si la fila es *Parcial*, la captura muestra lo que el prototipo tiene y la diferencia está declarada en `limitaciones_declaradas.md`.

| Fila | Vista | URL | Permiso en el prototipo | Estado previo necesario | Archivo | Matriz | Hecha | Observaciones |
|---|---|---|---|---|---|---|---|---|
| T23-01 | Ingreso | `http://localhost/login` | Pública | Sesión cerrada | `T23-01_ingreso.png` | R8B-67, Implementada | [x] | 17/11/2026, 13:27 (REV77). Sesión cerrada; formulario vacío (los campos muestran sus textos de ejemplo), en español; sin datos personales. En el borde inferior asoman unos píxeles de la barra del escritorio. |
| T23-02 | Inicio | `http://localhost/home` | Autenticado | Sesión iniciada | `T23-02_inicio.png` | R8B-68, Implementada | [x] | 17/11/2026 (REV77). Sesión de `administrador` (rol Admin, origen «Base de datos», 18 permisos); accesos rápidos a todas las vistas. Sin datos personales. |
| T23-03 | Panel | `http://localhost/dashboard` | `dashboard:read` | Al menos una ejecución terminada | `T23-03_panel.png` | R8B-69, Parcial | [x] | 17/11/2026 (REV77). 3902 detecciones, 3900 pendientes; 551 avisos, 549 sin reconocer; 10 palabras clave activas; 109 registros de ejecución; actividad 38. Sin datos personales. |
| T23-04 | Menciones | `http://localhost/mentions` | `mentions:read` | Menciones persistidas en la corrida | `T23-04_menciones.png` | R8B-70, Parcial | [x] | 17/11/2026 (REV77). Menciones de la corrida. **Editada:** se taparon los nombres de usuario de la columna de autor (datos personales según §7.8.4 y Tabla A3; minimización); el resto de la imagen no cambió. El texto de las menciones se muestra completo, como lo ve el analista durante la revisión (§7.8.4). El original sin editar del 17/11 no se conservó; el de `originales/` es el de la REV76 (13/11). |
| T23-05 | Detecciones | `http://localhost/threats` | `threats:read` | Al menos una detección, si la corrida la produjo | `T23-05_detecciones.png` | R8B-71, Implementada | [x] | 17/11/2026 (REV77). Detecciones `general` («Otro»), todas «Pendiente», con severidad, puntaje normalizado, puntaje de riesgo, evidencia y mención relacionada (github); no muestra autoría. La hora relativa («10 minutes ago») no está traducida. Sin datos personales. |
| T23-06 | Avisos | `http://localhost/alerts` | `alerts:read` | Al menos un aviso, si la corrida lo produjo | `T23-06_avisos.png` | R8B-72, Parcial | [x] | 17/11/2026 (REV77). Avisos «Señal high para revisión» (ALTA); los visibles se crearon y enviaron entre las 11:30:53 y las 11:45:52, sin reconocer, canales slack, email y #security-alerts. Figuran «Enviada»: es la limitación declarada de `delivery_status`. Sin datos personales. |
| T23-07 | Términos | `http://localhost/keywords` | `keywords:read` | Los términos iniciales cargados | `T23-07_terminos.png` | R8B-73, Implementada | [x] | 17/11/2026 (REV77). Los 10 términos activos, con categoría, prioridad, coincidencias y última coincidencia (la más reciente, 11:45:46). Las categorías se muestran con su valor en la base (critical, high, medium). Sin datos personales. |
| T23-08 | Automatización | `http://localhost/automation` | `workflows:read` | Al menos una ejecución registrada | `T23-08_automatizacion.png` | R8B-74, Implementada | [x] | 17/11/2026 (REV77). Última ejecución en «Éxito» (150 menciones recolectadas, 30 procesadas, 30 detecciones, 1 aviso) e historial. La duración sigue en 0 s, como en la REV76. Sin datos personales. |
| T23-09 | Registros | `http://localhost/logs` | `logs:read` | Ejecuciones de la corrida registradas | `T23-09_registros.png` | R8B-75, Parcial | [x] | 17/11/2026 (REV77). Pestaña «Ejecuciones»: cinco ejecuciones exitosas, de las 11:01:00 a las 11:45:52, con contadores, horas y duración 0 s. No muestra estado por fuente (limitación declarada). La pestaña «Actividad de usuario» no se capturó. Sin datos personales. |
| T23-10 | Indicadores | `http://localhost/analytics` | `metrics:read` | Datos dentro de la ventana por defecto (30 días) | `T23-10_indicadores.png` | R8B-76, Parcial | [x] | 17/11/2026, 13:17 (REV77). Vista completa con el título: 4154 menciones, 596 avisos, 4113 detecciones, sentimiento promedio 0,05; menciones en el tiempo desde el 18/10, tendencias de sentimiento y distribución por plataforma (GitHub 93 %; el gráfico queda cortado abajo). Incluye las ejecuciones posteriores al log de la corrida (ver «Cambios REV77»). Sin datos personales. |
| T23-11 | Usuarios | `http://localhost/users` | `users:read` | Al menos el usuario administrador | `T23-11_usuarios.png` | R8B-77, Implementada | [x] | 17/11/2026, 13:18 (REV77). El directorio muestra a `administrador` (Admin, activo, creado el 17/11, «Usuario actual»): se cumple el estado previo. Roles de sistema Admin y Analyst (sus descripciones, en inglés, vienen de la base), sin roles propios. Sin datos personales. |
| T23-12 | Preferencias | `http://localhost/settings` | Autenticado | Sesión iniciada | `T23-12_preferencias.png` | R8B-78, Implementada | [x] | 17/11/2026, 13:17 (REV77). Perfil `administrador` (admin), cambio de contraseña con los campos vacíos, tema oscuro e idioma español. Sin datos personales. |

## 4. Al terminar

- [x] En esta carpeta están la salida de la suite, el log de la corrida y las 12 capturas. (13/11/2026: `suite_20261113-161324.log`, `corrida_funcional_20261113-131408.log` e `imagenes/T23-01` a `T23-12`; los escenarios manuales, en `manuales/`.)
- [x] El commit del log coincide con el de la suite y con el que estaba al tomar las capturas. (`b0c76dd` en los tres; los cambios posteriores están solo en `audit/`.)
- [x] Ningún archivo se editó a mano, salvo `T23-04_menciones.png`: se taparon los nombres de usuario por minimización, y la edición se declara en su fila. Los logs y los resultados de `manuales/` no se editaron.

## Cambios REV77

Fecha: 17/11/2026. Se repitieron la corrida, la suite y las 12 capturas sobre `develop` `9f24de2`, con el sistema levantado. Las versiones de la REV76 (13/11, `b0c76dd`) quedan en el historial de git (commit `0749dba`).

- **Evidencia.** `audit/rev77_verificacion/corrida_funcional_20261117-120357.log` (ventana desde las 11:30:00-03:00: 4 ejecuciones exitosas, 129 menciones de GitHub, 17 avisos enviados, ningún paso con `!!`), `suite_20261117-120454.log` y `suite_frontend_20261117-120507.log`. Los tres registran el commit `9f24de2`; los únicos cambios sin commitear eran las capturas.
- **Suite.** Escenarios 14 de 14, flujo 28 de 28, backend 370 aprobadas y 1 fallida (`test_no_raw_sql_contract`, que ya fallaba antes de la REV77), frontend 222 de 222. `correr_suite.sh` termina con código 1 por esa falla.
- **Idioma.** Las capturas de la REV77 están en español; las de la REV76, en inglés.
- **Usuario.** La sesión es la de `administrador`, un usuario de la base. En la REV76 era el administrador de arranque, que desde B18 (`3164216`) deja de valer cuando existe un usuario en la base.
- **Horarios.** T23-02 a T23-09 se tomaron entre las 11:55 y las 12:02, dentro de la ventana del log. T23-10 a T23-12 se repitieron a las 13:17–13:18 porque las primeras mostraban la notificación de la herramienta de captura con una ruta local, y T23-01 se tomó a las 13:27 para que también quedara en español; T23-10 a T23-12 incluyen las ejecuciones programadas posteriores al log, sobre el mismo commit.
- **Primera ejecución de la ventana.** La de las 11:30:54 corrió antes de que se reiniciara n8n (11:31:51) y pudo usar el flujo anterior a la reimportación. Las diferencias de esa versión están solo en el disparador manual; la de las 11:40:55 es la que se disparó con el secreto.
