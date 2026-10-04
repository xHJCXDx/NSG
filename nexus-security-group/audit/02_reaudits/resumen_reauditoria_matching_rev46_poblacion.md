# Re-auditoría REV46 — Matching por límite de palabra en población completa

## Qué se recalcula

Este artefacto recalcula el componente de keywords de las **2.102 detecciones REV46** usando `text_content` completo y matching por límite de palabra. Para evitar inventar campos no congelados en la evidencia REV46, preserva el aporte no-keyword del score original:

`score_corregido = max(0, risk_score_original - puntos_keywords_originales) + puntos_keywords_corregidos`

El `max(0, ...)` evita inventar aportes negativos cuando el score original ya estaba capado a 100 y los puntos de keywords originales superaban ese valor.

Por lo tanto, el resultado mide el impacto aislado de corregir el matching por subcadena, no una nueva campaña operacional ni una nueva auditoría humana.

## Resultado cuantitativo

| Métrica | Valor |
|---|---:|
| Detecciones REV46 procesadas | 2102 |
| Registros sin población asociada | 0 |
| Cambios de nivel de criticidad | 1488 (70.8%) |
| Detecciones en banda alertable original (`high`/`critical`) | 1429 (68.0%) |
| Detecciones en banda alertable corregida (`high`/`critical`) | 539 (25.6%) |
| Salen de banda alertable con matching corregido | 890 |
| Entran a banda alertable con matching corregido | 0 |
| Registros con `rce` original | 1510 |
| Registros con `rce` confirmado con límite de palabra | 30 |

## Distribución de criticidad

| Criticidad | Original REV46 | Corregida word-boundary |
|---|---:|---:|
| Critical | 732 | 131 |
| High | 697 | 408 |
| Medium | 491 | 993 |
| Low | 182 | 570 |

## Banda alertable por fuente

| Fuente | Alertable original | Alertable corregida |
|---|---:|---:|
| github | 1404 | 522 |
| hackernews | 12 | 5 |
| exploit-db | 13 | 12 |

## Interpretación metodológica

El recálculo muestra cuánto depende la criticidad poblacional de keywords detectadas por subcadena, especialmente `rce`. La caída de la banda alertable debe interpretarse como reducción de ruido inducido por matching laxo. No valida severidad operacional independiente y no reemplaza una campaña nueva con el workflow corregido ejecutándose de punta a punta.

## Artefactos

- Resultado fila a fila: `Matriz_Reauditoria_Matching_REV46_Poblacion.csv`.
- Métricas estructuradas: `metricas_reauditoria_matching_rev46_poblacion.json`.
- SHA-256 CSV: `04220db42ad6fa71a5d83ece897bfd6bd412747b7c2d05303b3e1495c1f19271`.
