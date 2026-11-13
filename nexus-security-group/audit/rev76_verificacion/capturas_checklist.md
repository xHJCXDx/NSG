# Corrida funcional y capturas de la Tabla 23

Fecha: 12/11/2026. Base: rama `feat/corrida-funcional`, que sale de `develop` d2446d9.

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
| T23-01 | Ingreso | `http://localhost/login` | Pública | Sesión cerrada | `T23-01_ingreso.png` | R8B-67, Implementada | [x] | 13/11/2026. Sesión cerrada; formulario vacío (los campos muestran sus textos de ejemplo); sin datos personales. |
| T23-02 | Inicio | `http://localhost/home` | Autenticado | Sesión iniciada | `T23-02_inicio.png` | R8B-68, Implementada | [x] | 13/11/2026. Sesión de `admin` (rol Admin, origen Bootstrap, 18 permisos); accesos rápidos a todas las vistas; sin datos personales. |
| T23-03 | Panel | `http://localhost/dashboard` | `dashboard:read` | Al menos una ejecución terminada | `T23-03_panel.png` | R8B-69, Parcial | [x] | 13/11/2026, actualizado 14:02:39 (antes de E10). 369 detecciones, todas pendientes; 66 avisos sin reconocer; 10 términos activos; 9 registros de ejecución; actividad 6. Sin datos personales. |
| T23-04 | Menciones | `http://localhost/mentions` | `mentions:read` | Menciones persistidas en la corrida | `T23-04_menciones.png` | R8B-70, Parcial | [x] | 13/11/2026. Menciones de GitHub y Hacker News de la corrida. **Editada:** se taparon los nombres de usuario del campo «Author» (datos personales según §7.8.4 y Tabla A3; minimización); el resto de la imagen no cambió. El texto de las menciones se muestra completo, como lo ve el analista durante la revisión (§7.8.4). El original se conserva fuera del repositorio. |
| T23-05 | Detecciones | `http://localhost/threats` | `threats:read` | Al menos una detección, si la corrida la produjo | `T23-05_detecciones.png` | R8B-71, Implementada | [x] | 13/11/2026. Detecciones `general` de la corrida, todas `Pending`, con severidad, confianza, riesgo y mención relacionada; no muestra autoría. Sin datos personales. |
| T23-06 | Avisos | `http://localhost/alerts` | `alerts:read` | Al menos un aviso, si la corrida lo produjo | `T23-06_avisos.png` | R8B-72, Parcial | [x] | 13/11/2026. Avisos `high` creados y enviados a las 14:00:56, sin reconocer, canales slack, email y #security-alerts. Figuran `Sent` aunque se generaron antes de definir `ALERT_EMAIL_TO` (correo rebotado; ver Notas de `escenarios.md`): es la limitación declarada de `delivery_status`. Sin datos personales. |
| T23-07 | Términos | `http://localhost/keywords` | `keywords:read` | Los términos iniciales cargados | `T23-07_terminos.png` | R8B-73, Implementada | [x] | 13/11/2026. Los 10 términos iniciales activos, con categoría, prioridad, coincidencias y última coincidencia de la corrida. Sin datos personales. |
| T23-08 | Automatización | `http://localhost/automation` | `workflows:read` | Al menos una ejecución registrada | `T23-08_automatizacion.png` | R8B-74, Implementada | [x] | 13/11/2026. Última ejecución en `success` (150 menciones recolectadas, 47 procesadas, 47 detecciones, 20 avisos) e historial; la fila con 41 detecciones y 15 avisos es la de E08. La duración figura en 0 s en todas: `started_at` se graba al final del flujo (hallazgo para B7b). Sin datos personales. |
| T23-09 | Registros | `http://localhost/logs` | `logs:read` | Ejecuciones de la corrida registradas | `T23-09_registros.png` | R8B-75, Parcial | [x] | 13/11/2026. Pestaña «Executions»: ejecuciones de la corrida en `success` con contadores, horas y duración 0 s (inicio y fin iguales; ver T23-08). La de las 13:48:30 es E08 (41 detecciones y 15 avisos informados, 0 guardados). No muestra estado por fuente (limitación declarada). Sin datos personales; la pestaña «User Activity» no se capturó. |
| T23-10 | Indicadores | `http://localhost/analytics` | `metrics:read` | Datos dentro de la ventana por defecto (30 días) | `T23-10_indicadores.png` | R8B-76, Parcial | [x] | 13/11/2026. Vista desplazada hacia abajo (no se ve el título): 410 menciones, 66 avisos, 369 detecciones, sentimiento medio 0,05; menciones en el tiempo y sentimiento desde el 14/10 (fecha de publicación) y distribución por plataforma (GitHub 75 %, Hacker News 20 %, Exploit-DB 5 %). Sin datos personales. |
| T23-11 | Usuarios | `http://localhost/users` | `users:read` | Al menos el usuario administrador | `T23-11_usuarios.png` | R8B-77, Implementada | [x] | 13/11/2026. El directorio dice «No users registered yet.»: el administrador de la sesión es el de arranque (origen Bootstrap, definido por configuración) y no figura como usuario registrado. No se cumple el estado previo «al menos el usuario administrador»; se toma igual, sin cargar datos (ver §3). Roles de sistema Admin y Analyst, sin roles propios. Sin datos personales. |
| T23-12 | Preferencias | `http://localhost/settings` | Autenticado | Sesión iniciada | `T23-12_preferencias.png` | R8B-78, Implementada | [x] | 13/11/2026, 14:31. Perfil `admin`, cambio de contraseña con los campos vacíos, tema oscuro e idioma inglés. Sin datos personales. |

## 4. Al terminar

- [x] En esta carpeta están la salida de la suite, el log de la corrida y las 12 capturas. (13/11/2026: `suite_20261113-161324.log`, `corrida_funcional_20261113-131408.log` e `imagenes/T23-01` a `T23-12`; los escenarios manuales, en `manuales/`.)
- [x] El commit del log coincide con el de la suite y con el que estaba al tomar las capturas. (`b0c76dd` en los tres; los cambios posteriores están solo en `audit/`.)
- [x] Ningún archivo se editó a mano, salvo `T23-04_menciones.png`: se taparon los nombres de usuario por minimización, y la edición se declara en su fila. Los logs y los resultados de `manuales/` no se editaron.
