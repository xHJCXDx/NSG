# Resumen metodológico — Corpus de contraste REV45

## Propósito

Este corpus de contraste preservado se construyó como control exploratorio posterior para estimar cobertura acotada del prototipo NSG sobre un conjunto pequeño de señales públicas verificables. No reemplaza la auditoría manual estratificada, la re-auditoría full-text ni la evaluación ciega parcial; las complementa con una verificación limitada de casos esperables frente a los exports preservados del sistema.

## Alcance

| Campo | Decisión |
|---|---|
| Ventana temporal | 25/09/2026 18:48 UTC – 29/09/2026 15:01 UTC |
| Fuente usada para el corpus | Hacker News |
| Consulta de selección | Algolia `search_by_date` con `query=security` |
| Tamaño del corpus | 20 casos reales verificables |
| Métrica reportada | Cobertura exploratoria |

La selección se limitó a Hacker News porque permite reconstruir candidatos mediante `objectID`, fecha de publicación y URL pública estable dentro de la ventana operacional evaluada. Los casos se seleccionaron antes de consultar las salidas preservadas de NSG para reducir sesgo retrospectivo.

## Artefactos preservados

| Artefacto | Descripción |
|---|---|
| `Corpus_Contraste_REV45_Template.csv` | Corpus completo con URL, fecha, criterio de inclusión, señal esperada, resultado de cruce y observación metodológica. |
| `Candidatos_Corpus_Contraste_REV45.csv` | Listado auxiliar de candidatos con título y criterio de selección. |
| `protocolo_corpus_contraste_rev45.md` | Protocolo de campos, criterios y regla de cruce. |

## Regla de cruce

Cada caso de Hacker News se cruzó contra los exports preservados de NSG mediante coincidencia exacta entre:

- `platform = hackernews`;
- `external_id` en `social_mentions_full_features_REV45.csv` / `social_mentions_text_full_REV45.csv`;
- el parámetro `id` de la URL `https://news.ycombinator.com/item?id=...`.

Cuando el `mention_id` detectado también apareció en `Matriz_Reauditoria_Matching_REV45_Texto_Completo.csv`, se registró el `detection_id` correspondiente.

## Resultados

| Métrica | Resultado | Interpretación |
|---|---:|---|
| Casos detectados exactos | 3/20 = 15,0% | Casos del corpus encontrados por `external_id` en exports preservados. |
| Cobertura estricta | 2/15 = 13,3% | Casos esperables (`should_be_detected_by_nsg = si`) detectados. |
| Cobertura amplia | 3/20 = 15,0% | Casos esperables o parciales detectados. |
| No detección documentada | 17/20 = 85,0% | Casos sin coincidencia exacta en exports preservados. |
| Fuera de cobertura | 0/20 = 0,0% | No se incluyeron casos `no_aplica` en esta versión acotada. |

Casos detectados:

| case_id | mention_id | detection_id | URL |
|---|---:|---:|---|
| REV45-CONTRAST-013 | 822 | 822 | https://news.ycombinator.com/item?id=49874737 |
| REV45-CONTRAST-014 | 820 | 820 | https://news.ycombinator.com/item?id=49875297 |
| REV45-CONTRAST-020 | 1243 | 1244 | https://news.ycombinator.com/item?id=49891411 |

## Interpretación

Estos valores deben interpretarse como cobertura exploratoria sobre un corpus pequeño, preservado y acotado a Hacker News. No constituyen recall global del sistema ni una validación multi-fuente de cobertura.

Las no detecciones no deben atribuirse automáticamente a falla semántica del clasificador. También pueden explicarse por:

- operación intermitente durante la campaña;
- timing de ejecución del workflow;
- ranking o paginación de Algolia;
- límite de 50 resultados por consulta;
- deduplicación por `(platform, external_id)`;
- cambios de disponibilidad o indexación de la fuente.

## Conclusión

El corpus mejora la trazabilidad metodológica porque preserva casos, criterios y resultados de cruce. Sin embargo, por su tamaño, fuente única y construcción posterior, solo debe presentarse como control exploratorio de cobertura. Una estimación robusta de recall requeriría un corpus más amplio, multi-fuente, preregistrado o seleccionado por evaluadores independientes, con snapshots preservados del contenido fuente.
