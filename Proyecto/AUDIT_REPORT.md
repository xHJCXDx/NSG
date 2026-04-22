# Audit Report: NSG Project

Fecha: 2026-04-22

## Resumen Ejecutivo

Se encontraron **20 problemas críticos y de moderada severidad** en el proyecto NSG. Se clasifican en:
- **CRÍTICOS** (5): Deben ser corregidos antes de producción
- **ALTOS** (7): Afectan funcionalidad o integridad de datos
- **MODERADOS** (6): Mejoras de diseño y seguridad
- **BAJOS** (2): Optimizaciones menores

---

## 🔴 CRÍTICOS

### 1. **INCOHERENCIA: Fields Faltantes en INSERT social_mentions**

**Ubicación**: `workflow.json` → "Insert Social Mention" node

**Problema**: El schema define campos que NUNCA se rellenan:
```sql
-- DEFINIDO EN init.sql pero NUNCA insertado desde workflow:
media_types VARCHAR(20)[],      -- ['image', 'video', 'gif']
geo_location JSONB,              -- Información geográfica
```

El nodo "Parse Tweets" solo captura `has_media` (BOOLEAN), no los tipos específicos.

**Impacto**: 
- Perdida de información sobre tipos de media
- Consultas que filtran por `media_types` retornarán NULL
- Capacidad de análisis reducida

**Solución**: 
- Agregar lógica en "Parse Tweets" para extraer `media.type` de Twitter API
- Cargar en workflow: `media_types = ARRAY['video', 'image', ...]`
- Actualizar INSERT query en "Insert Social Mention"

---

### 2. **INCOHERENCIA: threat_category NO SE INSERTA**

**Ubicación**: `workflow.json` → "Insert Threat Detection" node

**Problema**: El schema define `threat_category` como columna importante:
```sql
threat_category VARCHAR(50),  -- 'malware', 'phishing', 'data_breach', etc.
```

Pero el workflow **NO** inserta este campo. Solo inserta `threat_type`.

```json
// En workflow:
INSERT INTO threat_detections (
  mention_id, sentiment_id, threat_type,    // ← Sí
  criticality_level, confidence_score, matched_keywords, 
  detection_method, risk_score
  // threat_category FALTA ← ❌
)
```

**Impacto**: 
- Schema incompleto (NULL siempre)
- No se puede clasificar amenazas por categoría específica
- Queries de reporting por categoría están rotas

**Solución**:
- Agregar lógica en "Classify Threat" para mapear threat_type → threat_category
- Ejemplo:
  ```javascript
  const threatCategoryMap = {
    'ransomware': 'malware',
    'phishing_attack': 'phishing',
    'zero_day_vulnerability': 'vulnerability',
    'ddos_threat': 'ddos'
  };
  threat.category = threatCategoryMap[threatType] || 'other';
  ```
- Actualizar INSERT query

---

### 3. **BUG: Credential ID Duplicada (Twitter = Reddit)**

**Ubicación**: `workflow.json` → Múltiples nodos

**Problema**: Dos servicios de APIs diferentes comparten el MISMO credential ID:

```json
// Twitter API Search node:
"credentials": {
  "twitterOAuth2Api": {
    "id": "frSYxSmQY1EQqr13",
    "name": "X account"
  }
}

// Reddit Search node:
"credentials": {
  "redditApi": {
    "id": "frSYxSmQY1EQqr13",  // ← MISMO ID ❌
    "name": "Reddit account"
  }
}
```

**Impacto**: 
- Reddit probablemente usa credenciales de Twitter por error
- Reddit Search falla o usa auth incorrecta
- Datos de Reddit no se recopilan

**Solución**: 
- Obtener ID correcto de Reddit desde n8n UI
- Actualizar workflow.json con ID correcto

---

### 4. **PYTHON API: confidence_score Sin Validación de Rango**

**Ubicación**: `sentiment-api/sentiment_api.py` línea 52

**Código**:
```python
score_diff = abs(vader_scores['compound'] - textblob_scores['polarity'])
confidence = 1.0 - (score_diff / 2)  # ← Sin clamp
```

**Problema**: Si `score_diff` > 2.0, confidence se vuelve **negativo**.
- Ejemplo: Si hay un bug donde score_diff = 3.0
- confidence = 1.0 - 1.5 = **-0.5** ← INVÁLIDO

El schema espera: `confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1)`

**Impacto**: 
- INSERT falla en PostgreSQL (CHECK constraint violation)
- Workflow se rompe
- No se registran resultados

**Solución**:
```python
score_diff = abs(vader_scores['compound'] - textblob_scores['polarity'])
confidence = max(0.0, min(1.0, 1.0 - (score_diff / 2)))  # Clamp 0-1
```

---

### 5. **SCHEMA OVERCOMPLICATED vs WORKFLOW USAGE**

**Ubicación**: `init.sql` entero

**Problema**: El schema define ~150+ columnas en 8 tablas, pero el workflow SOLO usa ~40-50:

**Ejemplo - threat_detections**:
```sql
-- Schema define campos de revisión manual:
review_status VARCHAR(20) CHECK (review_status IN ('pending', 'reviewing', 'confirmed', 'false_positive', 'investigating', 'resolved')),
reviewed_by VARCHAR(100),
reviewed_at TIMESTAMPTZ,
review_notes TEXT,
actions_taken TEXT[],
remediation_status VARCHAR(20),
escalated BOOLEAN,
escalated_to VARCHAR(100),
escalation_time TIMESTAMPTZ,

-- Pero workflow NUNCA popula estos. Requieren interface manual.
```

**Impacto**: 
- Base de datos tiene ghost columns
- Confusión sobre qué campos son auto-poblados vs manuales
- Duplicación de esfuerzo (algunos campos en schema pero sin lógica en workflow)
- Mantenimiento difícil

**Solución**:
- **Opción A**: Crear interface/dashboard manual para campos de revisión
- **Opción B**: Simplificar schema a solo campos auto-poblados por workflow

---

## 🟠 ALTOS

### 6. **INSUFICIENTE CONTEXT EN INSERT alerts**

**Ubicación**: `workflow.json` → "Log Alert in DB" node

**Problema**: El alert NO registra **a QUIÉN se envía**:

```sql
-- Insertado:
INSERT INTO alerts (detection_id, alert_title, alert_message, 
  alert_severity, channels_sent, slack_channel, sent_at, delivery_status)

-- Falta:
recipients TEXT[],           -- Email/usernames que recibirán
teams_notified VARCHAR(50)[] -- Equipos notificados
```

**Impacto**: 
- No hay auditoría de quién fue alertado
- No se puede hacer seguimiento ("¿recibió Juan la alerta?")
- Reportes incompletos

**Solución**:
- Pasar `recipients` desde "Build Alert Content" 
- Registrar todos los destinatarios en INSERT

---

### 7. **RETRY LOGIC MISSING**

**Ubicación**: `workflow.json` → "Sentiment Analysis" node

**Problema**: Si la API de sentimientos falla:
```json
"continueOnFail": true  // ← Continúa sin reintentos
```

Simplemente sigue sin datos de sentimiento. No hay reintentos, sin exponential backoff, sin fallback.

**Impacto**: 
- Si API está temporalmente caída, todos los tweets de esa ejecución pierden análisis
- Ejecuciones fallidas silenciosas
- Baja visibilidad de errores

**Solución**:
- Agregar retry logic en n8n (esperar 5s, reintentar 3 veces)
- Loguear errores en execution_logs

---

### 8. **GUNICORN SIN CONFIGURACIÓN EXPLÍCITA**

**Ubicación**: `sentiment-api/Dockerfile`

**Problema**:
```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "sentiment_api:app"]
```

Usa defaults de Gunicorn:
- 4 workers (bajo para concurrencia)
- 30s timeout (corto para textos largos)
- Sin logging
- Sin access logs

**Impacto**: 
- Bajo rendimiento bajo carga
- Timeouts en análisis de textos largos
- Imposible debuggear en producción

**Solución**:
```dockerfile
CMD [
  "gunicorn",
  "--bind", "0.0.0.0:5000",
  "--workers", "4",
  "--worker-class", "sync",
  "--timeout", "60",
  "--access-logfile", "-",
  "--error-logfile", "-",
  "sentiment_api:app"
]
```

---

### 9. **NO LOGGING EN SENTIMENT API**

**Ubicación**: `sentiment-api/sentiment_api.py`

**Problema**: Zero logging. Todos los errores retornan genérico `{'error': str(e)}`.

```python
except Exception as e:
    return jsonify({'error': str(e)}), 500
```

**Impacto**: 
- Imposible debuggear errores
- Sin auditoría de requests
- Sin visibilidad de performance

**Solución**:
```python
import logging
logger = logging.getLogger(__name__)

# En cada request:
logger.info(f"Analyzing text length: {len(text)}")
# En catch:
logger.exception(f"Error analyzing: {e}")
```

---

### 10. **RUNTIME TYPE MISMATCH: itemMatching Usage**

**Ubicación**: `workflow.json` → "Log Execution" node

**Problema**:
```javascript
{{ $('Parse Tweets').itemMatching(0)?.length || 0 }}
{{ $('Deduplicate').itemMatching(0)?.length || 0 }}
{{ $('Insert Threat Detection').itemMatching(0)?.length || 0 }}
{{ (() => { try { return $('Log Alert in DB').itemMatching(0).length; } catch(e) { return 0; } })() }}
```

- Los primeros 3 usan `?.length` (safe optional chaining)
- El último usa try/catch (inconsistente)
- ¿Por qué solo el último tiene try/catch? Los otros también pueden fallar

**Impacto**: 
- Execution logs pueden tener valores incorrectos
- Métricas incompletas
- Debugging difícil

**Solución**:
```javascript
{{ (() => { 
  try { return $('Parse Tweets').itemMatching(0)?.length || 0; } 
  catch(e) { return 0; } 
})() }}
```

---

### 11. **MALFORMED SQL: Prefijo "=" en INSERT alerts**

**Ubicación**: `workflow.json` → "Log Alert in DB" node

**SQL**:
```sql
="INSERT INTO alerts (...)  // ← ¿Qué significa "="?
```

En otros nodos:
```sql
"query": "INSERT INTO ..."  // ← Correcto
```

**Impacto**: 
- Posible syntax error en n8n
- Alert logging puede fallar
- Alerts no se registran en DB

**Solución**: Remover prefijo `=`:
```json
"query": "INSERT INTO alerts (...)"
```

---

## 🟡 MODERADOS

### 12. **UNICODE/ENCODING FRAGILITY**

**Ubicación**: `workflow.json` → Múltiples nodos, special character handling

**Problema**: 
```javascript
.replace(/'/g, "''").replace(/[\r\n]+/g, ' ')
```

Maneja single quotes y newlines, pero ¿qué pasa con:
- Caracteres no-ASCII (emojis, caracteres acentuados)
- NULL bytes
- Control characters

Postgres maneja UTF-8 nativamente, pero si hay malformed input, puede causar issues.

**Impacto**: 
- Occasional INSERT failures con ciertos tweets
- Data loss (tweet se descarta)
- Silent failures

**Solución**:
Usar parametrized queries en lugar de string interpolation (más seguro).

---

### 13. **HARDCODED PORTS Y HOST EN API**

**Ubicación**: `sentiment-api/sentiment_api.py` línea 73

```python
app.run(host='0.0.0.0', port=5000, debug=False)
```

Hardcoded. Sin variables de entorno.

**Impacto**: 
- No es configurable
- Si necesito cambiar puerto, debo editar código
- Cada entorno (dev, staging, prod) requiere cambios manuales

**Solución**:
```python
import os

HOST = os.getenv('API_HOST', '0.0.0.0')
PORT = int(os.getenv('API_PORT', 5000))

app.run(host=HOST, port=PORT, debug=False)
```

---

### 14. **NO AUTHENTICATION EN API**

**Ubicación**: `sentiment-api/sentiment_api.py`

**Problema**: `/analyze` endpoint es públicamente accessible. Cualquiera puede POSTear.

**Impacto**: 
- Exposición a DoS (spam requests)
- Consumo de recursos sin control
- En producción, recurso expuesto

**Solución**:
```python
@app.before_request
def check_auth():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token != os.getenv('API_TOKEN'):
        return jsonify({'error': 'Unauthorized'}), 401

@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    # ... token ya validado
```

---

### 15. **MATERIALIZED VIEWS NUNCA SE REFRESCAN**

**Ubicación**: `init.sql` → Materialized Views

**Problema**: Las vistas materializadas:
```sql
CREATE MATERIALIZED VIEW daily_mention_stats AS ...
CREATE MATERIALIZED VIEW top_keywords_stats AS ...
CREATE MATERIALIZED VIEW workflow_performance_stats AS ...
```

Se crean, pero **NUNCA se refrescan** en el workflow. Los datos son stale.

**Impacto**: 
- Dashboards muestran datos antiguos
- Reporting incorrecto
- Las vistas existen pero inútiles

**Solución**:
Agregar un nodo en workflow para refrescar:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_mention_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY top_keywords_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_performance_stats;
```

---

### 16. **REDDIT INTEGRATION INCOMPLETE**

**Ubicación**: `workflow.json` → Reddit nodes

**Problema**: Los nodos de Reddit existen pero:
- Credential ID está duplicada (problema #3)
- Schema para social_mentions NO está optimizado para Reddit posts (ej: `author_followers_count` no existe en Reddit)
- Parsing de Reddit es básico (solo `title + selftext`)
- Sin manejo de Reddit-specific fields (subreddits, awards, etc.)

**Impacto**: 
- Reddit data está incompleto o incorrecto
- Campos específicos de Reddit se pierden
- Análisis cruzado Twitter/Reddit es imperfecto

**Solución**:
- Agregar campos opcionales para Reddit
- O crear tabla separada para Reddit posts
- Mejorar parsing

---

## 🔵 BAJOS

### 17. **TRIGGER REDUNDANT EN social_mentions**

**Ubicación**: `init.sql` + `workflow.json`

**Problema**:
```sql
-- Trigger actualiza last_updated:
CREATE TRIGGER update_social_mentions_last_updated
    BEFORE UPDATE ON social_mentions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Pero workflow también lo hace explícitamente:
last_updated = NOW()
```

Resultados en: trigger corre Y query actualiza (redundante).

**Impacto**: 
- Pequeña ineficiencia
- Confusión sobre quién actualiza el timestamp

**Solución**:
- O remover trigger y dejar que workflow lo maneje
- O remover `last_updated = NOW()` del query

---

### 18. **SENTIMENT LABEL 'mixed' NUNCA SE ASIGNA**

**Ubicación**: `sentiment-api/sentiment_api.py`

**Problema**:
```sql
-- Schema permite 'mixed':
sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'mixed'))

-- Pero API solo asigna:
if ensemble_score >= 0.05: label = 'positive'
elif ensemble_score <= -0.05: label = 'negative'
else: label = 'neutral'
```

Nunca asigna 'mixed'.

**Impacto**: 
- Schema permite valor que nunca se usa
- Confusión en reportes
- Lógica incompleta

**Solución**:
- Remover 'mixed' de schema CHECK constraint
- O implementar lógica para asignar 'mixed' (ej: si VADER y TextBlob divergen mucho)

---

### 19. **PROCESSED MENTIONS LOGIC UNCLEAR**

**Ubicación**: `workflow.json` → "Insert Social Mention"

**Problema**: 
```sql
processing_status\n'processed'
```

El status se setea a 'processed' en INSERT. Pero el workflow nunca actualiza a 'failed' si algo falla después.

**Impacto**: 
- Si sentiment analysis falla, status sigue siendo 'processed'
- Falsos positivos en "all mentions processed"

**Solución**:
- Actualizar status a 'failed' si hay errores en etapas posteriores

---

### 20. **MISSING DEPLOYMENT DOCUMENTATION**

**Ubicación**: Ningún archivo

**Problema**: No hay documentación sobre:
- Cómo hacer deploy a producción
- Health checks necesarios
- Monitoring/alerting
- Backup strategy
- Disaster recovery

**Impacto**: 
- Operaciones caóticas
- Downtime potencial
- Recovery impredecible

**Solución**: Crear `DEPLOYMENT.md`

---

## Resumen por Severidad

| Severidad | Cantidad | Acción |
|-----------|----------|--------|
| 🔴 CRÍTICO | 5 | **INMEDIATO** - Bloquea producción |
| 🟠 ALTO | 7 | **ESTA SPRINT** - Afecta funcionalidad |
| 🟡 MODERADO | 6 | **PRÓXIMAS SPRINTS** - Mejoras |
| 🔵 BAJO | 2 | **CUANDO SEA** - Optimizaciones |

---

## Plan de Corrección (Propuesto)

### Fase 1: CRÍTICOS (1-2 días)
1. Agregar `media_types` en Parse Tweets
2. Mapear `threat_category` en Classify Threat
3. Corregir credential ID de Reddit
4. Agregar clamp a confidence_score en API
5. Remover prefijo "=" en INSERT alerts

### Fase 2: ALTOS (3-5 días)
6. Implementar retry logic en Sentiment Analysis
7. Configurar Gunicorn explícitamente
8. Agregar logging en API
9. Consistencia en itemMatching con try/catch
10. Completar Reddit integration
11. Agregar recipients tracking en alerts
12. Refrescar materialized views

### Fase 3: MODERADOS (1-2 sprints)
13-19: Mejoras de seguridad, configuración, validación

### Fase 4: DOCUMENTACIÓN
20: Crear DEPLOYMENT.md, MONITORING.md, RECOVERY.md

---

**Generado por**: Auditoría Automática  
**Fecha**: 2026-04-22  
**Siguiente revisión**: Después de correcciones Fase 1
