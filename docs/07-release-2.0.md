# Plan de Modificación — Release 2.0

## Objetivo

Evolucionar NSG desde la base estable de Release 1.0 hacia un sistema operativo con capacidades reales de respuesta: trigger manual de workflows, gestión de estado servidor con cache inteligente, control de acceso granular, notificaciones ante amenazas y actualización en tiempo real del dashboard.

Release 1.0 demostró que el sistema funciona. Release 2.0 demuestra que el sistema SIRVE.

## Estado de partida

Release 1.0 (`v1.0.0`) entrega:

- JWT auth con usuarios persistidos y admin bootstrap.
- CRUD de usuarios admin-only.
- Dashboard con métricas, amenazas, menciones y alertas.
- Backend API protegida con contratos explícitos y tests (246 backend, 73 frontend).
- Frontend con feature boundaries saneados y barrel exports.
- Proxy protegido hacia n8n (trigger manual deshabilitado por contrato).
- Documentación sincronizada con código.

## Principios de Release 2.0

1. **Funcionalidad operativa real**: cada feature nueva debe aportar valor demostrable en un escenario de uso OSINT.
2. **Incrementalidad**: cada fase es independiente y mergeable. No se acumulan cambios sin cerrar.
3. **Tests primero**: cada feature nueva incluye cobertura de tests desde el inicio.
4. **Backward compatible**: Release 2.0 no rompe lo que ya funciona de Release 1.0.
5. **Defendible académicamente**: cada decisión técnica tiene un porqué explicable en la defensa de tesis.

## Alcance funcional

### Incluido

- Trigger manual de workflows OSINT desde el dashboard.
- React Query como capa de estado servidor con cache, refetch y error handling.
- RBAC granular con permisos finos (más allá de admin/analyst).
- Notificaciones reales ante detección de amenazas (email y/o Telegram).
- Actualización en tiempo real del dashboard vía WebSockets.

### Excluido por ahora

- Multi-tenant / organizaciones.
- OAuth/OIDC federado.
- Internacionalización (i18n).
- Mobile-first / PWA.
- CI/CD automatizado en cloud.

## Fases de trabajo

### Fase 1 — Trigger manual de workflows OSINT

**Objetivo:** habilitar la ejecución manual de workflows n8n desde el dashboard, a través del proxy backend protegido.

**Tareas:**

- Verificar que el workflow n8n principal exponga un webhook invocable.
- Habilitar el botón de trigger en la feature `automation` del frontend.
- Conectar el botón al endpoint `POST /api/n8n/webhook/{webhook_id}` con token auth.
- Mostrar feedback visual del estado de ejecución (loading, éxito, error).
- Agregar test de integración frontend para el flujo de trigger.
- Agregar test backend que confirme que el proxy propaga correctamente la respuesta del workflow.

**Criterio de salida:** un usuario autenticado puede disparar el workflow OSINT desde el dashboard y ver el resultado.

**Progreso Fase 1:**

- [x] Verificar webhook disponible en workflow n8n: no existía; se agregó nodo `Manual OSINT Trigger` (webhook path `osint-trigger`) conectado a los 3 nodos de ingestion en paralelo; workflow activado (`active: true`).
- [x] Habilitar trigger en feature `automation`: contrato actualizado a `manualTriggerEnabled: true`, `runMode: 'manual'`, label `Run OSINT scan`.
- [x] Conectar botón a `/api/n8n/webhook/{webhook_id}` con auth: `api.ts` implementa `triggerWorkflow()` con `Bearer` token vía `createAuthHeaders`.
- [x] Feedback visual de ejecución (loading/éxito/error): spinner animado durante ejecución, banner verde con `CheckCircle` en éxito, banner rojo con `AlertTriangle` y detalle del error en fallo.
- [x] Test de integración frontend del flujo de trigger: 7 tests cubren render del contrato, botón habilitado, loading state, éxito, error de red, error de backend con detalle, y verificación de endpoint+auth header.
- [x] Test backend del proxy con respuesta de workflow: cobertura existente en `test_n8n.py` (7 tests) ya cubre settings URL, auth, propagación JSON, errores, 502 transport y passthrough no-JSON.

### Fase 2 — React Query como capa de estado servidor

**Objetivo:** reemplazar los fetches manuales con `useEffect` por React Query, ganando cache, refetch automático, loading/error states consistentes y deduplicación de requests.

**Tareas:**

- Instalar `@tanstack/react-query` y configurar `QueryClientProvider` en el árbol de la app.
- Migrar feature por feature (una por vez, no todas juntas):
  1. `dashboard` — primer candidato por ser la vista principal.
  2. `threats` — queries con filtros.
  3. `mentions` — queries con paginación/límite.
  4. `metrics` — queries simples.
  5. `alerts` — queries + mutations (acknowledge).
  6. `keywords` — CRUD completo (queries + mutations).
  7. `users` — queries + mutations admin-only.
  8. `automation` — mutation de trigger.
- Establecer convención de hooks: `useXQuery` para queries, `useXMutation` para mutations, ubicados en `hooks/` dentro de cada feature.
- Configurar `staleTime` y `refetchOnWindowFocus` según la naturaleza de cada dato.
- Actualizar tests existentes para trabajar con el wrapper de QueryClient.
- Eliminar `useEffect` + `useState` de fetch manual una vez migrado.

**Criterio de salida:** ninguna feature usa `fetch` directo con `useEffect` para estado servidor; todas pasan por React Query con cache y error handling consistente.

**Progreso Fase 2:**

- [ ] Instalar React Query y configurar provider.
- [ ] Migrar `dashboard`.
- [ ] Migrar `threats`.
- [ ] Migrar `mentions`.
- [ ] Migrar `metrics`.
- [ ] Migrar `alerts`.
- [ ] Migrar `keywords`.
- [ ] Migrar `users`.
- [ ] Migrar `automation`.
- [ ] Establecer convención de hooks y documentar.
- [ ] Eliminar fetches manuales residuales.

### Fase 3 — RBAC con permisos granulares

**Objetivo:** evolucionar el modelo de acceso de `admin/analyst` binario a un sistema de permisos por recurso/acción, donde cada rol tiene capacidades explícitas.

**Tareas:**

- Diseñar modelo de permisos: definir recursos (`users`, `threats`, `alerts`, `keywords`, `workflows`) y acciones (`read`, `write`, `delete`, `execute`).
- Crear tabla `permissions` y tabla pivot `role_permissions` en la base de datos.
- Extender el modelo `SystemUser` con relación a permisos.
- Crear middleware/dependency `require_permission(resource, action)` en backend.
- Migrar rutas existentes de `require_admin_user` a permisos granulares donde corresponda.
- Reflejar permisos en el JWT payload para que el frontend pueda renderizar condicionalmente.
- Actualizar el frontend para ocultar/deshabilitar acciones según permisos del token.
- Agregar endpoint admin para asignar permisos a roles.
- Actualizar tests de contrato de rutas con el nuevo modelo.
- Documentar matriz de permisos por rol.

**Criterio de salida:** las acciones del sistema están controladas por permisos explícitos, no por roles hardcodeados.

**Progreso Fase 3:**

- [ ] Diseñar modelo de permisos (recursos × acciones).
- [ ] Crear tablas `permissions` y `role_permissions`.
- [ ] Extender `SystemUser` con relación a permisos.
- [ ] Crear dependency `require_permission(resource, action)`.
- [ ] Migrar rutas existentes al nuevo modelo.
- [ ] Incluir permisos en JWT payload.
- [ ] Actualizar frontend para renderizado condicional por permisos.
- [ ] Endpoint admin para gestión de permisos.
- [ ] Actualizar tests de contrato.
- [ ] Documentar matriz de permisos.

### Fase 4 — Notificaciones reales ante amenazas

**Objetivo:** que cuando el sistema detecte una amenaza crítica, notifique automáticamente a los responsables por email y/o Telegram.

**Tareas:**

- Diseñar el modelo de notificaciones: tabla `notification_channels` (tipo, config, activo) y `notification_log` (canal, amenaza, estado, timestamp).
- Crear microservicio o módulo de notificaciones con adaptadores para email (SMTP) y Telegram (Bot API).
- Integrar el trigger de notificación en el flujo de detección de amenazas (puede ser desde n8n o desde backend al crear una alerta).
- Crear endpoints admin para configurar canales de notificación.
- Crear vista frontend para gestionar canales y ver historial de notificaciones enviadas.
- Agregar tests de integración para cada adaptador (mock del servicio externo).
- Documentar configuración de canales y variables de entorno necesarias.

**Criterio de salida:** una amenaza crítica detectada genera automáticamente una notificación real al canal configurado.

**Progreso Fase 4:**

- [ ] Diseñar modelo de notificaciones (tablas + adaptadores).
- [ ] Crear módulo de notificaciones con adaptador email (SMTP).
- [ ] Crear adaptador Telegram (Bot API).
- [ ] Integrar trigger en flujo de detección de amenazas.
- [ ] Endpoints admin para configuración de canales.
- [ ] Vista frontend de gestión de canales + historial.
- [ ] Tests de integración por adaptador.
- [ ] Documentar configuración y variables de entorno.

### Fase 5 — Dashboard en tiempo real con WebSockets

**Objetivo:** que el dashboard se actualice automáticamente cuando llegan nuevas menciones, amenazas o alertas, sin necesidad de recargar la página.

**Tareas:**

- Configurar WebSocket endpoint en backend (`/ws/dashboard`).
- Definir protocolo de mensajes: tipos de eventos (`new_mention`, `new_threat`, `new_alert`, `metrics_update`).
- Integrar emisión de eventos en los flujos existentes de backend (al procesar una mención, al crear una amenaza, al generar una alerta).
- Crear hook `useRealtimeDashboard` en frontend que conecte al WebSocket y actualice el cache de React Query.
- Agregar indicador visual de conexión en tiempo real (conectado/reconectando/desconectado).
- Implementar reconexión automática con backoff exponencial.
- Agregar tests del protocolo WebSocket en backend.
- Agregar test frontend del hook de reconexión.

**Criterio de salida:** el dashboard refleja nuevos datos en tiempo real sin recarga manual.

**Progreso Fase 5:**

- [ ] Configurar WebSocket endpoint `/ws/dashboard`.
- [ ] Definir protocolo de mensajes (tipos de eventos).
- [ ] Integrar emisión de eventos en flujos de backend.
- [ ] Crear hook `useRealtimeDashboard` en frontend.
- [ ] Indicador visual de estado de conexión.
- [ ] Reconexión automática con backoff exponencial.
- [ ] Tests del protocolo WebSocket en backend.
- [ ] Test frontend del hook de reconexión.

### Fase 6 — Verificación final y documentación de Release 2.0

**Objetivo:** cerrar la release con la misma rigurosidad de Release 1.0.

**Tareas:**

- Ejecutar suite completa de tests (backend + frontend).
- Ejecutar verificación estática (typecheck + lint).
- Confirmar que no hay secretos versionados.
- Confirmar que todas las rutas nuevas tienen contratos auth explícitos.
- Actualizar documentación técnica (`docs/`) con los cambios de Release 2.0.
- Actualizar README con las nuevas capacidades.
- Revisar que el deploy guide refleje las nuevas variables de entorno.

**Criterio de salida:** Release 2.0 queda lista para demo, defensa de tesis o entrega académica completa.

**Progreso Fase 6:**

- [ ] Suite completa de tests pasa.
- [ ] Verificación estática pasa.
- [ ] Sin secretos versionados.
- [ ] Contratos auth actualizados para rutas nuevas.
- [ ] Documentación técnica actualizada.
- [ ] README actualizado.
- [ ] Deploy guide actualizado.

## Orden de ejecución

1. **Fase 1** (Automation trigger) — base funcional, desbloquea demo real.
2. **Fase 2** (React Query) — mejora arquitectónica que facilita las fases siguientes.
3. **Fase 3** (RBAC) — seguridad granular, prerequisito para features multi-usuario.
4. **Fase 4** (Notificaciones) — funcionalidad OSINT operativa real.
5. **Fase 5** (WebSockets) — experiencia de usuario en tiempo real, depende de React Query.
6. **Fase 6** (Verificación) — cierre formal.

Las fases son secuenciales por dependencia técnica. No mezclar.

## Riesgos a controlar

- **Scope creep:** cada fase tiene criterio de salida. Si no se cumple, no se pasa a la siguiente.
- **React Query migration:** migrar feature por feature, no en un big bang. Cada migración es un commit independiente.
- **RBAC complexity:** empezar simple (3-4 permisos por recurso) y expandir después. No diseñar para 50 roles que no existen.
- **WebSocket stability:** reconexión automática es obligatoria. Un socket que se cae y no vuelve es peor que no tener sockets.
- **Notificaciones externas:** dependen de servicios terceros (SMTP, Telegram). Testear siempre con mocks, tener fallback si el servicio no responde.

## Decisión guía

Release 2.0 no busca impresionar con cantidad de features. Busca demostrar que el sistema puede operar como herramienta OSINT real: detecta, notifica, permite actuar y se actualiza en vivo. Cada feature tiene que poder explicarse con una frase que empiece con "esto le sirve al analista porque...". Si no podés terminar esa frase, la feature no entra.
