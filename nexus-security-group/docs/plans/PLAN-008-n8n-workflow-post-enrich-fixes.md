# PLAN-008: Correcciones del Workflow n8n Post-Enrich

**Estado:** DONE
**Prioridad:** HIGH
**Origen:** Análisis de calidad del pipeline n8n downstream de `Enrich After Threat`. Se encontraron bugs funcionales, dead code, robustez faltante y deuda de documentación.
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`, `workflow.json`

> **Objetivo:** Corregir bugs, eliminar dead code, mejorar robustez y actualizar documentación en los nodos posteriores a `Enrich After Threat` del workflow OSINT de n8n.

> **Regla de implementación:** un commit por modificación, Conventional Commits. Branch: `develop`. Todos los cambios son en `workflow.json` salvo M07 (documentación).

> **Advertencia:** `workflow.json` es un archivo JSON monolítico importado por n8n. Cada modificación requiere editar nodos dentro del JSON, respetar IDs y posiciones, y verificar con `python -m json.tool`.

---

## Índice de Modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|-----------|------|-------------|--------|
| M01 | ✅ DONE | Send Slack Alert | Enviar `slack_blocks` en vez de `alert_message` como texto plano | DONE |
| M02 | ✅ DONE | Prep Alert Insert | Generar `alert_message` descriptivo sin depender de rama paralela | DONE |
| M03 | ✅ DONE | Log Execution | Capturar `$execution.startedAt` en `started_at` para duration real | DONE |
| M04 | ✅ DONE | Log Alert in DB | Agregar `continueOnFail`, `ON CONFLICT` y UNIQUE index | DONE |
| M05 | ✅ DONE | Check Existing IDs → Prep Log Execution | Agregar conexión faltante para log de runs all-duplicate | DONE |
| M06 | ✅ DONE | Slack webhook URL | Reemplazar URL hardcodeada con `$env.SLACK_WEBHOOK_URL` | DONE |
| M07 | ✅ DONE | SYSTEM-ARCHITECTURE.md | Actualizar umbrales de criticality a critical ≥60, high ≥40, medium ≥20 | DONE |
| M08 | ✅ DONE | Summarize Skipped Items / slack_blocks | Eliminar nodo muerto y corregir emoji surrogate pair | DONE |

---

## M01 — Enviar Slack Block Kit en vez de texto plano

**Prioridad:** CRITICAL
**Área:** `workflow.json` → nodo `Send Slack Alert`
**Estado:** DONE

### Problema

`Build Alert Content` genera un payload completo de Slack Block Kit en `$json.slack_blocks` (header, summary con emojis, hasta 5 alertas individuales, overflow context). Sin embargo, `Send Slack Alert` solo envía `{ "text": $json.alert_message }` — un string plano. Todo el template formateado se desperdicia.

### Solución

Cambiar el body del HTTP Request de:
```json
{ "text": "={{ $json.alert_message }}" }
```
A un body JSON raw que envíe los blocks con fallback text:
```json
{
  "blocks": {{ $json.slack_blocks }},
  "text": "={{ $json.alert_message }}"
}
```

El campo `text` se mantiene como fallback para clientes que no soporten Block Kit.

### Archivos afectados

- `workflow.json` — nodo `Send Slack Alert` (id: `caa142ee-dddd-478d-a4b8-f6b45d5c3451`)

---

## M02 — Corregir `alert_message` vacío en alerts DB

**Prioridad:** CRITICAL
**Área:** `workflow.json` → nodo `Prep Alert Insert`
**Estado:** DONE

### Problema

`Prep Alert Insert` corre en paralelo con `Aggregate Alerts` → `Build Alert Content` (ramas independientes desde `IF Critical or High`). Cuando `Prep Alert Insert` lee `d.alert_message`, el valor siempre es `undefined` porque `Build Alert Content` aún no ejecutó (o ejecutó en otra rama). Resultado: la tabla `alerts` siempre tiene `alert_message = ''`.

### Solución

Generar un `alert_message` descriptivo directamente en `Prep Alert Insert`, sin depender de `Build Alert Content`:

```js
const message = 'Amenaza ' + severity + ': ' +
  (d.threat_type || 'general').replace(/_/g, ' ') +
  ' en ' + (d.platform || 'unknown') +
  ' por ' + (d.author || d.author_username || 'unknown');
```

Esto le da contenido real a la columna de auditoría sin cambiar la arquitectura de ramas paralelas.

### Archivos afectados

- `workflow.json` — nodo `Prep Alert Insert`

---

## M03 — Corregir duration tracking en execution_logs

**Prioridad:** HIGH
**Área:** `workflow.json` → nodos `Prep Log Execution` y `Log Execution`
**Estado:** DONE

### Problema

El INSERT de `Log Execution` usa `NOW()` para ambos `started_at` y `completed_at` en la misma sentencia SQL. El trigger `trigger_calculate_duration` calcula `duration_seconds = completed_at - started_at`, que siempre da 0.

### Solución

1. En `Prep Log Execution`: capturar `$execution.startedAt` (timestamp ISO que n8n expone) y agregarlo como `p_started_at` al output.
2. En `Log Execution`: cambiar el SQL a:
```sql
INSERT INTO execution_logs (
  workflow_name, execution_id, status,
  mentions_collected, mentions_processed,
  detections_generated, alerts_generated,
  started_at, completed_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, NOW());
```
3. Agregar `$json.p_started_at` al queryReplacement.

### Archivos afectados

- `workflow.json` — nodos `Prep Log Execution` y `Log Execution`

---

## M04 — Agregar robustez a Log Alert in DB

**Prioridad:** HIGH
**Área:** `workflow.json` → nodos `Prep Alert Insert` y `Log Alert in DB`
**Estado:** DONE

### Problema

1. `Log Alert in DB` no tiene `continueOnFail: true` — todos los demás nodos Postgres del workflow sí lo tienen. Un error crashea la rama silenciosamente.
2. No hay cláusula `ON CONFLICT` — si se reprocesa una detección, se insertan alertas duplicadas.

### Solución

1. Agregar `"continueOnFail": true` al nodo `Log Alert in DB`.
2. En `Prep Alert Insert`, agregar `ON CONFLICT (detection_id) DO NOTHING` al SQL generado (antes del `RETURNING`).

### Prerequisito

Verificar si `alerts` tiene un constraint UNIQUE en `detection_id`. Si no, agregar uno en `init.sql`.

### Archivos afectados

- `workflow.json` — nodo `Log Alert in DB` (config) y `Prep Alert Insert` (SQL template)
- `init.sql` — posible constraint UNIQUE en `alerts.detection_id`

---

## M05 — Conectar Check Existing IDs → Prep Log Execution

**Prioridad:** HIGH
**Área:** `workflow.json` → bloque `connections`
**Estado:** DONE

### Problema

`Prep Log Execution` tiene lógica para manejar el "all-existing path" (cuando todos los items son duplicados y no hay items nuevos). El código verifica `invokedFromExistingCheckPath` y actúa correctamente. Pero la conexión desde `Check Existing IDs` a `Prep Log Execution` NO EXISTE en el JSON. Resultado: cuando todos los items son duplicados, no se escribe ningún `execution_log` — la tabla tiene gaps.

### Solución

Agregar una segunda conexión en el bloque `connections` de `Check Existing IDs`:

```json
"Check Existing IDs": {
  "main": [
    [
      { "node": "Filter Already Processed", "type": "main", "index": 0 },
      { "node": "Prep Log Execution", "type": "main", "index": 0 }
    ]
  ]
}
```

La lógica de deferral en `Prep Log Execution` ya maneja correctamente el caso mixto (defer si hay items nuevos, log si todo es existente).

### Archivos afectados

- `workflow.json` — bloque `connections`, key `Check Existing IDs`

---

## M06 — Reemplazar Slack webhook URL hardcodeada

**Prioridad:** MEDIUM
**Área:** `workflow.json` → nodo `Send Slack Alert`
**Estado:** DONE

### Problema

El nodo `Send Slack Alert` tiene una URL real de Slack hardcodeada: `https://hooks.slack.com/services/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`. Esto es una credencial expuesta en el repositorio.

### Solución

Reemplazar la URL con una expresión que lea de variable de entorno:
```
={{ $env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/PLACEHOLDER' }}
```

Agregar `SLACK_WEBHOOK_URL=change-me` a `.env.example`.

**Nota:** El token actual debe rotarse en Slack si el repo fue público en algún momento.

### Archivos afectados

- `workflow.json` — nodo `Send Slack Alert` (URL)
- `.env.example` — agregar `SLACK_WEBHOOK_URL`

---

## M07 — Actualizar umbrales de criticality en documentación

**Prioridad:** MEDIUM
**Área:** `docs/SYSTEM-ARCHITECTURE.md`
**Estado:** DONE

### Problema

La documentación dice:
- critical: ≥80
- high: 60-79
- medium: 30-59
- low: <30

El código real en `Classify Threat` dice:
- critical: ≥60
- high: ≥40
- medium: ≥20
- low: <20

### Solución

Actualizar la sección de umbrales en `SYSTEM-ARCHITECTURE.md` para que coincida con el código.

### Archivos afectados

- `docs/SYSTEM-ARCHITECTURE.md`

---

## M08 — Eliminar dead code (Summarize Skipped Items + slack emoji bug)

**Prioridad:** LOW
**Área:** `workflow.json` → nodos `Summarize Skipped Items` y `Build Alert Content`
**Estado:** DONE

### Problema

1. `Summarize Skipped Items` es un nodo terminal sin conexiones downstream. Su output se descarta. Solo hace `console.log()`. `Prep Log Execution` ya recalcula los mismos conteos de forma independiente.
2. En `Build Alert Content`, el emoji para high severity tiene un bug en el surrogate pair: `'\uD83D\DFE0'` — falta el `\u` en la segunda mitad. Debería ser `'\uD83D\uDFE0'` (orange circle). Esto produce texto roto en Slack (si se arregla M01).

### Solución

1. Eliminar el nodo `Summarize Skipped Items` del workflow y su conexión desde `IF Critical or High` output 1. Opcionalmente reemplazar con un Sticky Note para documentar que los items low/medium se loguean en `Prep Log Execution`.
2. Corregir el surrogate pair en `Build Alert Content`: `'\uD83D\DFE0'` → `'\uD83D\uDFE0'`.

### Archivos afectados

- `workflow.json` — nodos `Summarize Skipped Items` (eliminar), `Build Alert Content` (fix emoji), `IF Critical or High` (limpiar conexión output 1)

---

## Orden de Ejecución Recomendado

```
M07 (doc, independiente)
  → M04 (robustez DB, puede requerir init.sql)
  → M05 (conexión faltante)
  → M03 (duration tracking)
  → M02 (alert_message)
  → M08 (dead code + emoji fix)
  → M01 (Slack blocks — depende de M08 para emoji)
  → M06 (Slack webhook URL — hacer junto con M01)
```

M01 y M06 van juntos al final porque ambos tocan `Send Slack Alert`. M08 va antes de M01 porque el emoji bug en `Build Alert Content` afectaría el output de Slack blocks.

---

## Commits

```
342a5fd docs: add PLAN-008 and fix criticality thresholds in architecture doc (M07)
1ce33f5 fix(workflow): correct post-enrich pipeline bugs and robustness (M01-M06, M08)
```
