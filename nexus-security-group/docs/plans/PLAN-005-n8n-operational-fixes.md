# PLAN-005: Fixes operacionales de n8n

> **Estado**: COMPLETADO
> **Fecha**: 2026-09-21
> **Rama**: develop

## Contexto

Al ejecutar el stack con `docker compose up`, los logs de n8n mostraban dos
errores reales entre warnings inofensivos:

1. **Webhook duplicado** — `duplicate key value violates unique constraint` en
   `("webhookPath", method)=(osint-trigger, POST)`.
2. **Permisos de workflow** — `User attempted to access a workflow without
   permissions`.

Ambos errores no impedían la ejecución del workflow (n8n igual lo activaba),
pero ensuciaban los logs y podían enmascarar errores reales.

## Diagnóstico

### Error 1: Webhook duplicado

**Causa raíz**: cuando n8n se apaga de forma no limpia (container killed, OOM,
restart forzado) las filas de `webhook_entity` en la base `n8n_internal` no se
eliminan.  Al reiniciar, n8n intenta INSERT del webhook `osint-trigger` y
choca contra la constraint UNIQUE.

**Evidencia**: el error aparece en cada `docker compose up` posterior al primer
arranque y desaparece si se borra el volumen `n8n_data`.

### Error 2: Permisos de workflow

**Causa raíz**: n8n v2 incluye un sistema de user management con ownership de
workflows.  El servicio `n8n-import` (profile `tools`) importa el workflow como
un proceso separado, lo que puede generar un owner distinto al usuario que
ejecuta n8n.  El resultado es un log de "acceso sin permisos" al intentar
activar o editar el workflow importado.

**Evidencia**: el error desaparece si se desactiva user management, ya que el
proyecto no usa el sistema de usuarios interno de n8n (la autenticación la
maneja el backend de NSG).

## Solución

### M01 — Limpieza de webhooks stale en startup

**Archivo**: `n8n-entrypoint.sh`

Script de entrypoint custom que, antes de iniciar n8n:

1. Conecta a `n8n_internal` en Postgres usando el driver `pg` de Node.js
   (disponible en la imagen de n8n, que no trae `psql`).
2. Ejecuta `DELETE FROM webhook_entity` para limpiar registros stale.
3. Maneja gracefully el caso de DB fresca (tabla inexistente, error `42P01`).
4. Arranca n8n con `exec n8n "$@"`.

n8n re-registra todos los webhooks activos limpiamente en su proceso de startup.

### M02 — Desactivación de user management interno

**Variables de entorno agregadas** en `docker-compose.yml`:

- `N8N_USER_MANAGEMENT_DISABLED=true` — desactiva el sistema de ownership de
  workflows.  NSG no lo necesita porque la autenticación es manejada por el
  backend (JWT + RBAC propio).
- `N8N_PERSONALIZATION_ENABLED=false` — desactiva el wizard de personalización
  que no aplica en un entorno automatizado.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `n8n-entrypoint.sh` | **Nuevo** — entrypoint custom para limpieza de webhooks |
| `docker-compose.yml` | Agregado `entrypoint`, volumen del script, y env vars de n8n |

## Limitaciones

- El entrypoint ejecuta `DELETE FROM webhook_entity` en CADA arranque.  Esto es
  seguro porque n8n re-registra los webhooks activos inmediatamente, pero
  significa que hay una ventana de ~1s donde los webhooks no existen en la tabla.
- Si n8n cambia el nombre de la tabla `webhook_entity` en una versión futura,
  el script fallará silenciosamente (log de warning, n8n arranca igual).
