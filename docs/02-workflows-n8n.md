## Exploración: Workflows & Automation (n8n, workflow.json)

### Estado Actual
El sistema actual es un pipeline automatizado implementado en n8n que sirve como monitor de seguridad OSINT (Open Source Intelligence). El flujo principal se ejecuta de forma periódica cada 15 minutos e integra tres fuentes de datos heterogéneas. Está estructurado en cinco etapas claramente definidas: Ingestión, Análisis, Almacenamiento, Alertas y Registro (Logging). Los datos fluyen a través de operaciones de transformación, evaluación externa de sentimiento, evaluación de amenazas basada en heurísticas y persistencia secuencial en PostgreSQL.

### Áreas Afectadas
- `workflow.json` — Es el archivo principal que define la estructura, los nodos y la lógica del flujo de trabajo de n8n.
- `sentiment-api/` — API externa consumida en la etapa de análisis.
- `init.sql` (implicado) — Tablas de PostgreSQL referenciadas en los nodos de base de datos (`social_mentions`, `sentiment_analysis`, `threat_detections`, `alerts`, `execution_logs`).

### Detalles de Nodos, Conexiones y Lógica

#### 1. Ingestión (Ingestion)
- **Schedule Trigger**: Gatilla la ejecución del flujo cada 15 minutos.
- **Fuentes Paralelas (HTTP Requests)**: 
  - Hacker News API (Búsqueda mediante Algolia de menciones de seguridad).
  - Exploit-DB (Análisis del Feed RSS en formato XML).
  - GitHub Security Issues (Búsqueda de issues con etiquetas de seguridad).
- **Parsers (Function Nodes)**: Cada fuente tiene un nodo en JavaScript para normalizar los objetos dispares (JSON/XML) a un esquema estandarizado (ID, texto, autor, engagement).
- **Deduplicación**: Un script personalizado en JavaScript que retira duplicados intra-lote basados en el campo `external_id` (la deduplicación inter-ejecución la resuelve PostgreSQL vía ON CONFLICT).

#### 2. Análisis (Analysis)
- **Sentiment Analysis (HTTP Request)**: Envía una petición `POST` al endpoint interno `http://sentiment-api:5000/analyze` (ensamble de VADER y TextBlob) pasando el `text_content`.
- **Classify Threat (Function Node)**: Combina la información original con el puntaje de sentimiento. Realiza una clasificación basada en heurísticas y palabras clave (ej. 'ransomware', 'zero-day' pesan 30 puntos, etc.). El riesgo de la amenaza se incrementa en función del número de seguidores del autor, interacciones y el tipo de URLs (ej. dominios `.tk`). Finalmente, determina el nivel de criticidad (`low`, `medium`, `high`, `critical`).

#### 3. Almacenamiento Secuencial (Storage)
Esta etapa utiliza un patrón de preparación y ejecución (Prep -> Insert -> Enrich) para garantizar la integridad referencial:
- **Prep Mention Insert -> Insert Social Mention**: Aplana los objetos para insertarlos (ON CONFLICT DO UPDATE) en `social_mentions` y obtiene el `mention_id`.
- **Enrich Mention + Prep Sentiment -> Insert Sentiment Analysis**: Recupera el estado original combinándolo con el `mention_id` recién creado. Prepara el nodo para persistir las métricas en `sentiment_analysis` devolviendo el `sentiment_id`.
- **Enrich Sentiment + Prep Threat -> Insert Threat Detection**: Intercala el `sentiment_id` y prepara la entidad para la inserción en `threat_detections` de donde se obtiene el `detection_id`.
- **Enrich After Threat**: Vuelve a exponer todos los datos recolectados, junto con los IDs generados y la `criticality_level`, para las etapas posteriores.

#### 4. Alertas (Alerting)
- **IF Critical or High**: Actúa como compuerta lógica. Sólo aquellos registros evaluados con criticidad 'high' o 'critical' pasan a la rama `true`.
- **Build Alert Content**: Compila y estructura los datos para las alertas utilizando bloques de UI (Slack Blocks) y plantillas HTML para correo electrónico.
- **MOCK Nodes**: Actualmente, tanto el envío por Slack como por Email están configurados como mocks vía nodos de función que sólo imprimen a consola (`console.log`), deteniendo el paso real del mensaje a redes externas.
- **Postgres Alerts Logging**: Inserta los detalles del mensaje de alerta y su estado en la tabla `alerts`.

#### 5. Registro de Ejecución (Logging)
- **Prep Log Execution**: Recolecta métricas de la ejecución global evaluando los tamaños de los lotes procesados por nodos anteriores (usando `$('Node').all().length`).
- **Log Execution**: Persiste el recuento (recolección, procesamiento, alertas) en la tabla `execution_logs`.

### Recomendaciones
1. **Manejo de Errores (Error Handling):** Se observa el uso de "Continue On Fail" en los nodos HTTP, pero sería recomendable implementar un manejo global de errores en n8n a través del nodo "Error Trigger" para monitorear disrupciones en las fuentes o caídas de la API de sentimiento.
2. **Reemplazo de Nodos Mock:** Sustituir los nodos funcionales de mockeo por sus correspondientes nodos nativos de Slack o Email (SendGrid/SMTP) para habilitar envíos reales.
3. **Validación de SQL:** El diseño inyecta los datos como cadenas con una función de escape básica (`esc()`). Se recomienda parametrizar nativamente en el nodo PostgreSQL (`$1, $2`) siempre que sea posible para evitar riesgos de SQL Injection, a pesar de que los datos provengan de APIs conocidas.
4. **Acoplamiento de Índices:** El acoplamiento por correlación de índices (1:1) usado en las funciones `Enrich` podría fallar si PostgreSQL rechaza u omite filas temporalmente. Sería más seguro volver a emparejar por `external_id`.

### Riesgos
- Fallo de mapeo en las operaciones de enriquecimiento (Enrich nodes) si se filtra algún dato en la interacción con PostgreSQL, al asumir un paralelismo estricto índice a índice (1:1).
- Posibles inyecciones de datos anómalos o vulnerabilidades de escape SQL en las instrucciones de inserción hechas a mano.
- Dependencia sincrónica fuerte del microservicio `sentiment-api`; si el servicio experimenta tiempo de inactividad, se pierden las clasificaciones de amenaza.

### Listo para Propuesta
Sí. El orquestador puede usar esta exploración para definir una propuesta de cambios o plan de arquitectura.
