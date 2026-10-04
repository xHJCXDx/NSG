# Nueva evaluación ciega REV46 — paquete y resultados

Este directorio contiene el paquete usado para ejecutar una nueva evaluación ciega multi-evaluador sobre la muestra REV46 y los resultados comparados. La evidencia debe interpretarse como complemento metodológico: aporta trazabilidad sobre pertinencia temática amplia y variabilidad humana, pero no valida severidad operacional ni recall global.

## Uso rápido

1. Paquete entregable original para cada evaluador:
   - `Muestra_Ciega_Evaluadores_REV46_Nueva.csv`
   - `instrucciones_evaluadores_nueva_rev46.md`
2. Las respuestas finales fueron transcriptas en `Muestra_Ciega_Evaluadores_REV46_Nueva_Consolidada_AB.csv`, cuidando que cada evaluador no vea las respuestas del otro.
3. Para regenerar CSV individuales desde el consolidado, ejecutar:

```bash
python nexus-security-group/audit/03_blind_evaluation/rev46_new_evaluation/extraer_respuestas_consolidadas_rev46.py
```

4. Para regenerar la comparación contra la referencia interna:

```bash
python nexus-security-group/audit/03_blind_evaluation/rev46_new_evaluation/comparar_nueva_evaluacion_ciega_rev46.py \
  nexus-security-group/audit/03_blind_evaluation/rev46_new_evaluation/Respuestas_Evaluador_A_REV46_Nueva.csv \
  nexus-security-group/audit/03_blind_evaluation/rev46_new_evaluation/Respuestas_Evaluador_B_REV46_Nueva.csv
```

## Archivos

| Archivo | Uso |
|---|---|
| `protocolo_nueva_evaluacion_ciega_rev46.md` | Requisitos, muestra, métricas e interpretación. |
| `instrucciones_evaluadores_nueva_rev46.md` | Guía para entregar a evaluadores. |
| `checklist_nueva_evaluacion_ciega_rev46.md` | Control operativo antes, durante y después. |
| `Muestra_Ciega_Evaluadores_REV46_Nueva.csv` | CSV ciego para completar. |
| `Muestra_Ciega_Evaluadores_REV46_Nueva_Consolidada_AB.csv` | Plantilla consolidada A/B para transcripción controlada. |
| `Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv` | Referencia interna; no entregar. |
| `Respuestas_Evaluador_A_REV46_Nueva.csv` | Respuestas extraídas del consolidado para el evaluador A. |
| `Respuestas_Evaluador_B_REV46_Nueva.csv` | Respuestas extraídas del consolidado para el evaluador B. |
| `Resultados_Nueva_Evaluacion_Ciega_REV46.csv` | Comparación agregada contra referencia interna y por evaluador. |
| `resumen_nueva_evaluacion_ciega_rev46.md` | Métricas agregadas e interpretación. |
| `generar_muestra_ciega_rev46_nueva.py` | Regenera la muestra con semilla fija. |
| `extraer_respuestas_consolidadas_rev46.py` | Divide el consolidado A/B en CSV individuales. |
| `comparar_nueva_evaluacion_ciega_rev46.py` | Calcula métricas contra referencia interna y acuerdo entre evaluadores. |
| `manifest_muestra_ciega_rev46_nueva.md` | Parámetros de generación de la muestra. |

## Regla crítica

El archivo de referencia interna y las respuestas de otros evaluadores no deben estar visibles durante la revisión. Si esa regla se rompe, la evaluación deja de ser ciega.

## Resultado sintético

- Pertinencia temática estricta: 143/200 = 71,5%.
- Pertinencia temática amplia: 183/200 = 91,5%.
- Acuerdo exacto de criticidad contra sistema corregido: 52/200 = 26,0%.
- Acuerdo por banda contra sistema corregido: 122/200 = 61,0%.
- Acuerdo inter-evaluador bajo: κ_pertinencia = -0,078; κ_criticidad = 0,027; κ_banda = -0,009.

La lectura correcta es conservadora: la evaluación sostiene utilidad como prefiltrado temático amplio, pero refuerza que la criticidad no debe presentarse como severidad operacional validada.
