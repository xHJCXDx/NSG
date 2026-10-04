# Índice de evidencias de auditoría REV46

Esta carpeta reúne las evidencias usadas para sustentar la validación académica de NSG hasta REV46. La organización separa evidencia histórica, reauditorías, evaluación ciega, pruebas estadísticas, reconciliación de campaña, soporte del capítulo 9 y pruebas operativas controladas.

## Lectura rápida

1. Para estado de cierre, comenzar por `REV46_control_cierre.md`.
2. Para entender la evidencia base, continuar por `01_historical_audit/`.
3. Para revisar el marco poblacional REV46, continuar con `08_campaign_reconciliation/`.
4. Para revisar mejoras de matching, evaluación ciega y contraste, continuar con `02_reaudits/`, `03_blind_evaluation/` y `04_contrast_corpus/`.
5. Para validar cálculos y soporte del capítulo 9, revisar `05_statistics/` y `06_chapter9_support/`.
6. Para bibliografía, evidencia administrativa y pruebas operativas, revisar `09_reference_checks/`, `07_administrative_evidence/`, `load_test_rev45/` y `fault_tolerance_rev45/`.

## Mapa de carpetas

| Carpeta | Contenido | Uso principal |
|---|---|---|
| `01_historical_audit/` | Matriz REV37 y tabla de contingencia/kappa históricas. | Evidencia base previa a los ajustes REV45. |
| `02_reaudits/` | Reauditorías REV45/REV46, exportaciones completas y scripts de matching. | Comparar resultados históricos contra criterios de matching más estrictos o completos. |
| `03_blind_evaluation/` | Evaluación ciega parcial REV45 preservada y evaluación ciega REV46 multi-evaluador en subcarpeta. | Documentar controles ciegos complementarios y sus límites. |
| `04_contrast_corpus/` | Plantilla, protocolo y recálculo REV46 del corpus de contraste exploratorio. | Preservar cobertura exploratoria acotada sin presentarla como recall global. |
| `05_statistics/` | Scripts de intervalo de confianza, métricas REV46 y ablación de sentimiento. | Reproducir cálculos estadísticos de apoyo. |
| `06_chapter9_support/` | Consultas SQL y exportaciones de logs. | Respaldar afirmaciones del capítulo 9. |
| `07_administrative_evidence/` | Registro de horas y constancias de participación. | Mantener evidencias administrativas separadas de la validación técnica. |
| `08_campaign_reconciliation/` | Población, detecciones, alertas, logs, incidencias, consultas y hashes REV46. | Congelar el marco poblacional reconciliado usado por la tesis REV46. |
| `09_reference_checks/` | Matriz de claims bibliográficos REV46. | Verificar que el estado del arte no se use para comparaciones no homogéneas. |
| `load_test_rev45/` | Logs, snapshots SQL y resumen de prueba de carga sintética. | Documentar la prueba de inserción/persistencia en PostgreSQL. |
| `fault_tolerance_rev45/` | Escenarios controlados de fallas en servicios externos y alertas. | Documentar tolerancia parcial a fallas sin afirmar disponibilidad 24/7. |

## Reglas de uso

- No mover archivos entre carpetas sin actualizar este índice.
- No usar archivos de ejemplo como evidencia empírica real.
- Mantener las muestras para evaluadores separadas de la referencia del sistema.
- Documentar cada prueba operativa con logs, estado inicial/final y un resumen interpretativo.
- Evitar lenguaje de sobrevalidación: estas evidencias sustentan un prototipo académico de prefiltrado OSINT, no una plataforma CTI operacional completa.

## Nueva evaluación ciega REV46

La carpeta `03_blind_evaluation/rev46_new_evaluation/` incluye el paquete y los resultados de una nueva evaluación ciega multi-evaluador:

- `protocolo_nueva_evaluacion_ciega_rev46.md`: requisitos, muestra, métricas e interpretación.
- `instrucciones_evaluadores_nueva_rev46.md`: guía para entregar a evaluadores.
- `Muestra_Ciega_Evaluadores_REV46_Nueva.csv`: CSV ciego generado desde REV46 para completar.
- `Muestra_Ciega_Evaluadores_REV46_Nueva_Consolidada_AB.csv`: alternativa consolidada para transcribir respuestas de dos evaluadores en un único archivo sin mezclar criterios.
- `Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv`: referencia interna; no entregar a evaluadores.
- `generar_muestra_ciega_rev46_nueva.py`: regeneración determinística de la muestra.
- `extraer_respuestas_consolidadas_rev46.py`: separa el consolidado A/B en CSV individuales antes de comparar.
- `comparar_nueva_evaluacion_ciega_rev46.py`: comparación posterior de respuestas contra referencia interna y entre evaluadores.
- `checklist_nueva_evaluacion_ciega_rev46.md`: control operativo antes, durante y después de la evaluación.
- `Resultados_Nueva_Evaluacion_Ciega_REV46.csv` y `resumen_nueva_evaluacion_ciega_rev46.md`: resultados completados; deben leerse como evidencia complementaria de pertinencia amplia y cautela sobre criticidad.

## Pendientes conocidos

- Si se suman más evaluadores, preservar cada devolución por separado y regenerar la comparación agregada.
- Si se estima recall global, construir previamente un corpus multi-fuente preservado con URLs, fechas, snapshots y criterios de inclusión.
