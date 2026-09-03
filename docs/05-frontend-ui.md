## Exploración: Frontend UI sector (frontend/)

### Estado Actual
El sector frontend es una Single Page Application (SPA) construida con React 18.2.0 y empaquetada mediante Vite 8. El proyecto utiliza TypeScript y sigue una estructura modular orientada a características (Feature-Sliced Design), organizada en `app`, `features`, `layouts`, y `shared`. El enrutamiento es manejado por React Router DOM 6.20.0 y el estilizado se realiza a través de Tailwind CSS 3.4 junto con íconos de Lucide React.
Para las visualizaciones de datos y métricas, se emplea la biblioteca Recharts 3.8.1.

### Áreas Afectadas / Analizadas
- `frontend/package.json` y `frontend/vite.config.ts` — Configuración principal de dependencias, scripts y el bundler (Vite). El servidor de desarrollo de Vite está configurado para ejecutarse en el puerto 80 y utiliza un proxy para redirigir las peticiones `/api` hacia `http://dashboard-api:8000`.
- `frontend/src/app/router/AppRouter.tsx` — Define las rutas principales de la aplicación (`/login`, `/`, `/mentions`, `/threats`, `/users`, `/analytics`, `/settings`). Implementa protección de rutas mediante un `ProtectedRoute`, envoltura con un layout principal y consumo de features auditadas a través de sus barrels públicos.
- `frontend/src/features/auth/LoginView.tsx` y `frontend/src/features/auth/api.ts` — Componente y módulo de inicio de sesión. Consumen el endpoint `/api/auth/login` utilizando `URLSearchParams` para enviar credenciales en formato `application/x-www-form-urlencoded`.
- `frontend/src/features/auth/AuthContext.tsx` — Mantiene el token JWT, expone estado de autenticación y decodifica claims de presentación (`role`, `auth_source`, `user_id`) sin reemplazar la autorización real del backend.
- `frontend/src/features/users/` — Feature de administración básica de usuarios. Expone `UsersPage`, contrato/copy operativo y tipos desde su barrel público; consume `/api/users` desde `api.ts` para listar y crear usuarios, muestra errores 401/403/409/422 del backend y mantiene la autoridad de permisos del lado servidor.
- `frontend/src/features/automation/`, `dashboard/`, `mentions/`, `metrics/`, `threats/` y `users/` — Features auditadas para Release 1.0. Las rutas y consumos externos usan barrels públicos; los endpoints/copy operativo viven en contratos o módulos API de cada feature; las pruebas de arquitectura controlan que no reaparezcan deep imports externos innecesarios.
- `frontend/src/features/metrics/MetricsDashboard.tsx` — Panel principal que muestra métricas del sistema utilizando `Recharts` para gráficos de barras. Consume la API mediante `fetchMetricsSummary`.
- `frontend/src/features/metrics/api.ts` y `frontend/src/automation/api.ts` — Funciones de consumo de API que utilizan `fetch` estándar y adjuntan tokens JWT a través de la función de utilidad `createAuthHeaders` ubicada en `shared/api/authHeaders.ts`.

### Enfoques / Evaluación Técnica
1. **Configuración Vite y Proxy de API** — La configuración actual es adecuada para el entorno de desarrollo, resolviendo problemas de CORS mediante el proxy a `dashboard-api`. 
   - Pros: Simplicidad en la configuración local y fluidez en el desarrollo.
   - Cons: Requiere asegurar que la configuración de producción (ej. Nginx o Ingress) replique este enrutamiento adecuadamente.
   - Esfuerzo: Bajo.

2. **Arquitectura de Componentes (FSD)** — La separación en `features` (auth, automation, dashboard, mentions, metrics, threats, users) aísla correctamente la lógica de negocio, los componentes de interfaz y el consumo de API.
   - Pros: Alta escalabilidad, mantenibilidad y modularidad.
   - Cons: Puede introducir sobrecarga de archivos en características pequeñas.
   - Esfuerzo: Bajo.

3. **Consumo de API con Fetch Nativo** — Las llamadas se realizan de forma directa usando `fetch` y un envoltorio básico para los headers de autenticación.
   - Pros: Menos dependencias externas; uso de estándares web.
   - Cons: Carece de utilidades avanzadas integradas (ej. reintentos automáticos, caché, cancelación de peticiones) que ofrecerían librerías como Axios, React Query o SWR.
   - Esfuerzo: Medio (si se decide migrar a React Query en el futuro).

### Recomendación
Mantener la estructura actual basada en `features`, ya que proporciona una excelente base para la escalabilidad. Sin embargo, para escalar la aplicación en términos de estado del servidor y consumo de API, se recomienda considerar la introducción de una librería como TanStack Query (React Query) en iteraciones futuras, para manejar el estado de carga, errores y caché de manera más robusta que los actuales `useEffect`.

### Riesgos
- **Gestión del estado asíncrono:** El uso intensivo de `useEffect` para el fetch de datos en componentes (como en `MetricsDashboard.tsx`) puede propiciar "race conditions" si no se gestionan adecuadamente las funciones de limpieza (cleanup).
- **Hardcoding de URLs en Proxy:** El target del proxy (`http://dashboard-api:8000`) está estático en Vite; debe asegurarse que en otros entornos se gestione mediante variables de entorno si es necesario.

### Listo para Propuesta
Sí. La arquitectura actual está bien definida y lista para ser extendida según los requerimientos funcionales del negocio.
