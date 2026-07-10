# Nexus Security Group (NSG) - Monitoreo OSINT Automatizado

Arquitectura automatizada para monitoreo OSINT, diseñada para detectar amenazas usando fuentes públicas como Hacker News, Exploit-DB y GitHub Security Issues, análisis de sentimiento, n8n y PostgreSQL. 

## Quick path

1. **Configurar variables de entorno**
   Copia el archivo y ajusta las credenciales en la carpeta del código.
   ```bash
   cd nexus-security-group
   cp .env.example .env
   # Editar .env y reemplazar todos los valores change-me antes de levantar servicios
   ```

2. **Levantar los servicios**
   ```bash
   docker-compose up -d
   ```

3. **Verificación**
   - **Frontend (Dashboard)**: [http://localhost](http://localhost)
   - **Backend (API)**: [http://localhost/api/docs](http://localhost/api/docs)
   - **n8n Workflows**: [http://localhost:5678](http://localhost:5678)
   - **Traefik**: [http://localhost:8080](http://localhost:8080)

## Componentes de la Arquitectura

| Servicio | Tecnología | Descripción |
|----------|------------|-------------|
| **Frontend** | React + Vite + TS | Interfaz para visualizar métricas, amenazas y alertas. |
| **Dashboard API** | FastAPI | Provee los datos de PostgreSQL al frontend (ruta `/api`). |
| **Workflows** | n8n | Orquestador para extraer datos de Hacker News, Exploit-DB y GitHub Security Issues. |
| **Sentiment API** | VADER / TextBlob | Microservicio para NLP y clasificación de sentimiento. |
| **Database** | PostgreSQL 15 | Almacena métricas, logs y detecciones (esquema en `init.sql`). |
| **Gateway** | Traefik | Proxy reverso que rutea todo el tráfico. |

## Mantenimiento y Configuración

- **Base de Datos**: El esquema relacional se inicializa de manera automática mediante `init.sql` al crear el contenedor `postgres` por primera vez.
- **Workflows n8n**: Podes restaurar o actualizar los flujos usando el archivo `workflow.json` que está en el directorio. Si querés consultar GitHub con mayor margen de rate limit, configurá `GITHUB_TOKEN` como variable de n8n.
- **Import manual del workflow**: Para importar o actualizar el workflow versionado sin ejecutarlo en cada arranque, usá `docker compose --profile tools run --rm n8n-import`.
- **Permisos de configuración n8n**: `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` se define desde `.env` para controlar la validación de permisos del archivo de configuración de n8n en entornos Docker.
- **Credencial PostgreSQL en n8n**: El `workflow.json` versionado no incluye credenciales. Después de importar el workflow, creá una credencial PostgreSQL en n8n con estos datos del entorno Docker:
  - Host: `postgres`
  - Port: `5432`
  - Database: valor de `POSTGRES_DB`
  - User: valor de `POSTGRES_USER`
  - Password: valor de `POSTGRES_PASSWORD`
  - SSL: desactivado para el entorno local de Docker Compose
  Luego asigná esa credencial a todos los nodos PostgreSQL del workflow: `Check Existing IDs`, `Insert Social Mention`, `Insert Sentiment Analysis`, `Insert Threat Detection`, `Log Alert in DB` y `Log Execution`.
  Esto se mantiene manual a propósito: n8n exporta/importa credenciales por separado y las cifra con `N8N_ENCRYPTION_KEY`; versionarlas junto al workflow metería secretos o artefactos cifrados frágiles en Git.
- **Refactor Pendiente**: El `dashboard-api` se está rediseñando para incorporar modelos Pydantic y una capa de repositorios, abandonando el SQL crudo para mayor escalabilidad.

## Checklist de despliegue

- [ ] Verificar variables de entorno en el `.env`.
- [ ] Asegurarse de importar el `workflow.json` en n8n.
- [ ] Crear/asignar la credencial PostgreSQL en los nodos n8n antes de activar el workflow.
- [ ] Validar que los puertos `80`, `5678` y `8080` estén libres en el host.
