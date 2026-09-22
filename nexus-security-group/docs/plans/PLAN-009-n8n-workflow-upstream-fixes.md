# PLAN-009: Correcciones del Workflow n8n Upstream (Pre-Enrich)

**Estado:** DONE
**Prioridad:** HIGH
**Origen:** Análisis de calidad del pipeline n8n upstream de `Enrich After Threat`. Se encontraron bugs funcionales, bypass de sanitización, problemas de seguridad y score inflation.
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`, `workflow.json`

> **Objetivo:** Corregir bugs de clasificación, sanitización SQL, autenticación y scoring en los nodos anteriores a `Enrich After Threat` del workflow OSINT de n8n.

> **Regla de implementación:** un commit por modificación, Conventional Commits. Branch: `develop`. Todos los cambios son en `workflow.json` salvo M04 (`.env.example`).

> **Advertencia:** `workflow.json` es un archivo JSON monolítico importado por n8n. Cada modificación requiere editar nodos dentro del JSON, respetar IDs y posiciones, y verificar con `python -m json.tool`.

---

## Índice de Modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|-----------|------|-------------|--------|
| M01 | ✅ DONE | Classify Threat | Phishing TLD check sobreescribe `threatType` incondicionalmente | DONE |
| M02 | ✅ DONE | Insert Threat Detection | `$7::text[]` recibe JS array en vez de `p_matched_keywords_literal` | DONE |
| M03 | ✅ DONE | Insert Threat Detection | `$3` y `$4` bypasean `esc()` leyendo de `_original` en vez de `p_*` | DONE |
| M04 | ✅ DONE | Fetch GitHub Security Issues | Sin header de autenticación — rate limit 10 req/hora | DONE |
| M05 | ✅ DONE | Manual OSINT Trigger | Webhook sin autenticación — abierto a POST arbitrarios | DONE |
| M06 | ✅ DONE | Classify Threat | TLD check usa `includes()` sobre URL completa — false positives en paths | DONE |
| M07 | ✅ DONE | Parse GitHub Issues / Parse RSS Items | `author_verified: true` hardcodeado infla score +10 en cada item | DONE |

---

## M01 — Phishing TLD check sobreescribe threatType incondicionalmente

**Prioridad:** CRITICAL
**Área:** `workflow.json` → nodo `Classify Threat` (id: `06868318-3716-4e20-955c-8cff187527f6`)
**Estado:** DONE

### Problema

En la función `classifyThreat()`, el bloque de análisis URL/TLD al final de la función hace:

```js
if (tweet.urls.some(url => suspiciousTLDs.some(tld => url.toLowerCase().includes(tld)))) {
  score += 15;
  threatType = 'potential_phishing';
}
```

Esta asignación es **incondicional**: si el texto matcheó `ransomware` (30 puntos, `threatType = 'critical_security_incident'`) y además tiene una URL con TLD `.xyz`, el `threatType` final queda como `'potential_phishing'` en vez de `'critical_security_incident'`. Se degrada la clasificación.

### Solución

Agregar un guard para que solo asigne `potential_phishing` si no hay una clasificación más severa:

```js
if (tweet.urls.some(url => suspiciousTLDs.some(tld => url.toLowerCase().includes(tld)))) {
  score += 15;
  if (threatType === 'general') {
    threatType = 'potential_phishing';
  }
}
```

Esto mantiene el score boost de +15 (la URL sigue siendo sospechosa) pero no degrada un `critical_security_incident` o `security_threat` a phishing.

### Archivos afectados

- `workflow.json` — nodo `Classify Threat`, función `classifyThreat()`

---

## M02 — matched_keywords: JS array en vez de SQL literal

**Prioridad:** CRITICAL
**Área:** `workflow.json` → nodo `Insert Threat Detection` (id: `a92bb683-d07f-44ac-bc3e-fc1e68030b2c`)
**Estado:** DONE

### Problema

El parámetro `$7` del INSERT usa:

```
{{ (($json._original.threat || {}).matched_keywords || []).length > 0
   ? ($json._original.threat || {}).matched_keywords
   : null }}
```

Esto pasa un array JavaScript (`["phishing","rce"]`) a un parámetro tipado como `$7::text[]`. n8n serializa el array JS como string, produciendo un formato que PostgreSQL no reconoce como `text[]`. El resultado depende de la versión de n8n — puede insertar un string literal en vez de un array, o fallar silenciosamente.

El nodo upstream `Enrich Sentiment + Prep Threat` ya construye `p_matched_keywords_literal` con formato SQL correcto:

```js
const keywordsLiteral = keywords.length > 0
  ? 'ARRAY[' + keywords.map(k => "'" + esc(k) + "'").join(',') + ']'
  : 'NULL';
```

Pero este campo se ignora completamente.

### Solución

Cambiar el queryReplacement `$7` para usar el campo ya preparado:

```
{{ $json.p_matched_keywords_literal }}
```

**Nota:** Como `p_matched_keywords_literal` es un SQL literal (`ARRAY['k1','k2']` o `NULL`), el parámetro no puede ser un placeholder `$7`. Hay que inyectar el literal directamente en el SQL.

Cambiar el SQL de:
```sql
... $7::text[], 'heuristic', $8
```
A:
```sql
... {{ $json.p_matched_keywords_literal }}, 'heuristic', $7
```

Y renumerar los parámetros: `$8` pasa a ser `$7` (`p_risk_score`). Eliminar el queryReplacement antiguo de `$7` (matched_keywords) y ajustar el de `$8` → `$7`.

**Alternativa más conservadora:** mantener el `$7::text[]` placeholder pero cambiar el queryReplacement para pasar el array correctamente. En `Enrich Sentiment + Prep Threat`, construir `p_matched_keywords_array` como un array JS limpio (ya existe como `keywords`), y en el queryReplacement usar `{{ $json.p_matched_keywords_array }}`. n8n v2.2+ serializa arrays JS correctamente para `text[]` cuando se pasan como parámetros de queryReplacement. **Esta alternativa es preferida** porque mantiene la parametrización SQL y evita inyección.

### Solución elegida

En `Enrich Sentiment + Prep Threat`, agregar:
```js
p_matched_keywords: keywords.length > 0 ? keywords.map(k => esc(k)) : null,
```

En `Insert Threat Detection`, cambiar queryReplacement `$7` a:
```
{{ $json.p_matched_keywords }}
```

Esto pasa un array JS sanitizado con `esc()` como parámetro, y n8n lo serializa correctamente para `$7::text[]`.

### Archivos afectados

- `workflow.json` — nodo `Insert Threat Detection` (queryReplacement $7) y nodo `Enrich Sentiment + Prep Threat` (agregar `p_matched_keywords`)

---

## M03 — threat_type y threat_category bypasean sanitización

**Prioridad:** CRITICAL
**Área:** `workflow.json` → nodo `Insert Threat Detection` (id: `a92bb683-d07f-44ac-bc3e-fc1e68030b2c`)
**Estado:** DONE

### Problema

Los queryReplacements `$3` y `$4` leen directamente de `_original.threat`:

```
$3: {{ ($json._original.threat || {}).threat_type || 'informational' }}
$4: {{ ($json._original.threat || {}).threat_category || 'general' }}
```

El nodo `Enrich Sentiment + Prep Threat` ya sanitiza estos valores con `esc()`:

```js
p_threat_type: esc(t.threat_type || 'general'),
p_threat_category: esc(t.threat_category || 'other'),
```

Pero `Insert Threat Detection` ignora `p_threat_type` y `p_threat_category` y lee del objeto crudo `_original`. Esto bypasea la sanitización de null bytes y comillas simples.

### Solución

Cambiar queryReplacements `$3` y `$4`:

```
$3: {{ $json.p_threat_type }}
$4: {{ $json.p_threat_category }}
```

### Archivos afectados

- `workflow.json` — nodo `Insert Threat Detection` (queryReplacements $3 y $4)

---

## M04 — Fetch GitHub Security Issues sin autenticación

**Prioridad:** HIGH
**Área:** `workflow.json` → nodo `Fetch GitHub Security Issues` (id: `8be2674c-355c-4b84-aae5-cdbbfbf7019a`)
**Estado:** DONE

### Problema

El nodo hace requests a la GitHub Search API sin token de autenticación. Solo envía `User-Agent: NSG-OSINT-Monitor/1.0`. La API de GitHub tiene un rate limit de **10 requests/hora** sin autenticación vs **30 requests/minuto** autenticado. Con el cron del workflow ejecutando cada hora, se agota el rate limit rápidamente y los requests fallan con 403.

### Solución

Agregar un header `Authorization` con un token de GitHub:

```json
{
  "name": "Authorization",
  "value": "={{ 'Bearer ' + $env.GITHUB_TOKEN }}"
}
```

Agregar `GITHUB_TOKEN=change-me` a `.env.example`.

**Nota:** El token solo requiere permisos de lectura pública (no necesita scopes). Un personal access token (classic) sin scopes seleccionados es suficiente para la Search API autenticada.

### Archivos afectados

- `workflow.json` — nodo `Fetch GitHub Security Issues` (headers)
- `.env.example` — agregar `GITHUB_TOKEN`

---

## M05 — Manual OSINT Trigger sin autenticación

**Prioridad:** HIGH
**Área:** `workflow.json` → nodo `Manual OSINT Trigger` (id: `5739c5a7-e4e1-4bdb-a01f-7b681abf6377`)
**Estado:** DONE

### Problema

El webhook `POST /webhook/osint-trigger` no tiene ningún mecanismo de autenticación. Cualquier actor con acceso a la URL puede disparar una ejecución del workflow OSINT completo, generando carga en las APIs externas y en la base de datos.

### Solución

Agregar autenticación por header token:

```json
{
  "authentication": "headerAuth",
  "options": {
    "headerAuth": {
      "name": "X-Webhook-Token",
      "value": "={{ $env.WEBHOOK_SECRET }}"
    }
  }
}
```

**Nota:** n8n soporta `headerAuth` nativo en webhooks v1.1. El caller debe enviar `X-Webhook-Token: <secret>` en el request.

Agregar `WEBHOOK_SECRET=change-me` a `.env.example`.

### Archivos afectados

- `workflow.json` — nodo `Manual OSINT Trigger` (authentication)
- `.env.example` — agregar `WEBHOOK_SECRET`

---

## M06 — TLD check con false positives por `includes()` en URL completa

**Prioridad:** MEDIUM
**Área:** `workflow.json` → nodo `Classify Threat` (id: `06868318-3716-4e20-955c-8cff187527f6`)
**Estado:** DONE

### Problema

El check de TLDs sospechosos usa `url.toLowerCase().includes(tld)` sobre la URL completa. Esto genera false positives:

- `https://example.com/top-stories` matchea `.top`
- `https://example.com/file.ml` matchea `.ml`
- `https://example.com/config.cf` matchea `.cf`

El check debería ejecutarse solo sobre el hostname.

### Solución

Extraer el hostname antes de comparar TLDs:

```js
if (tweet.urls && tweet.urls.length > 0) {
  score += 5;
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top'];
  const hasPhishyTLD = tweet.urls.some(url => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return suspiciousTLDs.some(tld => hostname.endsWith(tld));
    } catch { return false; }
  });
  if (hasPhishyTLD) {
    score += 15;
    if (threatType === 'general') {
      threatType = 'potential_phishing';
    }
  }
}
```

**Nota:** Esta modificación incorpora el fix de M01 (guard `if (threatType === 'general')`). Si M01 se implementa primero, este bloque lo reemplaza completamente. Si se implementan juntos, usar este bloque directamente.

### Archivos afectados

- `workflow.json` — nodo `Classify Threat`, función `classifyThreat()`, bloque URL analysis

---

## M07 — author_verified hardcodeado infla scores

**Prioridad:** LOW
**Área:** `workflow.json` → nodos `Parse GitHub Issues` (id: `310a2da4-dd2d-443b-b2ee-c4231dd52715`) y `Parse RSS Items` (id: `c8b1f07e-ab94-4d7f-a0dd-ea18592da78c`)
**Estado:** DONE

### Problema

Ambos parsers hardcodean `author_verified: true` para todos los items:

- `Parse GitHub Issues`: todo issue de GitHub se marca como verificado
- `Parse RSS Items`: todo item de Exploit-DB se marca como verificado

En `Classify Threat`, `author_verified: true` agrega +10 al score. Esto significa que el 100% de los items de GitHub y Exploit-DB arrancan con un bonus de +10 puntos que no refleja la credibilidad real del autor específico.

### Análisis

Este es un **trade-off de diseño**, no un bug puro. Los argumentos a favor de `true`:

- GitHub y Exploit-DB son fuentes curadas — los items tienen un baseline de credibilidad mayor que tweets aleatorios
- El +10 diferencia items de fuentes profesionales vs social media

Los argumentos en contra:

- No todos los issues de GitHub son de fuentes verificadas — cualquiera puede abrir un issue
- El bonus es flat (+10) independientemente de la calidad del reporte
- Infla artificialmente scores — un issue de GitHub con keyword "attack" ya tiene 20 puntos (10 keyword + 10 verified) sin engagement ni sentiment

### Solución

Cambiar `author_verified: true` a `author_verified: false` en ambos parsers. Si se quiere mantener un bonus por fuente, implementarlo como un `source_trust_bonus` explícito en `Classify Threat` basado en `platform`:

```js
// Source trust bonus (replaces blanket author_verified)
const platformBonus = { 'github': 5, 'exploit-db': 8, 'hackernews': 0 };
score += platformBonus[tweet.platform] || 0;
```

Esto es más transparente y ajustable que abusar del campo `author_verified`.

**Decisión:** Implementar solo el cambio a `false` en los parsers. El `platformBonus` queda como mejora futura documentada — requiere recalibrar los umbrales de criticality y es scope creep para este plan.

### Archivos afectados

- `workflow.json` — nodos `Parse GitHub Issues` y `Parse RSS Items` (campo `author_verified`)

---

## Orden de Ejecución Recomendado

```
M03 (sanitización bypass — fix simple, alto impacto)
  → M02 (matched_keywords — depende de editar mismos nodos que M03)
  → M01 (phishing overwrite — fix en Classify Threat)
  → M06 (TLD false positives — reemplaza bloque de M01 en Classify Threat)
  → M04 (GitHub auth — independiente, toca .env.example)
  → M05 (webhook auth — independiente, toca .env.example)
  → M07 (author_verified — impacto bajo, puede ir al final)
```

M01 y M06 se pueden fusionar en un solo commit ya que M06 reemplaza completamente el bloque que M01 modifica. M04 y M05 son independientes entre sí pero ambos tocan `.env.example`.

---

## Commits

```
755ec57 docs: add PLAN-009 for upstream n8n workflow fixes
6661039 fix(workflow): correct upstream pipeline bugs and add auth (PLAN-009)
```
