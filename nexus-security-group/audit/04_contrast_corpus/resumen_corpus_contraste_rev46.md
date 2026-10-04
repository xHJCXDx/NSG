# Resumen metodológico — Corpus de contraste REV46

## Propósito

Este artefacto actualiza el corpus exploratorio de Hacker News contra la población congelada REV46. A diferencia de REV45, el cruce ya no se hace contra exports parciales de 200 registros, sino contra `audit/08_campaign_reconciliation/poblacion_campana_REV46.csv`.

## Alcance

| Campo | Decisión |
|---|---|
| Ventana temporal REV46 | 25/09/2026 18:48 UTC – 29/09/2026 19:31:05 UTC |
| Fuente usada para el corpus | Hacker News |
| Tamaño del corpus | 20 casos reales verificables |
| Archivo de resultado | `Corpus_Contraste_REV46.csv` |
| Hash SHA-256 del resultado | `bced9302a75cf883802ddc040d211fe3627b1a2787d6f666ba5a4e73c3cd708b` |

## Regla de cruce

Cada caso se cruzó por coincidencia exacta entre el parámetro `id` de la URL de Hacker News y `external_id` en la población completa REV46, restringida a `platform = hackernews`. Luego se verificó si el `mention_id` tenía detección asociada en `detecciones_campana_REV46.csv` y alerta asociada en `alertas_campana_REV46.csv`.

## Resultados

| Métrica | Resultado | Interpretación |
|---|---:|---|
| Casos capturados en población REV46 | 20/20 = 100.0% | Coincidencia exacta por `external_id` en población completa congelada. |
| Casos detectados por NSG | 20/20 = 100.0% | Casos capturados con detección asociada. |
| Casos alertados por NSG | 2/20 = 10.0% | Casos capturados con alerta persistida. |
| Casos esperables (`si`) detectados | 15/15 = 100.0% | Lectura estricta sobre casos marcados como esperables. |
| Casos parciales detectados | 5/5 = 100.0% | Lectura sobre casos de detectabilidad parcial. |
| No encontrados en población REV46 | 0/20 = 0.0% | Ausencia comprobada contra la población congelada, no solo contra muestra parcial. |

Casos capturados/detectados/alertados:

| case_id | external_id | mention_id | detection_id | criticality | URL |
|---|---:|---:|---:|---|---|
| REV46-CONTRAST-001 | 49848424 | 151 | 151 | medium | https://news.ycombinator.com/item?id=49848424 |
| REV46-CONTRAST-002 | 49850829 | 261 | 261 | low | https://news.ycombinator.com/item?id=49850829 |
| REV46-CONTRAST-003 | 49855344 | 258 | 258 | medium | https://news.ycombinator.com/item?id=49855344 |
| REV46-CONTRAST-004 | 49856964 | 255 | 255 | medium | https://news.ycombinator.com/item?id=49856964 |
| REV46-CONTRAST-005 | 49858854 | 253 | 253 | low | https://news.ycombinator.com/item?id=49858854 |
| REV46-CONTRAST-006 | 49859087 | 252 | 252 | low | https://news.ycombinator.com/item?id=49859087 |
| REV46-CONTRAST-007 | 49860383 | 249 | 249 | low | https://news.ycombinator.com/item?id=49860383 |
| REV46-CONTRAST-008 | 49861517 | 247 | 247 | medium | https://news.ycombinator.com/item?id=49861517 |
| REV46-CONTRAST-009 | 49867267 | 727 | 727 | medium | https://news.ycombinator.com/item?id=49867267 |
| REV46-CONTRAST-010 | 49868561 | 726 | 726 | low | https://news.ycombinator.com/item?id=49868561 |
| REV46-CONTRAST-011 | 49870848 | 723 | 723 | medium | https://news.ycombinator.com/item?id=49870848 |
| REV46-CONTRAST-012 | 49873005 | 825 | 825 | medium | https://news.ycombinator.com/item?id=49873005 |
| REV46-CONTRAST-013 | 49874737 | 822 | 822 | medium | https://news.ycombinator.com/item?id=49874737 |
| REV46-CONTRAST-014 | 49875297 | 820 | 820 | high | https://news.ycombinator.com/item?id=49875297 |
| REV46-CONTRAST-015 | 49876188 | 819 | 819 | low | https://news.ycombinator.com/item?id=49876188 |
| REV46-CONTRAST-016 | 49878479 | 813 | 813 | low | https://news.ycombinator.com/item?id=49878479 |
| REV46-CONTRAST-017 | 49878918 | 812 | 812 | low | https://news.ycombinator.com/item?id=49878918 |
| REV46-CONTRAST-018 | 49879880 | 809 | 809 | critical | https://news.ycombinator.com/item?id=49879880 |
| REV46-CONTRAST-019 | 49886609 | 1078 | 1078 | medium | https://news.ycombinator.com/item?id=49886609 |
| REV46-CONTRAST-020 | 49891411 | 1243 | 1244 | low | https://news.ycombinator.com/item?id=49891411 |

## Interpretación

El resultado sigue siendo **cobertura exploratoria acotada**, no recall global. La mejora metodológica es que las ausencias ya fueron verificadas contra la población completa REV46 congelada, no contra un export parcial de 200 registros. Aun así, el corpus es pequeño, monofuente y construido como control posterior; por eso no permite inferir cobertura multi-fuente ni sensibilidad global del sistema.

En este cruce REV46 no quedaron ausencias: los 20 `external_id` aparecen en la población congelada y tienen detección asociada. Solo 2/20 generaron alerta porque el workflow alerta únicamente `critical` o `high`; los demás fueron capturados y clasificados como `medium` o `low`.

## Reproducción

- Población usada: `audit/08_campaign_reconciliation/poblacion_campana_REV46.csv`.
- Detecciones usadas: `audit/08_campaign_reconciliation/detecciones_campana_REV46.csv`.
- Alertas usadas: `audit/08_campaign_reconciliation/alertas_campana_REV46.csv`.
- Resultado: `audit/04_contrast_corpus/Corpus_Contraste_REV46.csv`.
