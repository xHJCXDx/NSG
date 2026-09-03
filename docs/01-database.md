## Exploración: Base de Datos y Modelos (nsg-docs-db)

### Estado Actual
El sistema actualiza y gestiona las detecciones de amenazas basadas en fuentes OSINT a través de una base de datos PostgreSQL 15, orquestada mediante Docker Compose (junto con contenedores para N8N, un dashboard y API de análisis de sentimiento). El esquema está definido íntegramente en `init.sql` y se despliega al inicializar la base de datos de Docker. El esquema utiliza extensiones como `pg_trgm`, `btree_gin` y `uuid-ossp` para optimizar búsquedas de texto completo y UUIDs.

### Áreas Afectadas
- `init.sql` — Contiene la definición de todo el esquema de la base de datos, tablas, vistas, funciones, triggers y políticas RLS (Row-Level Security).
- `docker-compose.yml` — Provee el entorno de ejecución, configurando el contenedor `postgres:15` y los volúmenes persistentes.

### Análisis Detallado

1. **Tablas y Relaciones:**
   - **`social_mentions`**: Almacena los datos OSINT crudos. Utiliza índices GIN para búsqueda de texto libre (`text_content`) y arrays (`urls`, `hashtags`). El índice de texto completo asume el idioma `spanish`, lo cual es óptimo para la región de interés.
   - **`sentiment_analysis` & `threat_detections`**: Tienen relaciones uno a uno con las menciones. `threat_detections` guarda los IOCs y niveles de criticidad.
   - **`keywords_monitor`**: Tabla de configuración para buscar automáticamente palabras clave (soporta expresiones regulares).
   - **Otras tablas**: `alerts` (seguimiento de alertas enviadas a Slack/canales), `execution_logs` (auditoría de flujos como n8n), y `user_activity` (trazabilidad de usuarios).

2. **Triggers y Procedimientos Almacenados:**
   - **Actualización automática**: Existen triggers para mantener `last_updated` al día y para calcular duraciones en `execution_logs`.
   - **`update_keyword_match`**: Se ejecuta *después de cada inserción* en `social_mentions`. Realiza búsquedas `LIKE` o de expresiones regulares contra la tabla de `keywords_monitor`. **Advertencia de rendimiento:** esto puede ser un cuello de botella grave a medida que aumenta el volumen de menciones, ya que cada inserción iterará sobre todas las reglas activas de monitoreo de manera síncrona.
   - **Procedimientos de mantenimiento**: Hay un `purge_old_data` que elimina menciones antiguas sin amenazas confirmadas, y un `optimize_database` para ejecutar `ANALYZE` y refrescar las vistas materializadas.

3. **Vistas Materializadas:**
   - Hay tres vistas principales: `daily_mention_stats`, `top_keywords_stats` y `workflow_performance_stats`.
   - Están bien estructuradas para tableros de control diarios, pero su refresco (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) debe programarse manualmente (por ejemplo, a través de cron o en el código del servidor, dado que no hay una extensión como `pg_cron` en el archivo de inicio).

4. **Políticas de Seguridad (RLS):**
   - El RLS está activado en `social_mentions` y `threat_detections`.
   - **Problema encontrado:** Se creó una política `user_isolation_policy` para `threat_detections` (restringiendo al usuario `osint_analyst` a ver solo sus propias asignaciones), pero **no existe ninguna política definida para `social_mentions`**. Al estar el RLS habilitado sin políticas explícitas, el acceso por defecto para roles no administradores (como `osint_analyst`) estará completamente bloqueado para esa tabla.

5. **Configuración de PostgreSQL:**
   - En `docker-compose.yml`, se usa la imagen estándar sin optimizaciones en `postgresql.conf` (como `shared_buffers`, `work_mem` o configuración de conexiones). Dado que OSINT es intensivo en lecturas y escrituras text-heavy, la configuración por defecto podría no escalar.

### Recomendaciones
1. **Corregir Políticas RLS:** Añadir las políticas necesarias para `social_mentions` para que los analistas puedan visualizar el contexto del mensaje (por ejemplo, una política `SELECT` global para `osint_analyst`).
2. **Refactorizar el Trigger de Keywords:** Considerar mover la lógica de búsqueda de palabras clave a una cola asincrónica o un flujo de N8N. Ejecutar Regex de manera síncrona en cada inserción a nivel DB afectará el rendimiento del ingest.
3. **Optimización de PostgreSQL:** Proveer un archivo `postgresql.conf` personalizado en `docker-compose` para optimizar memoria orientada al uso intensivo de índices GIN y expresiones regulares.
4. **Automatizar el Refresco de Vistas:** Implementar `pg_cron` o definir la automatización explícita del procedimiento `optimize_database`.

### Riesgos
- Cuello de botella de rendimiento en inserciones debido al trigger síncrono `update_keyword_match`.
- Bloqueo de acceso de lectura a `social_mentions` para los analistas (debido al RLS incompleto).
- Agotamiento prematuro de memoria (OOM) o subutilización de recursos al no haber un tuning de PostgreSQL en el archivo Docker Compose.

### Listo para Propuesta
Sí.
