# Frontend Audit — NSG Dashboard

**Fecha:** 2026-09-17
**Stack:** React 18 + TypeScript 5.3 + Vite 8 + TanStack Query v5 + React Router v6 + Tailwind CSS

---

## Resumen Ejecutivo

| Area | Rating |
|------|--------|
| Arquitectura & Estructura | PROFESSIONAL |
| Routing | ACCEPTABLE |
| State Management | PROFESSIONAL |
| API Layer | ACCEPTABLE |
| Componentes | ACCEPTABLE |
| Forms & Validation | NEEDS WORK |
| Seguridad | ACCEPTABLE |
| Error Boundaries | NEEDS WORK |
| Accesibilidad | ACCEPTABLE |
| Testing | PROFESSIONAL |
| TypeScript | PROFESSIONAL |
| UX Completeness | PROFESSIONAL |

---

## 1. Arquitectura & Estructura — PROFESSIONAL

Organizacion feature-based con separacion clara entre `app/`, `features/`, y `shared/`. Cada feature tiene barrel (`index.ts`). Hay un test de arquitectura activo (`src/architecture.test.ts`) que verifica:

- Existen los 6 dominios esperados
- `shared/` no importa de `features/`
- Los consumidores usan barrels publicos, nunca deep imports

Estructura interna consistente: `api.ts`, `contract.ts`, `types.ts`, `hooks/`, `components/`, `pages/`.

---

## 2. Routing — ACCEPTABLE

- `ProtectedRoute` maneja autenticacion (redirect a `/login`) y autorizacion (mensaje UX con `role="alert"`).
- Tipo `requiredPermission` tipado con template literal `` `${string}:${string}` ``.
- Nav del `DashboardLayout` se filtra dinamicamente segun permisos JWT.

### Problemas

- **Sin lazy loading.** Todos los imports son estaticos. Con recharts y 6 features, el bundle inicial es notable.
  - **Archivo:** todos los imports en `src/app/router/AppRouter.tsx`
- **Sin ruta 404.** No hay `<Route path="*">`. Si el usuario navega a `/foo`, pantalla en blanco.
  - **Archivo:** `src/app/router/AppRouter.tsx`

---

## 3. State Management — PROFESSIONAL

- Auth state con Context + `useState`, hydratado desde `localStorage`.
- React Query para server state, con `queryKey` que incluye `claims.sub` para prevenir cache cross-user.
- `AppProviders.tsx` instancia `QueryClient` con `useState(() => new QueryClient(...))`.
- Config: `staleTime: 60_000`, `retry: 1`, `refetchOnWindowFocus: false`.

### Problemas

- **`isAuthenticated: !!token`** solo verifica que el token existe, no que sea valido/no expirado. JWT expirado permite ver el dashboard hasta que el backend rechace la primera request. No hay manejo de 401 global.
  - **Archivo:** `src/features/auth/AuthContext.tsx:44`

---

## 4. API Layer — ACCEPTABLE

Mappers defensivos en `threats/api.ts` y `mentions/api.ts` con `toOptionalString`, `toNumber`, `pickThreatsArray`. Clases de error custom con `status` en `users/api.ts`.

### Problemas

- **Sin interceptor HTTP centralizado.** Auth headers se inyectan manualmente en cada `api.ts`. Un `apiClient` wrapper centralizaria esto.
- **Type assertion sin validacion runtime** en `dashboard/api.ts:24`: `return res.json() as Promise<DashboardSummaryResponse>`.
- **`console.warn` en produccion** en `threats/api.ts:67` y `mentions/api.ts:19`. Deberian usar logger condicional por entorno.

---

## 5. Componentes — ACCEPTABLE

Patron container-presentacional aplicado: `ThreatsPage` (container), `ThreatCard`, `ThreatsList`, etc. (presentacionales).

### Problemas

- **Dashboard monolitico.** `Dashboard.tsx` tiene 140 lineas con 7 KPI cards casi identicas inline. Un componente `KpiCard` reutilizable reduciria la repeticion.
  - **Archivo:** `src/features/dashboard/pages/Dashboard.tsx`

---

## 6. Forms & Validation — NEEDS WORK

- `LoginView.tsx`: solo `required` HTML nativo. Sin validacion de longitud, sin trim, sin feedback por campo.
- `UsersPage.tsx`: `canSubmit = username.trim().length > 0 && password.length > 0`. Validacion minima.

### Problemas

- Sin validacion de longitud minima de password en cliente (backend requiere min 8).
- Sin validacion de formato de username.
- Sin libreria de forms (react-hook-form, zod).
- `UsersPage` mezcla estado del form, mutacion y UI de confirmacion en ~196 lineas.

---

## 7. Seguridad — ACCEPTABLE

- Token en `localStorage` (`nsg:auth:token`). XSS => token comprometido. Alternativa: cookies HttpOnly.
- React escapa JSX por defecto. No hay `dangerouslySetInnerHTML`.
- Requests usan `Authorization: Bearer` header, CSRF irrelevante.
- `vite.config.ts`: `secure: false` en proxy — solo dev local.

### Problemas

- **Sin validacion de `exp` del JWT en cliente.** Token expirado no se detecta hasta que el backend rechace.
  - **Archivo:** `src/features/auth/AuthContext.tsx`

---

## 8. Error Boundaries — NEEDS WORK

No hay ningun `ErrorBoundary` en la aplicacion. Si un componente lanza durante render (ej: recharts explota), toda la app se rompe con pantalla en blanco.

### Problemas

- Falta `<ErrorBoundary>` envolviendo `<Outlet>` a nivel app.
- Falta `<ErrorBoundary>` a nivel route.

---

## 9. Accesibilidad — ACCEPTABLE

**Bien hecho:**
- `LoginView`: inputs con `id` y `label` con `htmlFor`, `role="alert"` en error.
- `ThreatsPage`: loading con `role="status"`, lista con `aria-label`.
- `UsersPage`: labels correctos, `role="alert"` en error, `role="note"` en aviso.
- `AutomationTriggers`: `role="status"` y `role="alert"` en feedback.

**Falta:**
- `<nav>` del `DashboardLayout` sin `aria-label`.
  - **Archivo:** `src/app/layouts/DashboardLayout.tsx:37`
- Iconos Lucide sin `aria-hidden="true"`.
- `ThreatsList` usa `<div>` en vez de `<ul>`.
- `<aside>` sin `aria-label`.
  - **Archivo:** `src/app/layouts/DashboardLayout.tsx:26`

---

## 10. Testing — PROFESSIONAL

79 de 83 tests pasan. Estrategia solida:
- Tests de hook con `renderHook` + spy.
- Tests de pagina integrados con fetch mock.
- Tests de arquitectura como linters de estructura.
- Tests de router que verifican redirect, layout y RBAC.

### 4 Tests rotos

1. **`DashboardLayout.test.tsx:54`** — busca `getByRole('button')` pero son `<a>` (NavLink). Debe ser `getByRole('link')`.
2. **`dashboard/api.test.ts:35`** — espera `resolves.toBeNull()` pero la API lanza Error.
3. **`metrics/api.test.ts:31`** — mismo problema.

---

## 11. TypeScript — PROFESSIONAL

`tsconfig.json`: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`. Sin `any` visible en codigo productivo.

### Problemas

- Tests hardcodean `'nsg:auth:token'` en vez de importar la constante. Si cambia la key, tests se rompen silenciosamente.

---

## 12. UX Completeness — PROFESSIONAL

- Loading states en todos los features.
- Distincion entre `initial-empty` y `no-results`.
- Error states con retry en threats.
- Feedback de formulario tras crear usuario.
- Permission gates comunicados claramente.

### Problemas

- **Sin paginacion.** Threats y Mentions tienen `limit` hardcodeado (50). Sin paginacion server-side.
