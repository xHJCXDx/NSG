# Corrida funcional y capturas de la Tabla 23

Fecha: 12/11/2026. Base: rama `feat/corrida-funcional`, que sale de `develop` d2446d9.

Este archivo explica cómo registrar la corrida funcional breve con `scripts/functional_run.sh` y enumera las 12 capturas de la Tabla 23 (vistas de la interfaz). La suite de pruebas, la corrida y las capturas se hacen sobre **el mismo commit**, con el sistema levantado, y los resultados se guardan en esta carpeta sin editarlos.

## 1. Antes de empezar

- [ ] El repositorio está en el commit candidato y sin cambios sin commitear: `git -c core.fileMode=false status --untracked-files=no` no muestra nada.
- [ ] Los contenedores están levantados: `docker compose up -d` desde `nexus-security-group/`. Tienen que estar en ejecución `osint-postgres`, `osint-postgres-n8n`, `osint-n8n`, `osint-sentiment-api`, `osint-dashboard-api`, `osint-frontend` y `osint-traefik`.
- [ ] La interfaz responde en `http://localhost/` y la API en `http://localhost/api/health`.

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
| T23-01 | Ingreso | `http://localhost/login` | Pública | Sesión cerrada | `T23-01_ingreso.png` | R8B-67, Implementada | [ ] | |
| T23-02 | Inicio | `http://localhost/home` | Autenticado | Sesión iniciada | `T23-02_inicio.png` | R8B-68, Implementada | [ ] | |
| T23-03 | Panel | `http://localhost/dashboard` | `dashboard:read` | Al menos una ejecución terminada | `T23-03_panel.png` | R8B-69, Parcial | [ ] | |
| T23-04 | Menciones | `http://localhost/mentions` | `mentions:read` | Menciones persistidas en la corrida | `T23-04_menciones.png` | R8B-70, Parcial | [ ] | |
| T23-05 | Detecciones | `http://localhost/threats` | `threats:read` | Al menos una detección, si la corrida la produjo | `T23-05_detecciones.png` | R8B-71, Implementada | [ ] | |
| T23-06 | Avisos | `http://localhost/alerts` | `alerts:read` | Al menos un aviso, si la corrida lo produjo | `T23-06_avisos.png` | R8B-72, Parcial | [ ] | |
| T23-07 | Términos | `http://localhost/keywords` | `keywords:read` | Los términos iniciales cargados | `T23-07_terminos.png` | R8B-73, Implementada | [ ] | |
| T23-08 | Automatización | `http://localhost/automation` | `workflows:read` | Al menos una ejecución registrada | `T23-08_automatizacion.png` | R8B-74, Implementada | [ ] | |
| T23-09 | Registros | `http://localhost/logs` | `logs:read` | Ejecuciones de la corrida registradas | `T23-09_registros.png` | R8B-75, Parcial | [ ] | |
| T23-10 | Indicadores | `http://localhost/analytics` | `metrics:read` | Datos dentro de la ventana por defecto (30 días) | `T23-10_indicadores.png` | R8B-76, Parcial | [ ] | |
| T23-11 | Usuarios | `http://localhost/users` | `users:read` | Al menos el usuario administrador | `T23-11_usuarios.png` | R8B-77, Implementada | [ ] | |
| T23-12 | Preferencias | `http://localhost/settings` | Autenticado | Sesión iniciada | `T23-12_preferencias.png` | R8B-78, Implementada | [ ] | |

## 4. Al terminar

- [ ] En esta carpeta están la salida de la suite, el log de la corrida y las 12 capturas.
- [ ] El commit del log coincide con el de la suite y con el que estaba al tomar las capturas.
- [ ] Ningún archivo se editó a mano.
