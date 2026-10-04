# Protocolo de Corpus de Contraste REV45

> Propósito: construir un corpus pequeño, verificable y preservado para estimar cobertura exploratoria del prototipo NSG sin presentar un recall universal no demostrado.

## 1. Alcance

El corpus de contraste busca responder una pregunta acotada:

> Dado un conjunto preservado de señales técnicas públicas que estaban dentro del alcance temporal y temático de NSG, ¿cuántas fueron detectadas, parcialmente detectadas o no detectadas por el sistema?

No busca medir recall global de amenazas ni cobertura completa del ecosistema de ciberseguridad.

### Alcance seleccionado para REV45

| Campo | Decisión |
|---|---|
| Ventana temporal | 25/09/2026 18:48 UTC – 29/09/2026 15:01 UTC |
| Fuentes permitidas | GitHub Security Issues, Hacker News, Exploit-DB |
| Tamaño objetivo | 20 casos reales verificables |
| Métrica | Cobertura exploratoria, no recall global |

Esta ventana coincide con la campaña operacional evaluada en REV45. No debe ampliarse con casos posteriores sin declararlo como una validación adicional separada.

## 2. Archivo de trabajo

Completar:

`Corpus_Contraste_REV45_Template.csv`

Archivo auxiliar de trazabilidad de candidatos:

`Candidatos_Corpus_Contraste_REV45.csv`

Resumen metodológico del resultado:

`resumen_corpus_contraste_rev45.md`

Ejemplo didáctico de llenado:

`Corpus_Contraste_REV45_Ejemplo.csv`

El archivo de ejemplo **no debe usarse como evidencia**. Contiene casos ilustrativos y URLs de ejemplo para mostrar el formato esperado. El corpus real debe completarse con casos verificados manualmente.

Para REV45, los candidatos iniciales se seleccionaron desde Hacker News usando la misma consulta declarada en el workflow (`query=security`) dentro de la ventana 25/09/2026 18:48 UTC – 29/09/2026 15:01 UTC. El cruce contra salidas de NSG debe realizarse después de esta selección.

Cuando esté completo, guardar una copia con fecha:

`Corpus_Contraste_REV45_Completado_YYYY-MM-DD.csv`

## 3. Campos

| Campo | Descripción |
|---|---|
| `case_id` | Identificador estable del caso. |
| `source` | Fuente del caso: GitHub, Hacker News, Exploit-DB u otra fuente explícitamente declarada. |
| `source_url` | URL verificable. |
| `publication_date` | Fecha de publicación del caso. |
| `collection_window_start` | Inicio de ventana en la que NSG debía poder capturarlo. |
| `collection_window_end` | Fin de ventana en la que NSG debía poder capturarlo. |
| `inclusion_reason` | Por qué el caso entra en el alcance temático. |
| `expected_signal` | Señal esperada: CVE, RCE, exploit, vulnerability, phishing, malware, etc. |
| `expected_keyword_or_pattern` | Keyword o patrón por el cual razonablemente podría capturarse. |
| `should_be_detected_by_nsg` | `si`, `parcial`, `no` o `no_aplica`. |
| `detected_by_nsg` | `si`, `parcial`, `no` o `pendiente`. |
| `evidence_mention_id` | `mention_id` si fue detectado. |
| `evidence_detection_id` | `detection_id` si fue clasificado. |
| `detection_status` | Breve estado: detectado, no detectado, fuera de ventana, fuente no cubierta, duplicado, etc. |
| `reviewer_observation` | Justificación metodológica breve. |

## 4. Criterios de inclusión

Incluir casos que cumplan todos los criterios:

1. Tienen URL pública verificable.
2. Pertenecen al dominio de ciberseguridad técnica.
3. Caen dentro de una ventana temporal declarada.
4. Corresponden a una fuente monitoreada por NSG o a una fuente externa marcada explícitamente como contraste fuera de cobertura.
5. Tienen una señal esperable identificable: CVE, exploit, RCE, vulnerability, malware, phishing, etc.

## 5. Criterios de exclusión

Excluir casos si:

1. No tienen URL verificable.
2. No puede confirmarse fecha de publicación.
3. No pertenecen al dominio de ciberseguridad.
4. Fueron elegidos después de mirar primero la salida del sistema y sin criterio documentado.
5. Duplican otro caso del corpus sin aportar señal nueva.

## 6. Tamaño recomendado

Mínimo viable:

- 20 casos verificables.

Tamaño seleccionado para REV45:

- 20 casos verificables.

Recomendado:

- 30 a 50 casos.

Distribución sugerida:

| Tipo de caso | Cantidad sugerida |
|---|---:|
| Casos que deberían ser detectables por fuentes monitoreadas | 15–25 |
| Casos parcialmente detectables o ambiguos | 5–10 |
| Casos fuera de cobertura explícita | 5–10 |

## 7. Métricas exploratorias

### Regla de cruce aplicada en REV45

Para los candidatos de Hacker News, el cruce se realiza por coincidencia exacta entre:

- `source_url` del corpus: parámetro `id` de `https://news.ycombinator.com/item?id=...`;
- `external_id` en `social_mentions_full_features_REV45.csv` o `social_mentions_text_full_REV45.csv`;
- `platform = hackernews`.

Si existe `mention_id` en el export preservado, el caso se marca como detectado. Si además el `mention_id` aparece en `Matriz_Reauditoria_Matching_REV45_Texto_Completo.csv`, se consigna el `detection_id`. Si no hay coincidencia exacta por `external_id`, se marca como no detectado en el export preservado, sin inferir causalidad operacional única.

Cuando el corpus esté completo, calcular:

| Métrica | Fórmula |
|---|---|
| Cobertura estricta | detectados `si` / casos `should_be_detected_by_nsg = si` |
| Cobertura amplia | (`si` + `parcial`) / casos `should_be_detected_by_nsg in (si, parcial)` |
| No detección documentada | casos `no` con razón metodológica / total de casos esperables |
| Fuera de cobertura | casos `no_aplica` / total del corpus |

Estas métricas deben llamarse **cobertura exploratoria**, no recall global.

## 8. Redacción sugerida para la tesis

> Como control adicional de cobertura, se construyó un corpus de contraste preservado con casos técnicos públicos verificables, cada uno documentado mediante URL, fecha, criterio de inclusión y señal esperada. Este corpus no pretende estimar recall global del ecosistema de amenazas, sino ofrecer una medición exploratoria y reproducible sobre un conjunto acotado de señales que razonablemente podían estar dentro del alcance del prototipo.

## 9. Pendiente humano

El corpus requiere selección y validación manual de casos reales. No debe completarse con ejemplos inventados ni con casos elegidos únicamente porque el sistema ya los detectó.

## 10. Ejemplos de llenado

### Caso detectable positivo

| Campo | Ejemplo |
|---|---|
| `source` | Exploit-DB |
| `source_url` | URL pública del exploit |
| `inclusion_reason` | Exploit público con referencia explícita a RCE dentro de una fuente monitoreada. |
| `expected_signal` | Remote Code Execution |
| `should_be_detected_by_nsg` | `si` |
| `detected_by_nsg` | `si` si existe `mention_id` / `detection_id` asociado. |

### Caso parcialmente detectable

| Campo | Ejemplo |
|---|---|
| `source` | GitHub |
| `source_url` | Advisory o issue de seguridad |
| `inclusion_reason` | Pertenece al ecosistema GitHub, pero puede no pasar por el endpoint monitoreado. |
| `should_be_detected_by_nsg` | `parcial` |
| `detected_by_nsg` | `pendiente`, `si`, `parcial` o `no` tras verificar la base. |

### Caso fuera de cobertura

| Campo | Ejemplo |
|---|---|
| `source` | NVD |
| `source_url` | URL de CVE en NVD |
| `inclusion_reason` | CVE real, pero fuente no monitoreada directamente por NSG. |
| `should_be_detected_by_nsg` | `no_aplica` |
| `detected_by_nsg` | `no` |
| `detection_status` | `fuera_de_cobertura` |
