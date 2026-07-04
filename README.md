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
- **Refactor Pendiente**: El `dashboard-api` se está rediseñando para incorporar modelos Pydantic y una capa de repositorios, abandonando el SQL crudo para mayor escalabilidad.

## Checklist de despliegue

- [ ] Verificar variables de entorno en el `.env`.
- [ ] Asegurarse de importar el `workflow.json` en n8n.
- [ ] Validar que los puertos `80`, `5678` y `8080` estén libres en el host.
