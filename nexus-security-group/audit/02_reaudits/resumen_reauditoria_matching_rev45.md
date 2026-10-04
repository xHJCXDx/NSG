# Resumen de Re-auditoría Complementaria REV45 — Matching por Límite de Palabra

> Fuente: `01_historical_audit/Matriz_Auditoria_Fase2_REV37.csv`  
> Salida: `Matriz_Reauditoria_Matching_REV45.csv`  
> Alcance: recálculo parcial/conservador sobre `text_excerpt` preservado.

## Resultado cuantitativo

| Métrica | Valor |
|---|---:|
| Registros procesados | 200 |
| Cambios de criticidad sobre extracto preservado | 154 |
| Alertas high/critical originales | 129 |
| Alertas high/critical recalculadas sobre extracto | 12 |
| Registros con `rce` original | 131 |
| Registros con `rce` confirmado en extracto preservado | 1 |

## Interpretación metodológica

Esta re-auditoría no reproduce completamente el pipeline original porque la matriz preserva `text_excerpt` truncado, no el campo completo `social_mentions.text_content`. Por lo tanto, los resultados deben describirse como una estimación parcial y conservadora del impacto del matching corregido.

El valor académico está en mostrar trazabilidad: la matriz histórica se conserva, el problema de matching por subcadena se reconoce, y se agrega una medición complementaria reproducible sobre la evidencia preservada.
