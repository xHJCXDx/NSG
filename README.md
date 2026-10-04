# Nexus Security Group (NSG) — Monitoreo OSINT Automatizado

Sistema académico de monitoreo OSINT para recolectar señales públicas, detectar menciones de riesgo, clasificar amenazas y administrarlas desde un dashboard web. Integra fuentes públicas como Hacker News, Exploit-DB y GitHub Security Issues con n8n, PostgreSQL, FastAPI, análisis de sentimiento y una interfaz React.

## Estado del proyecto

| Release | Estado | Descripción |
|---------|--------|-------------|
| **1.0** (`v1.0.0`) | Completada | Base estable: autenticación JWT, CRUD de usuarios, dashboard, API protegida y suite de tests. |
| **2.0** | En progreso avanzado | Operatividad real: trigger manual, React Query, RBAC granular, métricas, auditoría, alertas y gestión de amenazas. |

### Release 2.0 — Progreso por fases

| Fase | Funcionalidad | Estado |
|------|--------------|--------|
| 1 | Trigger manual de workflows OSINT | Completada |
| 2 | React Query como capa de estado servidor | Completada |
| 3 | RBAC con permisos granulares (`require_permission`) | Completada |
| 4 | Notificaciones ante amenazas (Slack/email configurables) | Base implementada; requiere credenciales locales |
| 5 | Actualización en tiempo real vía WebSockets | Pendiente |
| 6 | Verificación final y cierre | Pendiente |

## Puesta en marcha rápida

1. **Configurar variables de entorno**
   ```bash
   cd nexus-security-group
   cp .env.example .env
   # Editar .env y reemplazar todos los valores change-me antes de levantar servicios.
   # No usar credenciales reales en archivos versionados.
   ```

   Para una prueba local académica, alcanza con definir valores propios no reales. Ejemplo orientativo:

   ```env
   POSTGRES_USER=osint_user
   POSTGRES_PASSWORD=osint_password_local
   POSTGRES_DB=osint_db

   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=admin_local_password
   N8N_ENCRYPTION_KEY=local-encryption-key-change-before-production

   DATABASE_URL=postgresql://osint_user:osint_password_local@localhost:5432/osint_db
   JWT_SECRET_KEY=local-demo-secret-at-least-32-characters

   ADMIN_USER=admin
   ADMIN_PASSWORD=admin_local_password

   SENTIMENT_API_TOKEN=local-sentiment-token
   WEBHOOK_SECRET=local-webhook-secret
   ```

   Estos valores son solo para entorno local de demostración. Para una instalación real, usar secretos fuertes y privados.

2. **Levantar el stack**
   ```bash
   docker compose up -d --build
   ```
   Levanta PostgreSQL, n8n, Sentiment API, Dashboard API, Frontend y Traefik en la red `nexus-net`.

3. **Verificación**
   - **Frontend (Dashboard)**: [http://localhost](http://localhost)
   - **Backend (API)**: [http://localhost/api/docs](http://localhost/api/docs)
   - **n8n Workflows**: [http://localhost:5678](http://localhost:5678)
   - **Traefik**: [http://localhost:8080](http://localhost:8080)

   Primer acceso al dashboard:
   - Mientras no existan usuarios en la tabla `system_users`, el backend permite login bootstrap usando `ADMIN_USER` y `ADMIN_PASSWORD` del `.env`.
   - Después del primer ingreso, crear un administrador persistente desde la sección de usuarios o desde la API.
   - A partir de ese momento, la autenticación queda respaldada por la base de datos.

4. **Appsmith (opcional, dashboard read-only)**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.appsmith.yml --profile appsmith up -d postgres appsmith
   ```
   Dashboard visual read-only en [http://localhost:8081](http://localhost:8081). Ver [appsmith/README.md](nexus-security-group/appsmith/README.md) para setup completo.

## Componentes principales

| Servicio | Tecnología | Descripción |
|----------|------------|-------------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind | Dashboard con React Query, rutas protegidas, RBAC condicional y strict TypeScript. |
| **Dashboard API** | FastAPI + Pydantic v2 | API REST con JWT auth, RBAC granular (`require_permission`) y schemas validados. |
| **Workflows** | n8n | Orquestador OSINT: Hacker News, Exploit-DB, GitHub Security Issues. Trigger manual habilitado. |
| **Sentiment API** | Flask + VADER + TextBlob | Microservicio stateless para NLP y clasificación de sentimiento. |
| **Database** | PostgreSQL 15 | Esquema normalizado con triggers, vistas materializadas, RLS y roles de seguridad. |
| **Gateway** | Traefik v2.10 | Proxy reverso con routing por labels Docker. |
| **Dashboard visual** | Appsmith CE (opcional) | Dashboard read-only con queries SQL sobre vistas de reporting. |

## Funcionalidades disponibles

- **Autenticación y autorización**: login JWT, rutas protegidas y permisos granulares por rol.
- **Gestión de usuarios y roles**: ABM de usuarios, roles dinámicos y matriz de permisos desde el dashboard.
- **Pipeline OSINT**: workflow n8n para recolectar, normalizar y persistir menciones públicas.
- **Clasificación**: análisis de sentimiento y detección de amenazas con severidad y estado de revisión.
- **Alertas**: registro de alertas y acciones de reconocimiento; al reconocer una alerta se actualiza la amenaza relacionada a estado de revisión.
- **Métricas y auditoría**: dashboards de actividad, performance del workflow, distribución de riesgo, severidad y estado de revisión.
- **Appsmith opcional**: dashboard read-only para demostración con configuración local.

## Mantenimiento y Configuración

- **Base de datos**: El esquema se inicializa automáticamente mediante `init.sql` al crear el contenedor `postgres` por primera vez. Incluye tablas, triggers, vistas materializadas, roles de seguridad y seeds de permisos RBAC.
- **Vistas materializadas**: `daily_activity_summary`, `daily_mention_stats`, `top_keywords_stats` y `workflow_performance_stats` requieren refresh periódico. Ejecutar `SELECT perform_daily_maintenance();` como administrador de la base o configurar un cron externo.
- **Workflows n8n**: Restaurá o actualizá los flujos con `workflow.json`. Para importar sin ejecutar en cada arranque: `docker compose --profile tools run --rm n8n-import`.
- **Credenciales n8n**: El `workflow.json` no versiona credenciales reales. Después de importar, creá/asigná credenciales PostgreSQL y SMTP desde la interfaz de n8n usando valores locales del `.env`.
- **Notificaciones**: Slack y email se configuran con `SLACK_WEBHOOK_URL`, `ALERT_EMAIL_FROM` y `ALERT_EMAIL_TO`. Si no se configuran, los nodos continúan sin bloquear el resto del pipeline.
- **RBAC**: El sistema usa permisos granulares `recurso:acción` validados por `require_permission(resource, action)`. Los permisos viajan en el JWT. La matriz de permisos por rol se gestiona desde `GET /api/permissions` y `PUT /api/permissions/roles/{role}`.
- **Appsmith (opcional)**: Dashboard visual read-only que lee vistas de reporting PostgreSQL con un login `appsmith_readonly`. Ver [appsmith/README.md](nexus-security-group/appsmith/README.md) para setup, queries y validación.
- **Estado de servicios**: Verificar con `docker compose ps`. Health check en `/api/health`. Los microservicios tienen healthchecks de Compose para ordenar dependencias.

## Checklist de despliegue

- [ ] Copiar `.env.example` a `.env` y reemplazar todos los valores `change-me`.
- [ ] Definir `JWT_SECRET_KEY`, `ADMIN_USER` y `ADMIN_PASSWORD` con valores fuertes.
- [ ] Levantar servicios: `docker compose up -d --build` desde `nexus-security-group/`.
- [ ] Validar que los puertos `80`, `5678` y `8080` estén libres.
- [ ] Importar `workflow.json` en n8n y crear/asignar credenciales PostgreSQL/SMTP si se van a probar notificaciones por email.
- [ ] Ejecutar una prueba del workflow y confirmar registro en `execution_logs`.
- [ ] Crear un usuario administrador persistido desde `/api/users` después del primer login bootstrap.
- [ ] Confirmar que `/api/health` responde y que las rutas protegidas rechazan requests sin JWT o sin permiso.
- [ ] (Opcional) Levantar Appsmith y configurar datasource con `appsmith_readonly`.

## Seguridad del repositorio

- Los archivos `.env`, datos de PostgreSQL, backups SQL, credenciales exportadas y documentación interna/local están ignorados por git.
- El repositorio contiene placeholders (`change-me`, `<...>`, `example.local`) para facilitar la prueba sin exponer secretos reales.
- Si se usan tokens externos, configurarlos únicamente en `.env` local o en la interfaz del servicio correspondiente.
