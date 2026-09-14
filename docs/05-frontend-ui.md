## Exploración: Frontend UI sector (frontend/)

### Estado Actual
El sector frontend es una Single Page Application (SPA) construida con React 18.2.0 y empaquetada mediante Vite 8. El proyecto utiliza TypeScript strict y sigue una estructura modular orientada a características (Feature-Sliced Design), organizada en `app`, `features`, `layouts`, y `shared`. El enrutamiento es manejado por React Router DOM 6.20.0 y el estilizado se realiza a través de Tailwind CSS 3.4 junto con íconos de Lucide React.
Para las visualizaciones de datos y métricas, se emplea la biblioteca Recharts 3.8.1.

**Release 2.0 (estado actual):** la capa de estado de servidor fue migrada completamente a TanStack Query (`@tanstack/react-query` v5.102). No existe ningún patrón `useEffect + fetch` en el codebase de producción.

### Áreas Afectadas / Analizadas
- `frontend/package.json` y `frontend/vite.config.ts` — Configuración principal de dependencias, scripts y el bundler (Vite). El servidor de desarrollo de Vite está configurado para ejecutarse en el puerto 80 y utiliza un proxy para redirigir las peticiones `/api` hacia `http://dashboard-api:8000`.
- `frontend/src/app/providers/AppProviders.tsx` — Instancia el `QueryClient` con opciones globales (`staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: 1`) y envuelve el árbol con `QueryClientProvider` seguido de `AuthProvider`.
- `frontend/src/app/router/AppRouter.tsx` — Define las rutas principales de la aplicación (`/login`, `/`, `/mentions`, `/threats`, `/users`, `/analytics`, `/settings`). Implementa protección de rutas mediante un `ProtectedRoute`, envoltura con un layout principal y consumo de features auditadas a través de sus barrels públicos.
- `frontend/src/features/auth/LoginView.tsx` y `frontend/src/features/auth/api.ts` — Componente y módulo de inicio de sesión. Consumen el endpoint `/api/auth/login` utilizando `URLSearchParams` para enviar credenciales en formato `application/x-www-form-urlencoded`.
- `frontend/src/features/auth/AuthContext.tsx` — Mantiene el token JWT, expone estado de autenticación y decodifica claims de presentación (`role`, `auth_source`, `user_id`) sin reemplazar la autorización real del backend.
- `frontend/src/features/users/` — Feature de administración de usuarios con patrón `useQuery` / `useMutation`. `useUsersQuery` lista usuarios; `useCreateUserMutation` crea uno nuevo e invalida la query `['users']` en `onSuccess` para refrescar la lista automáticamente.
- `frontend/src/features/dashboard/hooks/useDashboardSummary.ts` — Hook autónomo: obtiene el token desde `useAuth()` internamente y delega el fetch a `useQuery({ queryKey: ['dashboard', 'summary'], enabled: !!token })`.
- `frontend/src/features/threats/hooks/useThreats.ts` — Hook que combina `useQuery` para el fetch remoto con `useMemo` para filtrado/ordenamiento local. Expone `status` derivado (`loading | error | empty | success`) y lógica de filtros sin que el componente gestione estado asíncrono directamente.
- `frontend/src/features/mentions/hooks/useMentions.ts` — Mismo patrón que `useThreats`: `useQuery` para datos remotos, `useMemo` para filtrado por `search` y `platform`.
- `frontend/src/features/automation/hooks/useTriggerWorkflow.ts` — `useMutation` sin invalidación posterior (acción de disparo puntual, no afecta cache existente).
- `frontend/src/features/metrics/api.ts` — Función de fetch directa (`fetchMetricsSummary`); el hook correspondiente (`useMetricsSummary`) está pendiente de implementación en esta feature.

### Enfoques / Evaluación Técnica
1. **Configuración Vite y Proxy de API** — La configuración actual es adecuada para el entorno de desarrollo, resolviendo problemas de CORS mediante el proxy a `dashboard-api`.
   - Pros: Simplicidad en la configuración local y fluidez en el desarrollo.
   - Cons: Requiere asegurar que la configuración de producción (ej. Nginx o Ingress) replique este enrutamiento adecuadamente.
   - Esfuerzo: Bajo.

2. **Arquitectura de Componentes (FSD)** — La separación en `features` (auth, automation, dashboard, mentions, metrics, threats, users) aísla correctamente la lógica de negocio, los componentes de interfaz y el consumo de API.
   - Pros: Alta escalabilidad, mantenibilidad y modularidad.
   - Cons: Puede introducir sobrecarga de archivos en características pequeñas.
   - Esfuerzo: Bajo.

3. **Consumo de API con TanStack Query (React Query v5)** — Todas las features utilizan hooks `useXQuery` / `useXMutation` por feature. La función `fetch` nativa sigue siendo el mecanismo de transporte subyacente dentro de las `queryFn`, pero el estado de carga, error, caché y re-fetch es gestionado completamente por React Query.
   - Pros: Eliminación de race conditions, caché automático con invalidación selectiva, estado derivado (`isLoading`, `isError`) sin boilerplate `useEffect`, reintentos configurables.
   - Cons: Los query keys actuales no incluyen el identificador de usuario, lo que puede generar contaminación de caché entre sesiones si el usuario cambia sin recargar la página.
   - Esfuerzo: Implementado. Deuda pendiente: añadir `userId` a las query keys.

### Recomendación
Mantener la estructura actual basada en `features` y el patrón `useQuery` / `useMutation` por feature. Para fortalecer el aislamiento de caché entre usuarios, incorporar el `user_id` del JWT como parte de cada `queryKey`. La arquitectura está en buen estado para las iteraciones restantes de Release 2.0.

### Riesgos
- **Cache cross-user:** Las query keys planas (`['threats']`, `['mentions']`, etc.) pueden servir datos de un usuario a otro si la sesión cambia sin recargar la aplicación. Mitigación: incluir `userId` en cada key o limpiar el cache en logout.
- **Contrato de token inconsistente entre hooks:** `useThreats` y `useMentions` reciben el token como parámetro externo; `useDashboardSummary` y `useUsersQuery` lo obtienen internamente desde `useAuth()`. Los hooks nuevos deben seguir el patrón autónomo.
- **Hardcoding de URLs en Proxy:** El target del proxy (`http://dashboard-api:8000`) está estático en Vite; debe asegurarse que en otros entornos se gestione mediante variables de entorno si es necesario.

### Listo para Propuesta
Sí. La arquitectura está implementada y en producción; los riesgos identificados son deuda técnica conocida, no bloqueantes.
