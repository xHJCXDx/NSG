# Resumen — Nueva Evaluación Ciega REV46

## Archivos

- Comparación agregada: `Resultados_Nueva_Evaluacion_Ciega_REV46.csv`.
- Referencia interna: `Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv`.

## Métricas agregadas contra referencia interna

| Métrica | Resultado |
|---|---:|
| Evaluaciones informadas | 200 |
| Pertinencia temática estricta (`si`) | 143/200 = 71.5% |
| Pertinencia temática amplia (`si` + `parcial`) | 183/200 = 91.5% |
| Acuerdo exacto de criticidad contra sistema corregido | 52/200 = 26.0% |
| Acuerdo por banda de alerta contra sistema corregido | 122/200 = 61.0% |

## Acuerdo inter-evaluador ciego

| Par | Casos compartidos | Pertinencia exacta | Criticidad exacta | Banda de alerta |
|---|---:|---:|---:|---:|
| Tomas vs Lucas | 100 | 49/100 = 49.0% | 17/100 = 17.0% | 46/100 = 46.0% |

## κ de Cohen inter-evaluador

| Par | Pertinencia | Criticidad exacta | Banda de alerta |
|---|---:|---:|---:|
| Tomas vs Lucas | -0.078 | 0.027 | -0.009 |

## Interpretación

Esta evidencia debe presentarse como evaluación ciega complementaria. Puede fortalecer una lectura de pertinencia temática amplia, pero el bajo acuerdo inter-evaluador refuerza la cautela sobre criticidad y no constituye recall global ni validación operacional completa de severidad.
