# Nexus Security Group (NSG) - Monitoreo OSINT Automatizado

Arquitectura automatizada para monitoreo OSINT, diseñada para detectar amenazas usando fuentes públicas como Hacker News, Exploit-DB y GitHub Security Issues, análisis de sentimiento, n8n y PostgreSQL.

## Estado del proyecto

| Release | Estado | Descripción |
|---------|--------|-------------|
| **1.0** (`v1.0.0`) | Completada | Base estable: JWT auth, CRUD usuarios, dashboard, API protegida, 319 tests. |
| **2.0** | En progreso | Operatividad real: trigger manual, React Query, RBAC granular, notificaciones, WebSockets. |

### Release 2.0 — Progreso por fases

| Fase | Funcionalidad | Estado |
|------|--------------|--------|
| 1 | Trigger manual de workflows OSINT | Completada |
| 2 | React Query como capa de estado servidor | Completada |
| 3 | RBAC con permisos granulares (`require_permission`) | Completada |
| 4 | Notificaciones reales ante amenazas (email/Telegram) | Pendiente |
| 5 | Actualización en tiempo real vía WebSockets | Pendiente |
| 6 | Verificación final y cierre | Pendiente |

## Quick path

1. **Configurar variables de entorno**
   ```bash
   cd nexus-security-group
   cp .env.example .env
   # Editar .env y reemplazar todos los valores change-me antes de levantar servicios
   ```

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

4. **Appsmith (opcional)**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.appsmith.yml --profile appsmith up -d postgres appsmith
   ```
   Dashboard visual read-only en [http://localhost:8081](http://localhost:8081). Ver [appsmith/README.md](nexus-security-group/appsmith/README.md) para setup completo.

## Componentes de la Arquitectura

| Servicio | Tecnología | Descripción |
|----------|------------|-------------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind | Dashboard con React Query, RBAC condicional y strict TypeScript. |
| **Dashboard API** | FastAPI + Pydantic v2 | API REST con JWT auth, RBAC granular (`require_permission`) y schemas validados. |
| **Workflows** | n8n | Orquestador OSINT: Hacker News, Exploit-DB, GitHub Security Issues. Trigger manual habilitado. |
| **Sentiment API** | Flask + VADER + TextBlob | Microservicio stateless para NLP y clasificación de sentimiento. |
| **Database** | PostgreSQL 15 | Esquema normalizado con triggers, vistas materializadas, RLS y roles de seguridad. |
| **Gateway** | Traefik v2.10 | Proxy reverso con routing por labels Docker. |
| **Dashboard visual** | Appsmith CE (opcional) | Dashboard read-only con queries SQL sobre vistas de reporting. |

## Documentación técnica

- [Base de datos](docs/01-database.md): esquema PostgreSQL, tablas principales e inicialización.
- [Workflows n8n](docs/02-workflows-n8n.md): importación, credenciales y operación de workflows OSINT.
- [NLP y sentimiento](docs/03-nlp-sentiment.md): servicio de análisis de sentimiento y contrato esperado.
- [Backend API](docs/04-backend-api.md): routers FastAPI, autenticación, modelos de respuesta y excepciones.
- [Frontend UI](docs/05-frontend-ui.md): estructura React por features, rutas y límites arquitectónicos.
- [Plan de Modificación — Release 1.0](docs/06-release-1.0.md): alcance, fases, checklist y riesgos de cierre.
- [Plan de Modificación — Release 2.0](docs/07-release-2.0.md): fases, progreso, matriz de permisos RBAC y decisiones de diseño.
- [Appsmith Dashboard](nexus-security-group/appsmith/README.md): setup, queries SQL, contratos de acciones y validación runtime.

## Mantenimiento y Configuración

- **Base de Datos**: El esquema se inicializa automáticamente mediante `init.sql` al crear el contenedor `postgres` por primera vez. Incluye tablas, triggers, vistas materializadas, roles de seguridad y seeds de permisos RBAC.
- **Vistas materializadas**: `daily_activity_summary`, `daily_mention_stats`, `top_keywords_stats` y `workflow_performance_stats` requieren refresh periódico. Ejecutar `SELECT perform_daily_maintenance();` como administrador de la base o configurar un cron externo.
- **Workflows n8n**: Restaurá o actualizá los flujos con `workflow.json`. Para importar sin ejecutar en cada arranque: `docker compose --profile tools run --rm n8n-import`.
- **Credencial PostgreSQL en n8n**: El `workflow.json` no incluye credenciales. Después de importar, creá una credencial PostgreSQL en n8n (host: `postgres`, port: `5432`, database/user/password: valores de `.env`, SSL: desactivado para Docker local) y asignála a todos los nodos PostgreSQL del workflow.
- **RBAC**: El sistema usa permisos granulares `recurso:acción` validados por `require_permission(resource, action)`. Los permisos viajan en el JWT. La matriz de permisos por rol se gestiona desde `GET /api/permissions` y `PUT /api/permissions/roles/{role}` (requiere `permissions:read`/`permissions:write`). Ver [docs/07-release-2.0.md](docs/07-release-2.0.md) para la matriz completa.
- **Appsmith (opcional)**: Dashboard visual read-only que lee vistas de reporting PostgreSQL con un login `appsmith_readonly`. Ver [appsmith/README.md](nexus-security-group/appsmith/README.md) para setup, queries y validación.
- **Estado de servicios**: Verificar con `docker compose ps`. Health check en `/api/health`. Los microservicios tienen healthchecks de Compose para ordenar dependencias.

## Checklist de despliegue

- [ ] Copiar `.env.example` a `.env` y reemplazar todos los valores `change-me`.
- [ ] Definir `JWT_SECRET_KEY`, `ADMIN_USER` y `ADMIN_PASSWORD` con valores fuertes.
- [ ] Levantar servicios: `docker compose up -d --build` desde `nexus-security-group/`.
- [ ] Validar que los puertos `80`, `5678` y `8080` estén libres.
- [ ] Importar `workflow.json` en n8n y crear/asignar credencial PostgreSQL.
- [ ] Ejecutar una prueba del workflow y confirmar registro en `execution_logs`.
- [ ] Crear un usuario administrador persistido desde `/api/users` después del primer login bootstrap.
- [ ] Confirmar que `/api/health` responde y que las rutas protegidas rechazan requests sin JWT o sin permiso.
- [ ] (Opcional) Levantar Appsmith y configurar datasource con `appsmith_readonly`.
