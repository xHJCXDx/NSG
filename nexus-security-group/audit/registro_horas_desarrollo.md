# Registro de Horas de Desarrollo y Mantenimiento — NSG

> **Período**: Noviembre 2025 – Septiembre 2026
> **Total estimado**: ~180 horas
> **Método de estimación**: Desglose por área funcional a partir de los 264 commits del repositorio (único contribuyente: Hiro Cruz). Las horas por commit varían según complejidad: features complejos (~1,5–2h), fixes y docs (~0,5–1h), chore/refactor (~0,3–0,5h). Los totales por área se ajustaron para sumar ~180h declaradas.
> **Repositorio**: https://github.com/xHJCXDx/NSG.git

---

## Desglose por Área Funcional

| Área | Horas estimadas | Commits asociados | Descripción |
|------|-----------------|-------------------|-------------|
| Backend (FastAPI) | 40h | ~24 commits | API REST, autenticación JWT, RBAC dinámico, endpoints CRUD, rate limiting, middlewares de seguridad |
| Frontend (React) | 40h | ~58 commits | Dashboard, analytics, gestión de alertas/threats/keywords/users, TanStack Query, Recharts, Tailwind |
| Workflows (n8n) | 20h | ~8 commits | Pipeline OSINT de 35 nodos, integración 3 APIs, clasificación, sentimiento, alertado Slack/Gmail |
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

1. La concentración de commits en septiembre 2026 (~82% del total) refleja el sprint final de desarrollo, validación operacional y preparación de la entrega. Los meses intermedios (enero, mayo, junio, agosto) no registran commits, correspondiendo a períodos de cursado académico y planificación sin código.

2. Las horas de **escritura de la tesis** (capítulos teóricos, marco legal, análisis de resultados) no se contabilizan en este registro, que cubre exclusivamente el desarrollo técnico del sistema. La redacción se realizó en paralelo en archivos markdown fuera del repositorio.

3. El cálculo de **mantenimiento proyectado** (8h/mes, USD 1.920/año en §9.4) se basa en las tareas realizadas durante el período operacional: monitoreo de ejecuciones, resolución de errores, ajustes de configuración y revisión de alertas.

4. La tarifa profesional local moderada de USD 40/h aplicada en el costeo (§9.4) resulta en un costo de desarrollo de USD 7.200, amortizado a 10 años → USD 720/año.
