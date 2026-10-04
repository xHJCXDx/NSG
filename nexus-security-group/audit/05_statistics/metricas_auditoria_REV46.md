# Métricas de auditoría REV46

Este informe recalcula métricas principales usando la población congelada REV46 y la matriz histórica auditada de 200 casos.

## Marco poblacional

- Población REV46: **2102 menciones**.
- Muestra auditada: **200 casos** (9.5% de la población REV46).
- Detecciones high/critical en población REV46: **1429** (68.0%).

### Población y muestra por fuente

| Fuente | Población REV46 | Muestra | Correctos | Pertinencia muestral |
|---|---:|---:|---:|---:|
| exploit-db | 50 | 10 | 10 | 100.0% |
| github | 1934 | 171 | 161 | 94.2% |
| hackernews | 118 | 19 | 19 | 100.0% |

## Pertinencia

- Pertinencia estricta de la muestra: **190/200 = 95.0%** (Wilson IC95%: 91.0%–97.3%).
- Estimador ponderado por fuente sobre población REV46: **94.6%** (bootstrap estratificado IC95%: 90.9%–97.8%).
- Sin Dependency Dashboard: **122/127 = 96.1%** (Wilson IC95%: 91.1%–98.3%).
- Solo Dependency Dashboard: **68/73 = 93.2%** (Wilson IC95%: 84.9%–97.0%).

## Falsos positivos

- Consenso: **0/200 = 0.0%**.
- Evaluador A antes del consenso: **5/200 = 2.5%**.
- Redacción recomendada: `0/200 por consenso; 5/200 = 2,5% según el evaluador A antes del consenso`.

## Criticidad conservadora

- Correcta plena: **191/195 = 97.9%** (Wilson IC95%: 94.8%–99.2%).
- Conteos conservadores: `{'correcta_plena': 191, 'incorrecta': 2, 'no_aplica': 5, 'parcial': 2}`.
- Interpretación: consistencia con el artefacto auditado entre casos evaluables; no validación independiente de severidad.

## Reproducción

- Iteraciones bootstrap: 10000.
- Semilla: 42.
- Salida estructurada: `metricas_auditoria_REV46.json`.
