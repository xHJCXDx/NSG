# PLAN-006: Mejoras de configuración en Settings

**Estado:** COMPLETADO
**Prioridad:** MEDIUM
**Origen:** Revisión post-cierre de PLANs 001–005 — funcionalidades de configuración faltantes.
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md`
**Planes relacionados:** `docs/plans/PLAN-002-ux-improvements.md` (M02, M03 — idioma y tema)

> **Objetivo:** completar la página Settings con opciones de configuración operativas que demuestren madurez del sistema y alineación normativa documentada en la tesis.

> **Regla de implementación:** un commit por modificación, Conventional Commits. Branch: `develop`.

---

## Estado actual de Settings

| Funcionalidad | Estado |
|---------------|--------|
| Toggle de tema (dark/light) | DONE (PLAN-002 M03) |
| Selector de idioma (EN/ES) | DONE (PLAN-002 M02) |
| System Info Card (health) | DONE |

---

## Índice de Modificaciones

| # | Prioridad | Área | Descripción | Estado |
|---|-----------|------|-------------|--------|
| M01 | ✅ DONE | Frontend + Backend | Perfil de usuario: cambiar contraseña propia | DONE |
| M02 | ✅ DONE | Frontend | Intervalo de polling del dashboard (configurable) | DONE |
| M03 | ✅ DONE | Frontend | Zona horaria y formato de fecha | DONE |
| M04 | ✅ DONE | Frontend + Backend | About: versión del sistema y cumplimiento normativo | DONE |
| M05 | ⏭️ SKIP | Frontend | Preferencias de notificaciones (toggle email/slack) | DESCARTADO — n8n controla canales, toggles sin efecto real serían engañosos |

---

## M01 — Perfil de usuario: cambiar contraseña propia

**Prioridad:** HIGH
**Área:** Frontend + Backend
**Estado:** DONE

### Problema

El usuario autenticado no puede cambiar su propia contraseña desde la UI. El endpoint `PATCH /api/users/{user_id}` existe pero requiere `users:write` (permiso de administrador). Un analista no puede gestionar su propia seguridad.

### Objetivo

Agregar una sección "My Profile" o "Mi Perfil" en Settings que permita:

- Ver username y rol actual (read-only).
- Cambiar contraseña propia con validación: contraseña actual + nueva + confirmación.
- No requerir `users:write` — el usuario solo puede modificar SU propia contraseña.

### Backend necesario

Nuevo endpoint o variante del existente:

```
PATCH /api/users/me/password
Body: { current_password: string, new_password: string }
```

- Verificar que `current_password` coincida con el hash almacenado.
- Hashear `new_password` y persistir.
- No requerir `users:write` — autenticación suficiente (el token identifica al usuario).
- Validar longitud mínima (8 chars, consistente con frontend).

### Frontend

- Sección en Settings con formulario: contraseña actual, nueva, confirmación.
- Validación client-side: nueva ≠ vacía, nueva === confirmación, mínimo 8 chars.
- Feedback de éxito/error.
- No exponer otros campos del perfil para edición (rol, estado — eso es admin).

### Permisos involucrados

| Permiso | Efecto |
|---------|--------|
| Ninguno específico | Cualquier usuario autenticado puede cambiar SU contraseña |

### Criterios de aceptación

- Usuario autenticado (admin o analyst) puede cambiar su contraseña.
- Contraseña actual incorrecta → error claro.
- Nueva contraseña < 8 chars → validación frontend + backend.
- Después de cambiar, el usuario sigue logueado (token no se invalida).
- `npm run typecheck` pasa.
- Tests focalizados backend + frontend pasan.

---

## M02 — Intervalo de polling del dashboard

**Prioridad:** MEDIUM
**Área:** Frontend
**Estado:** DONE

### Problema

El dashboard hace polling cada 30 segundos (hardcodeado en `useDashboardSummary.ts`). No hay forma de que el usuario ajuste la frecuencia.

### Objetivo

Agregar selector en Settings para configurar el intervalo de auto-refresh:

- Opciones: 15s, 30s (default), 1m, 5m, Desactivado.
- Persistir en localStorage.
- El dashboard lee la preferencia y ajusta `refetchInterval`.

### Backend necesario

Ninguno — es configuración puramente frontend/localStorage.

### Frontend

- Sección "Dashboard" en Settings con selector de intervalo.
- Contexto o helper compartido que exponga el valor.
- `useDashboardSummary` lee del contexto/localStorage en vez de hardcodear 30000.

### Criterios de aceptación

- Cambiar intervalo en Settings se refleja inmediatamente en el dashboard.
- "Desactivado" detiene el polling (refetchInterval: false).
- Persistencia entre recargas via localStorage.
- Tests de Settings y dashboard actualizados.

---

## M03 — Zona horaria y formato de fecha

**Prioridad:** MEDIUM
**Área:** Frontend
**Estado:** DONE

### Problema

Los timestamps en logs, alerts, mentions y threats se muestran con formato fijo. No hay opción de ajustar zona horaria ni formato (24h vs 12h, DD/MM vs MM/DD).

### Objetivo

Agregar configuración en Settings:

- **Zona horaria:** UTC (default), America/Buenos_Aires, browser locale.
- **Formato de fecha:** ISO (2026-09-21), regional AR (21/09/2026), US (09/21/2026).
- **Formato de hora:** 24h (default), 12h (AM/PM).

### Backend necesario

Ninguno — es formateo frontend. Los timestamps se almacenan en UTC en la DB.

### Frontend

- Sección "Date & Time" o "Fecha y Hora" en Settings.
- Selectores para cada opción.
- Persistencia en localStorage.
- Helper/hook `useFormatDate(isoString)` que aplique las preferencias.
- Reemplazar formateo inline en componentes existentes por el hook compartido.

### Criterios de aceptación

- Timestamps en toda la app respetan la configuración elegida.
- Default razonable sin configuración previa (UTC, ISO, 24h).
- Persistencia entre recargas.
- No afecta datos enviados al backend (siempre UTC).

---

## M04 — About: versión del sistema y cumplimiento normativo

**Prioridad:** MEDIUM
**Área:** Frontend + Backend
**Estado:** DONE

### Problema

No hay sección "About" o "Acerca del sistema" que muestre versión, stack tecnológico ni alineación normativa. Para una tesis, esto es importante para demostrar conciencia regulatoria y profesionalismo.

### Objetivo

Agregar sección "About" en Settings que muestre:

#### Información del sistema

- **Nombre:** Nexus Security Group (NSG)
- **Versión:** leída del backend (`version` en FastAPI app, actualmente `1.0.0`).
- **Stack:** FastAPI + React + PostgreSQL + n8n + Traefik.
- **Entorno:** valor del health endpoint (status, db).

#### Cumplimiento normativo

Tabla con tres niveles de adherencia, basada en lo documentado en la tesis (Capítulo 7.7 REV10):

**Cumplimiento implementado:**

| Norma | Descripción | Implementación |
|-------|-------------|----------------|
| Ley 25.326 (Protección de Datos Personales) | Finalidad, proporcionalidad, minimización, controles de acceso | RBAC, RLS PostgreSQL, minimización de campos, logging de accesos |
| Convenio 108/108+ (Consejo de Europa) | Tratamiento automatizado de datos personales | Derivado de las mismas decisiones de diseño que Ley 25.326 |

**Alineación declarada (guías de diseño):**

| Norma | Descripción | Alcance |
|-------|-------------|---------|
| Ley 26.388 (Delitos Informáticos) | Recolección limitada a fuentes públicas sin eludir autenticaciones | Restricción técnica del pipeline OSINT |
| Ley 25.520 (Inteligencia Nacional) | No categorizar personas por religión, política, sindicalismo | Solo indicadores técnicos de ciberseguridad |
| Convenio de Budapest (Ciberdelincuencia) | Legalidad, integridad y trazabilidad en adquisición de evidencia | Logging y timestamps para trazabilidad |
| GDPR (UE 2016/679) | Privacy by design, minimización, limitación de finalidad | Adoptado como buenas prácticas arquitectónicas |
| Resolución 710/2024 (Min. Seguridad) | IA sobre fuentes públicas: finalidad, proporcionalidad, control humano, trazabilidad | Guía de buenas prácticas, no obligación directa |
| OWASP Session Management | Manejo seguro de sesiones | Referencia técnica puntual |

**Referencia técnica (sin implementación certificable):**

| Norma | Descripción | Estado |
|-------|-------------|--------|
| ISO/IEC 27037:2012 | Evidencia digital: identificación, recolección, preservación | Orienta diseño de logging/hashing — no certificado |
| ISO/IEC 27701:2019 | Gestión de privacidad (PIMS) | Orienta controles de privacidad — no certificado |
| NIST CSF v1.1 | Framework de ciberseguridad | Referencia bibliográfica |
| MITRE ATT&CK | Tácticas y técnicas de amenazas | Trabajo futuro — no implementado |

### Backend necesario

Nuevo endpoint o extensión del health:

```
GET /api/system/info
```

Respuesta:

```json
{
  "name": "Nexus Security Group",
  "version": "1.0.0",
  "stack": ["FastAPI", "React", "PostgreSQL", "n8n", "Traefik"],
  "health": { "status": "healthy", "db": "connected" }
}
```

La tabla de cumplimiento normativo es estática en frontend (no cambia en runtime — es documentación del sistema).

### Frontend

- Sección "About" o "Acerca del Sistema" en Settings.
- Card de información del sistema con datos del endpoint.
- Sección de cumplimiento normativo con las tres tablas categorizadas.
- Colapsable por categoría para no saturar la vista.
- i18n para títulos y descripciones (EN/ES).

### Criterios de aceptación

- Versión se lee del backend, no está hardcodeada en frontend.
- Tabla de cumplimiento refleja fielmente lo documentado en la tesis (Cap. 7.7).
- No se declara cumplimiento donde solo hay referencia.
- Los tres niveles (cumplimiento, alineación, referencia) son visualmente distinguibles.
- `npm run typecheck` pasa.
- Tests focalizados pasan.

### Implementación verificada

- Backend:
  - `GET /api/system/info` → endpoint público, sin auth, respuesta estática con `SystemInfoResponse` Pydantic model.
  - Archivos: `routers/system.py` (nuevo), `schemas/system.py` (nuevo), `main.py` (registro del router).
  - Ruta declarada en `test_route_auth_contract.py` como excepción pública (igual que `/api/health`).
  - Tests: `tests/test_system_router.py` — 5 tests PASS.
- Frontend:
  - `ComplianceCard` component con 3 secciones colapsables: Implemented (emerald, abierta por defecto), Alignment (blue), Reference (gray).
  - Cada sección muestra tabla de normas con nombre y descripción vía i18n.
  - Archivos: `src/features/settings/components/ComplianceCard.tsx` (nuevo), `src/features/settings/pages/SettingsPage.tsx` (modificado), `src/shared/i18n/translations.ts` (modificado).
  - Tests: `src/features/settings/components/ComplianceCard.test.tsx` — 7 tests PASS.
- Verificación:
  - Backend: 334 passed.
  - Frontend: 188 passed, 30 files.

---

## M05 — Preferencias de notificaciones

**Prioridad:** LOW
**Área:** Frontend + Backend
**Estado:** DESCARTADO — n8n controla los canales de notificación; toggles sin efecto backend real serían engañosos.

### Problema

El pipeline OSINT envía alertas por email y/o Slack, pero el usuario no puede configurar sus preferencias de notificación desde la UI.

### Objetivo

Agregar sección "Notifications" o "Notificaciones" en Settings:

- Toggle para habilitar/deshabilitar notificaciones por email.
- Toggle para habilitar/deshabilitar notificaciones por Slack.
- Información del estado actual de configuración de canales.

### Backend necesario

Depende de la arquitectura actual de n8n:

- Si n8n maneja los canales internamente → el toggle sería cosmético o requeriría API de n8n.
- Si el backend puede condicionar el envío → nuevo endpoint `PATCH /api/users/me/preferences`.

**Evaluar antes de implementar:** si el pipeline n8n es quien decide a quién notificar, un toggle en el frontend sin backend que lo respete sería engañoso.

### Alternativa pragmática

Si no hay backend real para esto, implementar como **read-only informativo**:

- Mostrar qué canales están configurados (email: sí/no, Slack: sí/no).
- Indicar que la configuración se gestiona desde n8n.
- No exponer toggles que no hagan nada.

### Criterios de aceptación

- No presentar controles que no tengan efecto real.
- Si es read-only, indicar claramente dónde se configura.
- Tests focalizados pasan.

---

## Orden recomendado de implementación

1. **M04 — About + Cumplimiento normativo** — mayor valor para la tesis y defensa.
2. **M01 — Cambiar contraseña propia** — funcionalidad de seguridad básica esperada.
3. **M02 — Intervalo de polling** — bajo riesgo, solo frontend.
4. **M03 — Zona horaria y formato** — mejora UX transversal.
5. **M05 — Notificaciones** — evaluar viabilidad real antes de implementar.

---

## Riesgos generales

- **No declarar cumplimiento falso:** la tabla normativa debe ser fiel a la tesis. Si dice "referencia", no presentarlo como "cumplimiento".
- **No crear endpoints vacíos:** si una configuración no tiene efecto real en el sistema, no exponerla como funcional.
- **Consistencia i18n:** todas las nuevas secciones deben tener traducciones EN/ES completas.
- **No saturar Settings:** agrupar secciones lógicamente (Perfil, Preferencias, Sistema).
