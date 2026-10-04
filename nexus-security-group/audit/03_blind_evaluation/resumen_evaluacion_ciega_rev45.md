# Resumen de Evaluación Ciega Parcial REV45

> Archivo evaluado: `para_evaluadores/Muestra_Ciega_Evaluadores_REV45.csv`  
> Referencia interna: `Muestra_Ciega_Referencia_Sistema_REV45.csv`  
> Comparación generada: `Resultados_Evaluacion_Ciega_REV45.csv`

## Alcance

Se compararon 60 registros completados por una evaluadora externa contra la referencia interna del sistema corregido por texto completo y matching por límite de palabra. La evaluación fue ciega: el archivo entregado no incluía criticidad, score, keywords ni evaluación previa del sistema.

## Completitud

| Campo | Estado |
|---|---|
| Registros evaluados | 60/60 |
| Evaluador informado | 60/60 |
| Pertinencia temática | 60/60 |
| Criticidad esperada | 60/60 |
| Confianza | 60/60 |
| Observación | 60/60 |

## Resultados principales

| Métrica | Resultado |
|---|---:|
| Pertinencia temática estricta (`si`) | 57/60 = 95,0% |
| Pertinencia temática amplia (`si` + `parcial`) | 59/60 = 98,3% |
| Acuerdo exacto de criticidad con sistema corregido | 17/60 = 28,3% |
| Acuerdo por banda de alerta (`high/critical` vs `medium/low`) | 41/60 = 68,3% |

## Distribuciones

### Pertinencia temática del evaluador

- `si`: 57
- `parcial`: 2
- `no`: 1

### Criticidad esperada por el evaluador

- `critical`: 51
- `medium`: 6
- `low`: 2
- `no_aplica`: 1

### Criticidad corregida del sistema en la muestra

- `high`: 26
- `medium`: 14
- `critical`: 13
- `low`: 7

### Confianza del evaluador

- `media`: 54
- `alta`: 6

## Interpretación metodológica

La evaluación ciega mejora la evidencia porque introduce una revisión humana que no recibió la salida del sistema. Los resultados sostienen una alta pertinencia temática de la muestra: 57 registros fueron marcados como pertinentes y 59 como pertinentes o parcialmente pertinentes.

El acuerdo exacto de criticidad es bajo/moderado porque la evaluadora tendió a clasificar muchas menciones como `critical`, mientras que el sistema corregido distribuye parte de esos casos en `high`, `medium` y `low`. Por eso conviene reportar dos lecturas: acuerdo exacto de criticidad y acuerdo por banda de alerta. La segunda lectura es más apropiada si la tesis discute capacidad de priorización amplia y no equivalencia ordinal perfecta.

## Uso recomendado en la tesis

- Presentar esta evidencia como evaluación ciega parcial, no como validación operacional completa.
- Reportar pertinencia temática estricta y amplia.
- Reportar criticidad exacta y por banda, aclarando la diferencia metodológica.
- Mantener la referencia interna separada del archivo entregado a evaluadores.
