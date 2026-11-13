# Estimación Retrospectiva de Horas de Desarrollo y Mantenimiento — NSG

> **Corrección (13/11/2026):** se corrigieron el importe de mantenimiento, el costo de desarrollo que usa la tesis (150 h), el conteo de nodos del pipeline, las referencias a un «§9.4» inexistente y la mención de una validación operacional que no se hizo. La versión anterior queda en el historial del repositorio (commit `263d026`).

> **Período**: Noviembre 2025 – Septiembre 2026
> **Total estimado**: ~180 horas
> **Método de estimación**: Desglose retrospectivo por área funcional a partir de los 264 commits del repositorio (único contribuyente: Hiro Cruz). Las horas por commit varían según complejidad: features complejos (~1,5–2h), fixes y docs (~0,5–1h), chore/refactor (~0,3–0,5h). Los totales por área se ajustaron para sumar ~180h declaradas.
> **Alcance**: Este documento no constituye time tracking primario medido durante el desarrollo. Es una estimación retrospectiva trazable para costeo académico, apoyada en historial de commits y agrupación funcional.
> **Repositorio**: https://github.com/xHJCXDx/NSG.git

---

## Desglose por Área Funcional

| Área | Horas estimadas | Commits asociados | Descripción |
|------|-----------------|-------------------|-------------|
| Backend (FastAPI) | 40h | ~24 commits | API REST, autenticación JWT, RBAC dinámico, endpoints CRUD, rate limiting, middlewares de seguridad |
| Frontend (React) | 40h | ~58 commits | Dashboard, analytics, gestión de alertas/threats/keywords/users, TanStack Query, Recharts, Tailwind |
| Workflows (n8n) | 20h | ~8 commits | Pipeline OSINT de 41 nodos, integración 3 APIs, clasificación, sentimiento, alertado Slack/Gmail |
| Infraestructura | 20h | ~33 commits | Docker Compose, Traefik, PostgreSQL dual, Sentiment API Flask, configuración de entornos |
| Testing | 10h | ~17 commits | Tests backend (pytest), tests frontend (Vitest), prueba de carga sintética |
| Documentación | 30h | ~42 commits | Tesis REV1–REV42, arquitectura, guiones, planes, auditoría |
| Refactoring | 10h | ~15 commits | Reorganización de código, limpieza de residuos, migración de esquemas |
| Auditoría y validación | 10h | ~10 commits | Matriz de auditoría, scripts de bootstrap/ablación, consultas SQL, exportación de logs |
| **Total** | **~180h** | **264 commits** | |

---

## Distribución Temporal

| Mes | Commits | Horas estimadas | Actividad principal |
|-----|---------|-----------------|---------------------|
| Nov 2025 | 2 | ~3h | Setup inicial del repositorio e infraestructura Docker |
| Dic 2025 | 27 | ~25h | Desarrollo inicial: backend, workflow, esquema de base de datos |
| Feb 2026 | 2 | ~3h | Ajustes de infraestructura |
| Mar 2026 | 3 | ~4h | Iteración sobre features |
| Abr 2026 | 1 | ~1h | Mantenimiento menor |
| Jul 2026 | 13 | ~15h | Frontend, documentación, infraestructura |
| Sep 2026 | 216 | ~129h | Sprint final: RBAC completo, analytics, prueba de carga, auditoría manual, correcciones de tesis |

---

## Notas

1. La concentración de commits en septiembre 2026 (~82% del total) refleja el sprint final de desarrollo, pruebas y preparación de la entrega. Los meses intermedios (enero, mayo, junio, agosto) no registran commits, correspondiendo a períodos de cursado académico y planificación sin código. La ausencia de commits en esos meses no permite medir horas de planificación no codificadas.

2. Las horas de **escritura de la tesis** (capítulos teóricos, marco legal, análisis de resultados) no se contabilizan en este registro, que cubre exclusivamente el desarrollo técnico del sistema. La redacción se realizó en paralelo en archivos markdown fuera del repositorio.

3. El **mantenimiento proyectado** (8 h/mes = 96 h/año; USD 3.840/año a USD 40/h; Anexo G de la tesis) es un supuesto del autor, basado en las tareas de mantenimiento hechas durante el desarrollo y las pruebas: monitoreo de ejecuciones, resolución de errores, ajustes de configuración y revisión de avisos. No es una medición.

4. La tarifa de USD 40/h es un supuesto del autor. El costeo de la tesis (Anexo G) la aplica a 150 h de desarrollo técnico: las 180 h menos las 30 h de Documentación, que la nota 2 excluye. Resultado: USD 6.000, amortizados a 10 años → USD 600/año.
