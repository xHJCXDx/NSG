# Plan de Modificación — Release 1.0

## Objetivo

Ordenar el avance del proyecto NSG hacia una primera versión estable del dashboard operativo, priorizando arquitectura limpia, seguridad básica, usuarios del sistema, trazabilidad mínima y documentación consistente.

Este plan es la guía de trabajo para avanzar por partes. No se agregan funcionalidades por impulso: primero se estabiliza lo existente, después se amplía. Es así de fácil.

## Estado de partida

El proyecto ya cuenta con una base funcional compuesta por:

- Frontend React/Vite/TypeScript/Tailwind.
- Dashboard API en FastAPI.
- PostgreSQL como almacenamiento principal.
- n8n como orquestador de workflows OSINT.
- Sentiment API como microservicio de análisis NLP.
- Autenticación JWT básica.
- Estructura frontend orientada a features.
- Refactor backend iniciado hacia modelos ORM, schemas Pydantic y routers separados.

También existe trabajo en curso sin cerrar completamente sobre:

- Separación de responsabilidades en `frontend/src/app/` y `frontend/src/features/auth/`.
- Feature `users` en frontend.
- Router/model/schema de usuarios en backend.
- Ajustes en autenticación, inicialización SQL y tests.
- Auditoría pendiente del resto de carpetas bajo `frontend/src/features/`.

## Principios de Release 1.0

1. **Estabilidad antes que amplitud**: no sumar features nuevas si rompen la base.
2. **Arquitectura por límites claros**: `app` compone, `features` encapsulan casos de uso, `shared` contiene utilidades reutilizables.
3. **Backend con contratos explícitos**: routers con `response_model`, schemas Pydantic y acceso a datos consistente.
4. **Seguridad mínima real**: JWT, usuarios persistidos, secretos fuera del código y rutas protegidas.
5. **Documentación sincronizada con código**: cada avance relevante debe quedar reflejado en `docs/`.
6. **Verificación incremental**: cada bloque debe poder revisarse sin mezclar veinte temas distintos.

## Alcance funcional

### Incluido

- Login con JWT funcionando contra backend.
- Usuario administrador inicial persistido o claramente inicializable.
- CRUD/listado básico de usuarios del sistema si el código en curso se confirma estable.
- Dashboard principal con métricas, amenazas y menciones.
- Proxy protegido hacia n8n para ejecuciones internas.
- Feature boundaries frontend saneados.
- Backend API documentado y separado por routers.
- Tests unitarios/contractuales existentes alineados al comportamiento esperado.
- Documentación actualizada para instalación, arquitectura y pendientes.

### Excluido por ahora

- RBAC avanzado por permisos finos.
- Multi-tenant.
- Integración OAuth/OIDC.
- Realtime/websockets.
- React Query/SWR para estado servidor.
- Automatizaciones manuales complejas desde frontend.
- Hardening productivo completo de infraestructura.

Estas exclusiones no son olvido: son control de alcance. Si metemos todo junto, no hacemos Release 1.0; hacemos una locura cósmica imposible de validar.

## Fases de trabajo

### Fase 1 — Congelar y clasificar cambios actuales

**Objetivo:** entender exactamente qué hay modificado antes de seguir construyendo.

**Tareas:**

- Revisar el diff actual completo.
- Separar cambios en grupos:
  - frontend arquitectura/app/auth;
  - frontend users;
  - backend auth/users;
  - database/init SQL;
  - tests;
  - documentación.
- Detectar archivos incompletos, duplicados o fuera de límite arquitectónico.
- Decidir qué entra en Release 1.0 y qué queda fuera.

**Criterio de salida:** listado claro de cambios aceptados, cambios a corregir y cambios a postergar.

### Fase 2 — Cerrar autenticación y usuarios

**Estado:** backend auth/users validado; frontend auth/users en cierre incremental.

**Objetivo:** dejar el modelo de acceso consistente de punta a punta.

**Tareas:**

- Validar `backend/auth.py`, schemas de auth y flujo JWT.
- Validar `backend/models/system_user.py` y su inclusión en `models/__init__.py`.
- Validar `backend/routers/users.py` y `backend/schemas/user.py`.
- Confirmar que `init.sql` crea datos/estructura compatible con el modelo.
- Confirmar que el frontend consume auth/users mediante módulos API de feature, no con lógica HTTP dispersa.
- Documentar credenciales iniciales y procedimiento seguro de cambio.

**Criterio de salida:** login y usuarios tienen contrato backend/frontend claro y documentado.

**Contrato backend definido para Release 1.0:**

- `system_users` es la fuente autoritativa cuando existen usuarios persistidos.
- `ADMIN_USER` / `ADMIN_PASSWORD` son solo bootstrap inicial mientras `system_users` esté vacía.
- Los errores de base de datos durante login no deben habilitar fallback silencioso.
- JWT mantiene `sub`, `role`, `auth_source`, `exp` y agrega `user_id` para usuarios persistidos.
- `/api/users` cubre creación, listado y actualización parcial admin-only.
- No hay borrado físico de usuarios en Release 1.0.
- Password mínimo: 8 caracteres.

### Fase 3 — Completar auditoría frontend por features

**Objetivo:** terminar el barrido arquitectónico iniciado en `frontend/src/features/`.

**Orden sugerido:**

1. `automation/`
2. `dashboard/`
3. `mentions/`
4. `metrics/`
5. `threats/`
6. `users/`

**Tareas por feature:**

- Verificar que tenga barrel público si es consumida desde afuera.
- Evitar deep imports desde `app` u otras features.
- Mover llamadas HTTP a `api.ts` de la feature cuando corresponda.
- Evitar textos operativos hardcodeados si son configuración o estado del sistema.
- Agregar o ajustar tests mínimos de comportamiento/contrato.

**Criterio de salida:** ninguna feature expone internals innecesarios ni rompe límites de arquitectura.

**Progreso de auditoría Fase 3:**

- [x] `automation/`: barrel público agregado, consumo externo actualizado al barrel, estado/copy operativo centralizado en contrato de feature y tests mínimos de comportamiento agregados.
- [x] `dashboard/`: barrel público existente validado, consumo externo desde `app` confirmado vía barrel, llamadas HTTP encapsuladas en `api.ts`, sin deep imports externos innecesarios y tests mínimos de contrato/comportamiento agregados.
- [x] `mentions/`: barrel público existente validado, consumo externo desde `app` confirmado vía barrel, llamadas HTTP encapsuladas en `api.ts`, copy/contrato operativo centralizado y tests mínimos de contrato/comportamiento conservados.
- [x] `metrics/`: barrel público agregado, sin consumos externos/deep imports detectados, llamada HTTP encapsulada en `api.ts`, endpoint centralizado en contrato de feature y tests mínimos de contrato conservados.
- [x] `threats/`: barrel público existente validado, consumo externo desde `app` confirmado vía barrel, llamada HTTP encapsulada en `api.ts`, endpoint/copy operativo centralizado en contrato de feature y tests mínimos de contrato/comportamiento conservados.
- [x] `users/`: barrel público existente ampliado con contrato/tipos, consumo externo desde `app` confirmado vía barrel, llamadas HTTP encapsuladas en `api.ts`, endpoint/copy operativo centralizado en contrato de feature y tests mínimos de contrato/arquitectura ajustados.

### Fase 4 — Consolidar backend API

**Objetivo:** alinear routers, schemas y modelos con el contrato que consume el frontend.

**Tareas:**

- Revisar routers existentes: `metrics`, `n8n`, `threats`, `alerts`, `keywords`, `logs`, `users`.
- Confirmar `response_model` en endpoints relevantes.
- Reducir SQL raw donde ya existan modelos ORM adecuados.
- Normalizar errores HTTP y payloads de respuesta.
- Validar protección por usuario autenticado en rutas privadas.

**Criterio de salida:** API consistente, protegida y predecible para el frontend.

**Lista paso a paso Fase 4:**

- [x] `metrics`: revisar `backend/routers/metrics.py`, schemas, `response_model`, errores y protección auth.
- [x] `n8n`: revisar `backend/routers/n8n.py`, proxy/trigger protegido, errores y payloads hacia workflows.
- [x] `threats`: revisar `backend/routers/threats.py`, schemas, relación con menciones, filtros y errores.
- [x] `alerts`: revisar `backend/routers/alerts.py`, schemas, estados, errores y protección auth.
- [x] `keywords`: revisar `backend/routers/keywords.py`, schemas, validaciones, errores y protección auth.
- [x] `logs`: revisar `backend/routers/logs.py`, schemas, payloads de auditoría y protección auth.
- [x] `users`: revisar `backend/routers/users.py` contra el contrato auth/users ya definido.
- [x] `activity`: revisar `backend/routers/activity.py`, schemas, payloads y protección auth.
- [x] Transversal: confirmar `response_model` en endpoints relevantes.
- [x] Transversal: reducir SQL raw donde ya existan modelos ORM adecuados.
- [x] Transversal: normalizar errores HTTP y payloads de respuesta.
- [x] Transversal: validar protección por usuario autenticado en rutas privadas.
- [x] Transversal: actualizar `docs/04-backend-api.md` con el contrato backend resultante.

**Plan granular transversales Fase 4:**

- [x] `response_model`: relevar todos los endpoints bajo `backend/routers/`, distinguir contratos explícitos de exclusiones justificadas y dejar test contractual para evitar regresiones.
- [x] `SQL raw`: relevar consultas crudas remanentes, reemplazar solo las que tengan modelo ORM equivalente y documentar excepciones necesarias. Relevamiento confirmado: routers, auth y helpers de DB usan consultas ORM; no quedaron consultas raw reemplazables. Excepción necesaria: `text("uuid_generate_v4()")` en modelos ORM para `server_default` de UUID (`Alert`, `ExecutionLog`), porque describe default DDL del esquema y no una consulta de aplicación.
- [x] `errores/payloads`: comparar códigos HTTP y cuerpos de error por router, normalizar divergencias seguras y cubrir casos críticos con tests enfocados. Contrato confirmado: errores propios de la API usan payload FastAPI `{"detail": "..."}` con detalle string no vacío y códigos acotados por router (`404` para recursos inexistentes, `409` para conflictos de unicidad, `401/403/503` en auth, `502` para fallas internas del proxy n8n). Excepción intencional: `/api/n8n/webhook/{webhook_id}` conserva passthrough del status/payload devuelto por workflow.
- [x] `auth`: confirmar que rutas privadas dependan de usuario autenticado o admin según corresponda, y documentar cualquier ruta pública intencional. Contrato confirmado: todas las rutas privadas bajo `metrics`, `n8n`, `threats`, `alerts`, `keywords`, `logs`, `activity` y `dashboard` dependen de `get_current_user`; `users` es admin-only mediante `require_admin_user`; las únicas rutas públicas intencionales son `POST /api/auth/login` para intercambio de credenciales y `GET /api/health` como health probe operativo.
- [x] `docs`: actualizar `docs/04-backend-api.md` con rutas, modelos de respuesta, protección y excepciones confirmadas.

### Fase 5 — Documentación operativa

**Objetivo:** que cualquier persona pueda levantar, entender y validar el sistema sin adivinar.

**Tareas:**

- Actualizar `README.md` con índice de documentos.
- Actualizar `docs/04-backend-api.md` con estado real de routers/auth/users.
- Actualizar `docs/05-frontend-ui.md` con estructura final de features.
- Mantener este plan como guía viva de Release 1.0.
- Documentar variables obligatorias de entorno y credenciales iniciales.

**Criterio de salida:** documentación no contradice al código actual.

### Fase 6 — Verificación final de Release 1.0

**Objetivo:** cerrar la release con evidencia mínima de calidad.

**Tareas:**

- Revisar tests existentes y completar faltantes críticos.
- Ejecutar verificación estática y/o tests cuando corresponda según el flujo acordado.
- Revisar rutas protegidas manualmente o por tests.
- Confirmar que no queden secretos reales versionados.
- Confirmar que los workflows n8n siguen pasando por backend/proxy cuando aplica.

**Criterio de salida:** Release 1.0 queda lista para demo o entrega académica controlada.

## Orden de ejecución recomendado

1. Revisar cambios actuales sin commitear.
2. Cerrar auth/users backend.
3. Cerrar auth/users frontend.
4. Completar auditoría de features restantes.
5. Actualizar documentación técnica.
6. Validar tests y checklist final.

## Checklist Release 1.0

- [ ] Diff actual clasificado y saneado.
- [x] Auth backend validado.
- [x] Usuario inicial documentado.
- [x] Router de usuarios validado.
- [x] Feature users frontend validada.
- [x] Barrels públicos completos en features consumidas externamente.
- [x] Deep imports innecesarios eliminados.
- [x] Tests críticos de auth/users/routing actualizados.
- [x] Documentación backend actualizada.
- [x] Documentación frontend actualizada.
- [ ] README con índice de documentos actualizado.
- [ ] Checklist final de despliegue revisado.

## Riesgos a controlar

- **Cambios mezclados:** hay trabajo frontend y backend simultáneo; si no se separa, cuesta validar.
- **Auth a medio camino:** mezclar admin hardcodeado con usuarios persistidos puede generar comportamientos ambiguos.
- **Documentación vieja:** algunos documentos describen estados anteriores del backend/frontend.
- **Feature boundaries flojos:** si `app` o una feature consumen internals de otra, la arquitectura empieza a pudrirse silenciosamente.
- **n8n expuesto por accidente:** cualquier trigger desde frontend debe pasar por backend protegido.

## Decisión guía

Release 1.0 no busca ser “la versión definitiva”. Busca ser una base estable, demostrable y defendible técnicamente. Primero cimientos, después pisos. Ponete las pilas con eso porque es la diferencia entre un proyecto que se puede explicar y uno que solo “anda en mi máquina”.
