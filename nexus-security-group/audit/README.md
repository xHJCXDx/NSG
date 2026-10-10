# Mapa de trazabilidad técnica — audit/

Esta carpeta reúne los artefactos de trazabilidad del prototipo ilustrativo de NSG. Su rol es documentar el trabajo de revisión realizado, preservar scripts y consultas reproducibles, y respaldar las observaciones exploratorias presentadas en el Capítulo 9 de la tesis.

`audit/` no constituye un paquete de validación operacional completa. No debe leerse como prueba de desempeño, benchmark, certificación de severidad ni evidencia de superioridad frente a analistas o plataformas maduras.

## Convención REV45 / REV46 / REV47

La tesis pasó por múltiples revisiones. **REV45** introdujo pruebas controladas y prueba de carga sintética. **REV46** reconcilió la campaña poblacional, añadió evaluación ciega multi-evaluador y corpus de contraste. **REV47** reenmarca la tesis como propuesta de diseño técnico con prototipo ilustrativo, recentrando la contribución en la arquitectura (Capítulo 8) y tratando las observaciones del prototipo (Capítulo 9) como exploratorias.

Algunos artefactos conservan nombres REV45 o REV46 por su origen histórico. En la tesis REV47 se utilizan únicamente como soporte técnico, trazabilidad u observaciones exploratorias. No se interpretan como evidencia de validación operacional completa. La versión de entrega se interpreta desde el marco REV47.

## Lectura rápida

1. Para el estado de cierre de los artefactos REV46 (que siguen vigentes como soporte), comenzar por `REV46_control_cierre.md`.
2. Para entender la evidencia base, continuar por `01_historical_audit/`.
3. Para revisar el marco poblacional, continuar con `08_campaign_reconciliation/`.
4. Para revisar mejoras de matching, controles ciegos y contraste, continuar con `02_reaudits/`, `03_blind_evaluation/` y `04_contrast_corpus/`.
5. Para reproducir cálculos y consultas del capítulo 9, revisar `05_statistics/` y `06_chapter9_support/`.
6. Para bibliografía, evidencia administrativa y pruebas controladas, revisar `09_reference_checks/`, `07_administrative_evidence/`, `load_test_rev45/` y `fault_tolerance_rev45/`.

## Mapa de carpetas

| Carpeta | Rol en REV47 | Límite explícito |
|---|---|---|
| `01_historical_audit/` | Revisión histórica no ciega (matriz REV37, contingencia/kappa). | Solo soporte exploratorio; no validación operacional. |
| `02_reaudits/` | Sensibilidad, matching y correcciones (reauditorías REV45/REV46). | Muestra límites del criterio heurístico; no convierte el trabajo en validación fuerte. |
| `03_blind_evaluation/` | Controles ciegos complementarios (parcial REV45 y multi-evaluador REV46). | Aporta cautela y contraste, no certificación independiente completa. |
| `04_contrast_corpus/` | Exploración monofuente (20 casos Hacker News). | No sostiene recall global; cobertura exploratoria acotada. |
| `05_statistics/` | Scripts de IC95%, métricas descriptivas y ablación de sentimiento. | Indicadores exploratorios, no prueba central de la tesis. |
| `06_chapter9_support/` | Consultas SQL, exportaciones de logs y soporte documental. | Respalda las observaciones del capítulo 9, no conclusiones principales. |
| `07_administrative_evidence/` | Registro de horas y constancias de participación. | Evidencia administrativa; no aporta validación técnica. |
| `08_campaign_reconciliation/` | Snapshot poblacional reconciliado (población, detecciones, alertas, logs, hashes). | Usado para ordenar la evidencia del prototipo; no es marco de validación operacional. |
| `09_reference_checks/` | Matriz de claims bibliográficos REV46. | Verifica que el estado del arte no se use para comparaciones no homogéneas. |
| `load_test_rev45/` | Logs, snapshots SQL y resumen de prueba de carga sintética. | Documenta margen de persistencia; no benchmark end-to-end. |
| `fault_tolerance_rev45/` | Escenarios controlados de fallas en servicios externos y alertas. | Tolerancia parcial documentada; no certificación de resiliencia productiva ni disponibilidad 24/7. |

## Reglas de uso

- No mover archivos entre carpetas sin actualizar este índice.
- No usar archivos de ejemplo como evidencia de funcionamiento real.
- Mantener las muestras para evaluadores separadas de la referencia del sistema.
- Documentar cada prueba con logs, estado inicial/final y un resumen interpretativo.
- Estos artefactos acompañan una propuesta de diseño técnico con prototipo ilustrativo, no una plataforma CTI operacional completa.

## Evaluación ciega REV46

La carpeta `03_blind_evaluation/rev46_new_evaluation/` incluye el paquete y los resultados de una evaluación ciega multi-evaluador:

- `protocolo_nueva_evaluacion_ciega_rev46.md`: requisitos, muestra, indicadores e interpretación.
- `instrucciones_evaluadores_nueva_rev46.md`: guía para entregar a evaluadores.
- `Muestra_Ciega_Evaluadores_REV46_Nueva.csv`: CSV ciego generado desde REV46 para completar.
- `Muestra_Ciega_Evaluadores_REV46_Nueva_Consolidada_AB.csv`: alternativa consolidada para transcribir respuestas de dos evaluadores en un único archivo sin mezclar criterios.
- `Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv`: referencia interna; no entregar a evaluadores.
- `generar_muestra_ciega_rev46_nueva.py`: regeneración determinística de la muestra.
- `extraer_respuestas_consolidadas_rev46.py`: separa el consolidado A/B en CSV individuales antes de comparar.
- `comparar_nueva_evaluacion_ciega_rev46.py`: comparación posterior de respuestas contra referencia interna y entre evaluadores.
- `checklist_nueva_evaluacion_ciega_rev46.md`: control operativo antes, durante y después de la evaluación.
- `Resultados_Nueva_Evaluacion_Ciega_REV46.csv` y `resumen_nueva_evaluacion_ciega_rev46.md`: resultados completados; deben leerse como evidencia complementaria de pertinencia amplia y cautela sobre criticidad, no como validación operacional.

## Pendientes conocidos

- Si se suman más evaluadores, preservar cada devolución por separado y regenerar la comparación agregada.
- Si se estima recall global, construir previamente un corpus multi-fuente preservado con URLs, fechas, snapshots y criterios de inclusión.
