# Evaluación ciega

Esta carpeta separa la evaluación ciega parcial ejecutada en REV45 de la nueva evaluación ciega REV46 multi-evaluador.

## Evidencia REV45 preservada

| Archivo | Uso |
|---|---|
| `Muestra_Ciega_Evaluadores_REV45.csv` | Respuestas completadas por la evaluadora en la evaluación ciega parcial. |
| `Muestra_Ciega_Referencia_Sistema_REV45.csv` | Referencia interna del sistema corregido; no fue entregada durante la evaluación. |
| `Resultados_Evaluacion_Ciega_REV45.csv` | Comparación entre respuestas humanas y referencia interna. |
| `resumen_evaluacion_ciega_rev45.md` | Resumen metodológico y métricas agregadas. |
| `generar_muestra_ciega_rev45.py` | Generador histórico de la muestra REV45. |

## Evaluación REV46 multi-evaluador

El paquete y los resultados de la nueva evaluación ciega multi-evaluador están en:

- `rev46_new_evaluation/`

Ese directorio contiene muestra, instrucciones, protocolo, respuestas consolidadas, resultados y resumen. Su lectura debe ser conservadora: aporta evidencia complementaria de pertinencia amplia y variabilidad humana, no validación operacional de severidad.

## Regla de independencia

- La referencia interna nunca debe entregarse a evaluadores.
- Si se usa un consolidado A/B, cada evaluador debe responder sin ver la respuesta del otro.
- Los resultados nuevos solo deben integrarse a la tesis después de recibir respuestas y ejecutar la comparación.
