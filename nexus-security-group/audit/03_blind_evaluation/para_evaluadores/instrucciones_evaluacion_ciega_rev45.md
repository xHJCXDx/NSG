# Instrucciones para Evaluación Ciega Parcial REV45

## Archivos

- `Muestra_Ciega_Evaluadores_REV45.csv`: archivo para entregar a evaluadores.
- `Muestra_Ciega_Referencia_Sistema_REV45.csv`: archivo de referencia interna del sistema. No entregar a evaluadores.

## Tamaño y composición

La muestra contiene 60 registros.

Distribución según criticidad corregida del sistema —oculta para evaluadores—:

| Criticidad corregida | Cantidad |
|---|---:|
| critical | 13 |
| high | 26 |
| medium | 14 |
| low | 7 |

## Instrucciones para evaluadores

Completar las columnas vacías:

- `evaluador`: nombre o código del evaluador.
- `pertinencia_tematica`: `si`, `parcial` o `no`.
- `criticidad_esperada`: `critical`, `high`, `medium`, `low` o `no_aplica`.
- `confianza_evaluador`: `alta`, `media` o `baja`.
- `observacion`: justificación breve, especialmente si la pertinencia es parcial/no o si la criticidad no aplica.

## Regla metodológica

Los evaluadores no deben ver la criticidad, score, keywords ni evaluación previa del sistema antes de completar su revisión.
