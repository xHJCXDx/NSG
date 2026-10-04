# Índice de evidencias de auditoría REV45

Esta carpeta reúne las evidencias usadas para sustentar la validación académica de NSG en REV45. La organización separa evidencia histórica, reauditorías, evaluación ciega, pruebas estadísticas, soporte del capítulo 9 y pruebas operativas controladas.

## Lectura rápida

1. Para entender la evidencia base, comenzar por `01_historical_audit/`.
2. Para revisar mejoras de matching y contraste, continuar con `02_reaudits/`, `03_blind_evaluation/` y `04_contrast_corpus/`.
3. Para validar cálculos y soporte del capítulo 9, revisar `05_statistics/` y `06_chapter9_support/`.
4. Para evidencia operativa adicional, revisar `load_test_rev45/` y `fault_tolerance_rev45/`.
5. Para constancias no técnicas, revisar `07_administrative_evidence/`.

## Mapa de carpetas

| Carpeta | Contenido | Uso principal |
|---|---|---|
| `01_historical_audit/` | Matriz REV37 y tabla de contingencia/kappa históricas. | Evidencia base previa a los ajustes REV45. |
| `02_reaudits/` | Reauditorías REV45, exportaciones completas y scripts de matching. | Comparar resultados históricos contra criterios de matching más estrictos o completos. |
| `03_blind_evaluation/` | Muestra para evaluadores, referencia del sistema e instrucciones. | Ejecutar o documentar la evaluación ciega pendiente. |
| `04_contrast_corpus/` | Plantilla, ejemplo y protocolo del corpus de contraste. | Preparar evidencia complementaria sin mezclar ejemplos didácticos con evidencia real. |
| `05_statistics/` | Scripts de intervalo de confianza y ablación de sentimiento. | Reproducir cálculos estadísticos de apoyo. |
| `06_chapter9_support/` | Consultas SQL y exportaciones de logs. | Respaldar afirmaciones del capítulo 9. |
| `07_administrative_evidence/` | Registro de horas y constancias de participación. | Mantener evidencias administrativas separadas de la validación técnica. |
| `load_test_rev45/` | Logs, snapshots SQL y resumen de prueba de carga sintética. | Documentar la prueba de inserción/persistencia en PostgreSQL. |
| `fault_tolerance_rev45/` | Escenarios controlados de fallas en servicios externos y alertas. | Documentar tolerancia parcial a fallas sin afirmar disponibilidad 24/7. |

## Reglas de uso

- No mover archivos entre carpetas sin actualizar este índice.
- No usar archivos de ejemplo como evidencia empírica real.
- Mantener las muestras para evaluadores separadas de la referencia del sistema.
- Documentar cada prueba operativa con logs, estado inicial/final y un resumen interpretativo.
- Evitar lenguaje de sobrevalidación: estas evidencias sustentan un prototipo académico de prefiltrado OSINT, no una plataforma CTI operacional completa.

## Pendientes conocidos

- Completar la evaluación ciega cuando los evaluadores devuelvan sus resultados.
- Integrar cualquier resultado nuevo al plan de mejora REV45 antes de elevar conclusiones.
