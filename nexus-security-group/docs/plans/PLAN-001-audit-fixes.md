# PLAN-001: Correcciones Post-Auditoria 2026-09-17

**Estado:** PENDIENTE
**Prioridad:** CRITICAL -> HIGH -> MEDIUM -> LOW
**Origen:** `docs/audits/2026-09-17-frontend-audit.md` + `docs/audits/2026-09-17-backend-audit.md`
**Arquitectura de referencia:** `docs/SYSTEM-ARCHITECTURE.md` (consultar antes de implementar cualquier modificacion)

> **REGLA DE ORO:** Antes de tocar cualquier archivo, consultar la seccion 9 "Mapa de Impacto" del documento de arquitectura para entender que otros modulos dependen de el.
> Cada modificacion incluye una seccion **DEPENDENCIAS Y EFECTOS COLATERALES** que lista exactamente que mas se ve afectado.

---

## Indice de Modificaciones

| # | Prioridad | Area | Descripcion | Archivos |
|---|-----------|------|-------------|----------|
| M01 | ✅ DONE | Backend | Reemplazar python-jose por PyJWT | backend/auth.py, backend/requirements.txt, backend/tests/test_auth.py |
| M02 | ✅ DONE | Backend | Agregar logging estructurado | backend/main.py, backend/auth.py, todos los routers |
| M03 | ✅ DONE | Backend | Rate limiting en login | backend/main.py, backend/auth.py, backend/rate_limit.py, backend/requirements.txt |
| M04 | ✅ DONE | Frontend | Error boundaries | frontend/src/shared/components/ErrorBoundary.tsx, frontend/src/app/router/AppRouter.tsx |
| M05 | ✅ DONE | Frontend | Ruta 404 | frontend/src/app/pages/NotFoundPage.tsx, frontend/src/app/router/AppRouter.tsx |
| M06 | ✅ DONE | Frontend | Corregir 4 tests rotos | DashboardLayout.test.tsx, dashboard/api.test.ts, metrics/api.test.ts |
| M07 | ✅ DONE | Backend | Mover CORS_ORIGINS a Settings | backend/config.py, backend/main.py |
| M08 | ✅ DONE | Backend | Health check con verificacion DB | backend/main.py, tests/* |
| M09 | ✅ DONE | Backend | Exception handler global | backend/main.py |
| M10 | ✅ DONE | Frontend | Validacion de formularios | frontend/src/features/auth/, frontend/src/features/users/ |
| M11 | ✅ DONE | Frontend | Validacion de expiracion JWT | frontend/src/features/auth/AuthContext.tsx |
| M12 | ✅ DONE | Backend | Eliminar campos client-spoofable | backend/schemas/threat.py, backend/schemas/alert.py |
| M13 | ✅ DONE | Backend | Security headers middleware | backend/main.py |
| M14 | ✅ DONE | Backend | Dockerfile non-root user | backend/Dockerfile |
| M15 | ✅ DONE | Backend | Paginacion real (offset) | backend/routers/alerts.py, threats.py, logs.py |
| M16 | ✅ DONE | Backend | Indices en columnas de filtrado | backend/models/*.py |
| M17 | MEDIUM | Backend | get_db() con rollback explicito | backend/database.py |
| M18 | MEDIUM | Backend | JWT_SECRET_KEY validacion de longitud | backend/config.py |
| M19 | MEDIUM | Frontend | Remover console.warn en produccion | frontend/src/features/threats/api.ts, mentions/api.ts |
| M20 | MEDIUM | Frontend | Accesibilidad (aria-labels, semantica) | frontend/src/app/layouts/DashboardLayout.tsx |
| M21 | MEDIUM | Backend | Actualizar dependencias | backend/requirements.txt |
| M22 | MEDIUM | Backend | Separar deps de test | backend/requirements.txt, backend/requirements-test.txt |
| M23 | MEDIUM | Frontend | Lazy loading de rutas | frontend/src/app/router/AppRouter.tsx |
| M24 | MEDIUM | Backend | OpenAPI metadata completa | backend/main.py |
| M25 | LOW | Frontend | Componente KpiCard reutilizable | frontend/src/features/dashboard/ |
| M26 | LOW | Backend | FakeDb centralizado en tests | backend/tests/conftest.py |
| M27 | LOW | Frontend | Interceptor HTTP centralizado | frontend/src/shared/api/ |
| M28 | LOW | Backend | Schema muerto MetricsSummaryResponse | backend/schemas/metrics.py |

---

## Detalle de Modificaciones

---

### M01 — Reemplazar python-jose por PyJWT [CRITICAL] ✅ COMPLETADO

**Problema:** `python-jose` esta abandonado (ultimo release 2021). Hay CVEs documentados. Es la libreria que maneja JWT en un sistema de seguridad.

**Archivos a modificar:**
- `backend/requirements.txt`
- `backend/auth.py`

**Cambios exactos:**

1. En `requirements.txt`:
   ```diff
   - python-jose[cryptography]==3.3.0
   + PyJWT[crypto]==2.9.0
   ```

2. En `auth.py`, cambiar imports:
   ```diff
   - from jose import JWTError, jwt
   + import jwt
   + from jwt.exceptions import InvalidTokenError
   ```

3. En `auth.py`, funcion `create_access_token` (linea 102):
   ```diff
   - encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
   + encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
   ```
   (PyJWT usa la misma API para encode, no hay cambio)

4. En `auth.py`, funcion `get_current_user` (linea 149):
   ```diff
   - payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
   + payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
   ```
   (PyJWT usa la misma API para decode)

5. En `auth.py`, exception handling (linea 160):
   ```diff
   - except JWTError:
   + except (jwt.InvalidTokenError, Exception):
   ```

**Verificacion:** Correr todos los tests de auth. El API de PyJWT es casi identica a python-jose para HS256.

**Riesgo:** BAJO. La API es compatible. Solo cambia el import y la exception class.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `auth.py` es importado por TODOS los routers (via `require_permission` y `get_current_user`). Un cambio en la exception class que no se maneje bien rompe TODOS los endpoints protegidos.
- El frontend `shared/auth/decodeTokenClaims.ts` decodifica el JWT del lado cliente — NO se ve afectado porque solo parsea el payload base64, no valida la firma.
- Los tests `backend/tests/test_auth.py` importan directamente de `auth.py` — deben correr despues del cambio.
- El test contractual `test_route_auth_contract.py` verifica que cada ruta tenga `require_permission` — NO se ve afectado (no importa la libreria JWT).
- **NO TOCAR:** La logica de `create_access_token`, `get_current_user`, `verify_password`, `hash_password` no debe cambiar su comportamiento. Solo cambian los imports y la exception class.

---

### M02 — Agregar logging estructurado [CRITICAL] ✅ COMPLETADO

**Problema:** Cero logging en toda la aplicacion. Imposible debuggear, auditar, o monitorear en produccion. En un sistema de seguridad, el audit trail es parte del producto.

**Archivos a modificar:**
- `backend/main.py` — configurar logger root + middleware de request logging
- `backend/auth.py` — loggear login exitoso, login fallido, token rechazado
- Todos los routers — loggear operaciones de escritura

**Cambios exactos:**

1. En `main.py`, agregar configuracion de logging:
   ```python
   import logging
   import time
   import uuid
   from starlette.middleware.base import BaseHTTPMiddleware

   logging.basicConfig(
       level=logging.INFO,
       format="%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s",
       datefmt="%Y-%m-%dT%H:%M:%S",
   )
   logger = logging.getLogger("nsg")
   ```

2. En `main.py`, agregar middleware de request logging:
   ```python
   class RequestLoggingMiddleware(BaseHTTPMiddleware):
       async def dispatch(self, request, call_next):
           request_id = str(uuid.uuid4())[:8]
           request.state.request_id = request_id
           start = time.time()
           response = await call_next(request)
           duration = round((time.time() - start) * 1000)
           logger.info(
               "%s %s %s %dms",
               request.method,
               request.url.path,
               response.status_code,
               duration,
               extra={"request_id": request_id},
           )
           return response

   app.add_middleware(RequestLoggingMiddleware)
   ```

3. En `auth.py`, agregar logs en login:
   ```python
   logger = logging.getLogger("nsg.auth")

   # En login exitoso (antes de return):
   logger.info("Login successful: user=%s source=%s", form_data.username, auth_source)

   # En login fallido (antes de raise):
   logger.warning("Login failed: user=%s", form_data.username)

   # En token rechazado (get_current_user, except JWTError):
   logger.warning("Invalid token presented")
   ```

4. En routers de escritura, loggear operaciones criticas:
   ```python
   # users.py - crear usuario:
   logger.info("User created: %s by %s", user.username, current_user.username)

   # permissions.py - cambiar permisos:
   logger.info("Permissions updated for role=%s by %s", role, current_user.username)

   # keywords.py - crear/eliminar keyword:
   logger.info("Keyword created: %s by %s", keyword.text, current_user.username)
   ```

**Verificacion:** Levantar la app, hacer login, verificar que los logs aparecen en stdout del container.

**Riesgo:** BAJO. Es aditivo, no modifica logica existente.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- El middleware `RequestLoggingMiddleware` se agrega en `main.py`. El orden de middlewares importa: debe ir DESPUES de CORSMiddleware (CORS debe procesar primero los preflight OPTIONS).
- Agregar `import logging` y `logger = logging.getLogger("nsg.MODULO")` en cada router es ADITIVO — no cambia firmas de funciones ni return values.
- **CUIDADO con el middleware:** `BaseHTTPMiddleware` de Starlette tiene un bug conocido donde consume el body del request. Si se usa junto con el proxy de n8n (`routers/n8n.py` que lee `request.body()`), verificar que el body no se consuma dos veces. Alternativa: usar un middleware raw de ASGI en vez de `BaseHTTPMiddleware`.
- Los tests existentes NO se ven afectados porque no verifican logs.
- Docker: los logs van a stdout del container, asi que `docker logs osint-dashboard-api` los muestra.

---

### M03 — Rate limiting en login [CRITICAL] ✅ COMPLETADO

**Problema:** `/api/auth/login` sin proteccion contra fuerza bruta. Un atacante puede probar passwords sin restriccion.

**Archivos a modificar:**
- `backend/requirements.txt`
- `backend/main.py`

**Cambios exactos:**

1. En `requirements.txt`, agregar:
   ```
   slowapi==0.1.9
   ```

2. En `main.py`:
   ```python
   from slowapi import Limiter, _rate_limit_exceeded_handler
   from slowapi.util import get_remote_address
   from slowapi.errors import RateLimitExceeded

   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
   ```

3. En `auth.py`, decorar el endpoint de login:
   ```python
   from main import limiter  # o pasar como dependencia

   @router.post("/login", response_model=Token)
   @limiter.limit("5/minute")
   async def login_for_access_token(
       request: Request,  # requerido por slowapi
       form_data: OAuth2PasswordRequestForm = Depends(),
       db: Session = Depends(get_db),
   ):
   ```

**NOTA sobre dependencia circular:** `auth.py` importa de `main.py` si se hace asi. Alternativa: crear `backend/rate_limit.py` que exporte el `limiter`, importarlo en ambos.

**Archivo alternativo `backend/rate_limit.py`:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

Luego en `main.py`:
```python
from rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Y en `auth.py`:
```python
from rate_limit import limiter

@limiter.limit("5/minute")
async def login_for_access_token(request: Request, ...):
```

**Verificacion:** Hacer 6 requests de login rapidas con curl. La 6ta debe devolver 429 Too Many Requests.

**Riesgo:** BAJO. Solo afecta al endpoint de login. Si slowapi falla, la app sigue funcionando sin rate limit (fail-open, no fail-closed).

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- Crear `backend/rate_limit.py` como modulo separado para evitar import circular entre `main.py` y `auth.py`.
- El endpoint de login (`auth.py`) necesita recibir `request: Request` como primer parametro para que slowapi pueda extraer la IP. Actualmente NO tiene `request` — hay que agregarlo a la firma de `login_for_access_token`.
- `slowapi` se agrega a `requirements.txt` — requiere rebuild de la imagen Docker.
- Los tests de `test_auth.py` que llaman directamente a `login_for_access_token` deberian seguir funcionando, pero los que usen `TestClient` podrian verse afectados si el rate limit se activa durante el test run. Considerar desactivar rate limit en tests via un override.

---

### M04 — Error Boundaries en frontend [CRITICAL] ✅ COMPLETADO

**Problema:** Si cualquier componente React lanza durante render, toda la app se rompe con pantalla en blanco.

**Archivos a crear/modificar:**
- CREAR `frontend/src/shared/components/ErrorBoundary.tsx`
- MODIFICAR `frontend/src/app/router/AppRouter.tsx`

**Cambios exactos:**

1. Crear `ErrorBoundary.tsx`:
   ```tsx
   import { Component, type ErrorInfo, type ReactNode } from 'react';

   interface Props {
     children: ReactNode;
     fallback?: ReactNode;
   }

   interface State {
     hasError: boolean;
   }

   export class ErrorBoundary extends Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = { hasError: false };
     }

     static getDerivedStateFromError(): State {
       return { hasError: true };
     }

     componentDidCatch(error: Error, info: ErrorInfo) {
       console.error('ErrorBoundary caught:', error, info);
     }

     render() {
       if (this.state.hasError) {
         return this.props.fallback ?? (
           <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
             <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
             <p className="text-gray-400 mb-6">An unexpected error occurred.</p>
             <button
               type="button"
               onClick={() => window.location.reload()}
               className="px-4 py-2 bg-brand-500 rounded-lg hover:bg-brand-600"
             >
               Reload page
             </button>
           </div>
         );
       }
       return this.props.children;
     }
   }
   ```

2. En `AppRouter.tsx`, envolver las rutas:
   ```tsx
   import { ErrorBoundary } from '../../shared/components/ErrorBoundary';

   // Envolver el elemento del layout:
   <Route element={<ErrorBoundary><DashboardLayout /></ErrorBoundary>}>
     {/* rutas hijas */}
   </Route>
   ```

3. Exportar en `frontend/src/shared/index.ts` (si existe barrel).

**Verificacion:** En dev, forzar un error en un componente (throw en render). Debe mostrar el fallback, no pantalla en blanco.

**Riesgo:** BAJO. Es aditivo. No cambia comportamiento normal.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `ErrorBoundary` es un class component (React no soporta error boundaries en funciones). Debe importarse en `AppRouter.tsx`.
- Si se envuelve `DashboardLayout` con `ErrorBoundary`, el error NO captura errores en el propio `DashboardLayout` — solo en sus hijos (dentro de `<Outlet />`). Si se necesita capturar errores en el layout tambien, envolver un nivel mas arriba en `AppRouter`.
- El test de arquitectura (`architecture.test.ts`) verifica que `shared/` no importe de `features/`. El `ErrorBoundary` debe vivir en `shared/components/` y NO debe importar nada de features.
- Los tests existentes de `AppRouter.test.tsx` no deberian verse afectados si `ErrorBoundary` es transparente en el happy path.
- **Exportar** desde el barrel de shared si existe, o importar directamente en AppRouter.

---

### M05 — Ruta 404 [CRITICAL] ✅ COMPLETADO

**Problema:** Navegar a una URL inexistente muestra pantalla en blanco.

**Archivos a crear/modificar:**
- CREAR `frontend/src/app/pages/NotFoundPage.tsx`
- MODIFICAR `frontend/src/app/router/AppRouter.tsx`

**Cambios exactos:**

1. Crear `NotFoundPage.tsx`:
   ```tsx
   import { Link } from 'react-router-dom';

   export function NotFoundPage() {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
         <h1 className="text-6xl font-bold text-brand-500 mb-4">404</h1>
         <p className="text-xl text-gray-400 mb-8">Page not found</p>
         <Link
           to="/"
           className="px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all"
         >
           Back to Dashboard
         </Link>
       </div>
     );
   }
   ```

2. En `AppRouter.tsx`, agregar al final de las rutas:
   ```tsx
   <Route path="*" element={<NotFoundPage />} />
   ```

**Verificacion:** Navegar a `http://localhost/asdasd`. Debe mostrar la pagina 404 con link al dashboard.

**Riesgo:** NULO.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `NotFoundPage` debe vivir en `src/app/pages/` (junto a `AnalyticsPage` y `SettingsPage`).
- La ruta `<Route path="*">` debe ir AL FINAL de todas las rutas dentro de `<Routes>`. Si se pone antes, captura todo.
- La ruta 404 debe estar FUERA del `DashboardLayout` si se quiere que sea full-screen (sin sidebar). Si se pone dentro, se renderiza con el sidebar.
- El test de arquitectura NO verifica paginas en `app/pages/` — no hay conflicto.
- `AppRouter.test.tsx` podria necesitar actualizarse para verificar el render del 404.

---

### M06 — Corregir 4 tests rotos [CRITICAL] ✅ COMPLETADO

**Problema:** 4 tests fallan por desincronizacion entre tests y produccion.

**Archivos a modificar:**
- `frontend/src/app/layouts/DashboardLayout.test.tsx`
- `frontend/src/features/dashboard/api.test.ts`
- `frontend/src/features/metrics/api.test.ts`

**Cambios exactos:**

1. En `DashboardLayout.test.tsx:54` (y lineas similares):
   ```diff
   - getByRole('button', { name: /Dashboard/i })
   + getByRole('link', { name: /Dashboard/i })
   ```
   NavLink renderiza `<a>`, no `<button>`. Aplicar en todas las assertions de la misma naturaleza en ese archivo.

2. En `dashboard/api.test.ts:35`:
   El test espera `resolves.toBeNull()` pero la implementacion lanza `Error`. Hay dos opciones:
   - **Opcion A (cambiar test):** Cambiar la expectativa a `rejects.toThrow()`
   - **Opcion B (cambiar implementacion):** Hacer que `fetchDashboardSummary` devuelva `null` en `!ok` en vez de lanzar

   Recomendacion: **Opcion A** — el patron de lanzar en error es mas explicito:
   ```diff
   - await expect(fetchDashboardSummary(token)).resolves.toBeNull();
   + await expect(fetchDashboardSummary(token)).rejects.toThrow();
   ```

3. En `metrics/api.test.ts:31`: mismo cambio que el punto 2.

**Verificacion:** Correr `npm test` en frontend. Los 83 tests deben pasar.

**Riesgo:** BAJO. Son solo tests, no afectan produccion.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `DashboardLayout.test.tsx`: cambiar `getByRole('button')` a `getByRole('link')` es seguro. NavLink renderiza `<a>`, que tiene role `link`.
- `dashboard/api.test.ts` y `metrics/api.test.ts`: Si se elige Opcion A (cambiar test), no se toca produccion. Si se elige Opcion B (cambiar implementacion), hay que verificar que ningun consumidor dependa del throw actual:
  - `useDashboardSummary` hook usa `useQuery` que captura errores automaticamente → Opcion A es segura.
  - Pero si se cambia a retornar null, el tipo de retorno de `fetchDashboardSummary` cambia de `Promise<DashboardSummaryResponse>` a `Promise<DashboardSummaryResponse | null>` — esto requiere actualizar el hook y los componentes que consumen el dato.
- **RECOMENDACION:** Opcion A (cambiar tests) es la mas segura. No toca produccion.

---

### M07 — Mover CORS_ORIGINS a Settings [HIGH] ✅ COMPLETADO

**Problema:** `CORS_ORIGINS` se lee con `os.getenv()` directo en `main.py`, inconsistente con el resto de la config que usa `pydantic-settings`. El default permisivo con `localhost` puede quedar habilitado en produccion.

**Archivos a modificar:**
- `backend/config.py`
- `backend/main.py`

**Cambios exactos:**

1. En `config.py`:
   ```diff
     class Settings(BaseSettings):
         DATABASE_URL: str
         JWT_SECRET_KEY: str
         ADMIN_USER: str
         ADMIN_PASSWORD: str
         N8N_INTERNAL_URL: str = "http://n8n:5678"
   +     CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost"

         model_config = SettingsConfigDict(env_file=".env")
   ```

2. En `main.py`:
   ```diff
   - import os
     from fastapi import FastAPI
     ...
     app.add_middleware(
         CORSMiddleware,
   -     allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost").split(","),
   +     allow_origins=settings.CORS_ORIGINS.split(","),
         allow_credentials=True,
         allow_methods=["*"],
         allow_headers=["*"],
     )
   ```

3. Agregar import de settings en `main.py`:
   ```python
   from config import settings
   ```

**Verificacion:** Levantar la app sin `CORS_ORIGINS` en `.env`, verificar que usa el default. Luego setear `CORS_ORIGINS=https://mi-dominio.com` y verificar que solo ese origin funciona.

**Riesgo:** BAJO. Solo mueve la config de lugar.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- Mover `CORS_ORIGINS` a `Settings` implica que se lee al ARRANCAR la app (no lazy). Si el valor tiene un formato invalido, la app no arranca.
- `test_config.py` debe actualizarse para incluir `CORS_ORIGINS` en los tests de Settings.
- `.env.example` debe documentar el nuevo campo.
- El test contractual que verifica que no hay `os.getenv()` en el backend (`test_auth.py:57-70`) PASARA si se elimina el `os.getenv` de `main.py`.
- **NO ROMPE** el frontend — el frontend no configura CORS, solo el browser lo verifica.

---

### M08 — Health check con verificacion DB [HIGH] ✅ COMPLETADO

**Problema:** El health check devuelve `200 healthy` aunque la DB este caida.

**Archivos a modificar:**
- `backend/main.py`

**Cambios exactos:**

```diff
- @app.get("/api/health")
- def health_check():
-     return {"status": "healthy"}
+ from sqlalchemy import text
+ from database import get_db
+
+ @app.get("/api/health")
+ def health_check(db: Session = Depends(get_db)):
+     try:
+         db.execute(text("SELECT 1"))
+         return {"status": "healthy", "db": "connected"}
+     except Exception:
+         raise HTTPException(
+             status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
+             detail="Database unavailable",
+         )
```

Agregar imports necesarios: `from fastapi import Depends, HTTPException, status` y `from sqlalchemy.orm import Session`.

**Verificacion:** Parar el container de postgres, llamar a `/api/health`. Debe devolver 503.

**Riesgo:** BAJO. El healthcheck de Docker Compose usa este endpoint, asi que si la DB esta caida, Docker lo va a reportar como unhealthy (lo cual es CORRECTO).

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- El healthcheck de Docker Compose (`docker-compose.yml` linea del dashboard-api) usa `urlopen('http://127.0.0.1:8000/api/health')`. Si el health check ahora devuelve 503 cuando la DB esta caida, Docker va a marcar el container como unhealthy y podria reiniciarlo (depende de `restart` policy).
- Esto es el comportamiento DESEADO — si la DB esta caida, el backend no puede servir nada.
- El frontend depende de `dashboard-api: condition: service_healthy`. Si el health check falla, el frontend podria no arrancar. Verificar que postgres arranque antes.
- Agregar `Depends(get_db)` al health check significa que ahora consume una conexion del pool por cada check. Con interval de 10s, son 6 conexiones/minuto — irrelevante con pool_size=5.

---

### M09 — Exception handler global [HIGH] ✅ COMPLETADO

**Problema:** Error no previsto devuelve 500 con stacktrace potencialmente visible.

**Archivos a modificar:**
- `backend/main.py`

**Cambios exactos:**

```python
import logging
from fastapi.responses import JSONResponse

logger = logging.getLogger("nsg")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
```

**Verificacion:** Provocar un error intencional en un router (ej: `raise RuntimeError("test")`). Debe devolver `{"detail": "Internal server error"}` sin stacktrace, y el log debe mostrar el traceback completo.

**Riesgo:** BAJO. Solo captura excepciones que antes devolvian stacktrace.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- **IMPORTANTE:** El exception handler NO debe capturar `HTTPException` — FastAPI ya las maneja correctamente. Solo capturar `Exception` generico EXCLUYENDO HTTPException. Usar: `@app.exception_handler(Exception)` y dentro verificar `if isinstance(exc, HTTPException): raise exc`.
- Tambien excluir `RequestValidationError` (422) que Pydantic ya maneja.
- Este handler depende de M02 (logging) — si M02 no esta implementado, el `logger.exception()` no loggea nada porque no hay logger configurado. **Implementar M02 antes de M09.**

---

### M10 — Validacion de formularios en frontend [HIGH] ✅ COMPLETADO

**Problema:** Los formularios del frontend no validan antes de enviar al backend. El usuario no recibe feedback hasta que el backend rechaza.

**Archivos a modificar:**
- `frontend/src/features/auth/LoginView.tsx`
- `frontend/src/features/users/pages/UsersPage.tsx`

**Cambios exactos:**

1. En `LoginView.tsx`, agregar validacion:
   ```tsx
   const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

   const validate = () => {
     const newErrors: typeof errors = {};
     if (!username.trim()) newErrors.username = 'Username is required';
     if (!password) newErrors.password = 'Password is required';
     if (password && password.length < 8) newErrors.password = 'Password must be at least 8 characters';
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };

   const handleSubmit = (e: FormEvent) => {
     e.preventDefault();
     if (!validate()) return;
     // ... existing login logic
   };
   ```

   Mostrar errors debajo de cada input:
   ```tsx
   {errors.username && (
     <p className="text-red-400 text-sm mt-1" role="alert">{errors.username}</p>
   )}
   ```

2. En `UsersPage.tsx`, agregar validacion similar:
   ```tsx
   const validate = () => {
     const newErrors: Record<string, string> = {};
     const trimmedUsername = username.trim();
     if (!trimmedUsername) newErrors.username = 'Username is required';
     if (trimmedUsername.length > 0 && trimmedUsername.length < 3) newErrors.username = 'Username must be at least 3 characters';
     if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername) && trimmedUsername.length > 0) newErrors.username = 'Username can only contain letters, numbers, dots, hyphens, and underscores';
     if (!password) newErrors.password = 'Password is required';
     if (password && password.length < 8) newErrors.password = 'Password must be at least 8 characters';
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };
   ```

**Verificacion:** Intentar crear un usuario con password de 3 chars. Debe mostrar error inline SIN hacer request al backend.

**Riesgo:** BAJO. Es aditivo, no cambia la validacion del backend.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- Las reglas de validacion del frontend deben ESPEJEAR las del backend, no reemplazarlas:
  - Backend `schemas/user.py`: Password min_length=8, max_length=255
  - Backend `schemas/user.py`: Username via `Annotated[str, StringConstraints(min_length=1, max_length=100)]`
  - Si el backend cambia estas reglas (ej: M12 elimina campos), actualizar aca tambien.
- `LoginView.tsx` usa `loginWithCredentials` de `features/auth/api.ts` — la validacion debe ir ANTES del `await loginWithCredentials(...)`.
- `UsersPage.tsx` usa `useCreateUserMutation` — la validacion debe ir ANTES del `trigger.mutate()`.
- Tests de `LoginView.test.tsx` y `UsersPage.test.tsx` deben actualizarse para verificar los nuevos mensajes de error inline.
- **NO TOCAR** la logica de `api.ts` ni los hooks — solo agregar validacion en los componentes de UI.

---

### M11 — Validacion de expiracion JWT en cliente [HIGH] ✅ COMPLETADO

**Problema:** `isAuthenticated: !!token` no verifica que el token no haya expirado. Usuario con token expirado ve el dashboard hasta que el backend rechace.

**Archivos a modificar:**
- `frontend/src/features/auth/AuthContext.tsx`

**Cambios exactos:**

1. Agregar funcion de verificacion:
   ```tsx
   function isTokenExpired(token: string): boolean {
     try {
       const payload = JSON.parse(atob(token.split('.')[1]));
       if (!payload.exp) return false;
       return Date.now() >= payload.exp * 1000;
     } catch {
       return true;
     }
   }
   ```

2. Modificar `isAuthenticated`:
   ```diff
   - const isAuthenticated = !!token;
   + const isAuthenticated = !!token && !isTokenExpired(token);
   ```

3. Agregar efecto para limpiar token expirado:
   ```tsx
   useEffect(() => {
     if (token && isTokenExpired(token)) {
       removeToken();
       setToken(null);
     }
   }, [token]);
   ```

**Verificacion:** En DevTools, setear un token con `exp` en el pasado en localStorage. Recargar la pagina. Debe redirigir a login.

**Riesgo:** BAJO. Peor caso: si el parsing falla, `isTokenExpired` devuelve `true` y el usuario tiene que re-loguearse.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `AuthContext.tsx` expone `isAuthenticated` que es consumido por:
  - `ProtectedRoute.tsx` — decide si redirigir a `/login`
  - `DashboardLayout.tsx` — via `useAuth()`
  - Todos los hooks de features (`useDashboardSummary`, `useThreats`, etc.) — via `useAuth()` para obtener el token
- Cambiar `isAuthenticated` de `!!token` a `!!token && !isTokenExpired(token)` hace que todos estos consumidores automaticamente respeten la expiracion. NO hay que tocarlos.
- **IMPORTANTE:** `decodeTokenClaims` (en `shared/auth/`) ya parsea el JWT payload. La funcion `isTokenExpired` deberia reusar esa utilidad para obtener `exp`, no duplicar la logica de parsing.
- El efecto de limpieza (removeToken cuando expira) debe llamar `removeToken()` de `shared/storage/tokenStorage.ts` — ya importado en AuthContext.
- Si el backend cambia `ACCESS_TOKEN_EXPIRE_MINUTES` (actualmente 60), el frontend NO necesita cambios — lee `exp` del token.

---

### M12 — Eliminar campos client-spoofable [HIGH] ✅ COMPLETADO

**Problema:** `ThreatReviewRequest` acepta `reviewed_by` y `AcknowledgeRequest` acepta `acknowledged_by` del cliente. Aunque el backend los ignora, crean confision y riesgo si la logica cambia.

**Archivos a modificar:**
- `backend/schemas/threat.py`
- `backend/schemas/alert.py`

**Cambios exactos:**

1. En `schemas/threat.py`, eliminar `reviewed_by` del schema de request:
   ```diff
     class ThreatReviewRequest(BaseModel):
         review_status: str
         review_notes: Optional[str] = None
   -     reviewed_by: Optional[str] = None
   ```

2. En `schemas/alert.py`, eliminar `acknowledged_by` del schema de request:
   ```diff
     class AcknowledgeRequest(BaseModel):
   -     acknowledged_by: Optional[str] = None
   ```

   Si `AcknowledgeRequest` queda vacio, evaluar si se necesita un body en ese endpoint o si deberia ser un POST sin body.

**Verificacion:** Correr tests de threats y alerts. Los tests que envian estos campos deberian actualizarse.

**Riesgo:** BAJO. El backend ya ignora estos campos. Removerlos del schema no cambia el comportamiento.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- El test contractual `test_router_response_models_contract.py` verifica `response_model`, no request schemas — NO se ve afectado.
- `test_error_payloads_contract.py` verifica detalles de HTTPException — NO se ve afectado.
- Tests unitarios de `test_threats_router.py` y `test_alerts_router.py` que envian payloads con `reviewed_by` / `acknowledged_by` deben actualizarse para no enviar esos campos.
- El frontend `features/threats/` y `features/mentions/` NO envian estos campos — no hay impacto frontend.
- El workflow n8n NO llama a estos endpoints (PATCH review/acknowledge) — no hay impacto n8n.
- Si `AcknowledgeRequest` queda sin campos despues de eliminar `acknowledged_by`, el endpoint de acknowledge puede cambiar a no requerir body (solo el PATCH con el ID en la URL basta). Verificar que el frontend no envie body vacio que falle.

---

### M13 — Security headers middleware [HIGH] ✅ COMPLETADO

**Problema:** Sin headers de seguridad basicos.

**Archivos a modificar:**
- `backend/main.py`

**Cambios exactos:**

```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

**Nota:** No agregar `Strict-Transport-Security` si el entorno local usa HTTP. Agregar solo si hay HTTPS en produccion.

**Verificacion:** `curl -I http://localhost/api/health` debe mostrar los headers.

**Riesgo:** BAJO. Headers adicionales no rompen nada.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `X-Frame-Options: DENY` impide que la app se embeba en iframes. Si el futuro Appsmith dashboard embebe endpoints del API via iframe, esto rompe. El Appsmith actual consulta PostgreSQL directamente, no el API — no hay impacto.
- El middleware de headers debe ir DESPUES de CORSMiddleware y ANTES de RequestLoggingMiddleware (M02).
- Mismo warning que M02: `BaseHTTPMiddleware` puede tener problemas con el body del request en el proxy n8n. Si M02 ya usa `BaseHTTPMiddleware`, combinar ambos middlewares en uno solo para evitar problemas.

---

### M14 — Dockerfile non-root user [HIGH] ✅ COMPLETADO

**Problema:** El proceso corre como root dentro del container.

**Archivos a modificar:**
- `backend/Dockerfile`

**Cambios exactos:**

Agregar antes del `CMD`:
```dockerfile
RUN useradd --create-home --shell /bin/bash appuser
USER appuser
```

**Verificacion:** `docker exec osint-dashboard-api whoami` debe devolver `appuser`, no `root`.

**Riesgo:** MEDIO. Si algun archivo necesita permisos de root (ej: escribir en un directorio), puede fallar. Verificar que los volumenes montados tengan permisos correctos.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- El backend NO monta volumenes de escritura (no tiene volumen de datos). Solo lee archivos del container. DEBERIA funcionar sin problemas.
- `pip install` en el Dockerfile se ejecuta ANTES del `USER appuser`, asi que las dependencias se instalan como root (correcto).
- El `.env` se lee via `pydantic-settings` desde el CWD del container — verificar que el WORKDIR en el Dockerfile sea accesible por appuser.
- **NOTA:** El `sentiment-api/Dockerfile` ya usa `USER appuser` — esto es consistente.
- Si el container necesita escribir logs a archivo (no aplica actualmente, van a stdout), el directorio debe ser writable por appuser.

---

### M15 — Paginacion real con offset [MEDIUM] ✅ COMPLETADO

**Problema:** Endpoints de lista usan `limit` sin `offset`. Imposible obtener pagina 2.

**Archivos a modificar:**
- `backend/routers/alerts.py`
- `backend/routers/threats.py`
- `backend/routers/logs.py`
- `backend/routers/users.py`
- `backend/schemas/` (si se quiere respuesta con metadata de paginacion)

**Cambios exactos (patron para cada router):**

```diff
  @router.get("", response_model=list[AlertListResponse])
  def list_alerts(
      limit: int = Query(default=50, ge=1, le=100),
+     offset: int = Query(default=0, ge=0),
      db: Session = Depends(get_db),
      current_user: TokenData = Depends(require_permission("alerts", "read")),
  ):
-     return db.query(Alert).order_by(...).limit(limit).all()
+     return db.query(Alert).order_by(...).offset(offset).limit(limit).all()
```

**Opcion avanzada:** Devolver metadata de paginacion:
```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
```

Esto requiere cambio en el frontend tambien para consumir la paginacion.

**Verificacion:** `GET /api/alerts?limit=10&offset=10` debe devolver la segunda pagina.

**Riesgo:** BAJO. El offset default 0 mantiene compatibilidad con el frontend actual.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- Con `offset=0` como default, el frontend actual sigue funcionando sin cambios (no envia offset).
- Si se implementa la opcion avanzada (`PaginatedResponse` con `items`, `total`, `offset`), el response cambia de `list[T]` a un objeto wrapper. Esto ROMPE el frontend porque espera un array directo. Habria que actualizar:
  - `features/threats/api.ts` (parser de respuesta)
  - `features/mentions/api.ts` (parser de respuesta)
  - `features/threats/types.ts` (`RawThreatsResponse`)
  - Los hooks correspondientes
- **RECOMENDACION:** Implementar solo el offset simple (sin wrapper de paginacion) para no romper el frontend. La opcion avanzada es un cambio de contrato API que requiere coordinacion frontend-backend.
- El workflow n8n NO consume estos endpoints (hace INSERT directo) — no hay impacto.
- Los tests unitarios de los routers afectados deben actualizarse para probar offset.

---

### M16 — Indices en columnas de filtrado [MEDIUM] ✅ COMPLETADO

**Problema:** Columnas usadas en filtros de GET no tienen indice. Queries lentas con datos reales.

**Archivos a modificar:**
- `backend/models/alert.py`
- `backend/models/threat_detection.py`
- `backend/models/execution_log.py`

**Cambios exactos:**

```python
# alert.py
delivery_status = Column(String(20), ..., index=True)
acknowledged = Column(Boolean, ..., index=True)

# threat_detection.py
review_status = Column(String(20), ..., index=True)
criticality_level = Column(String(20), ..., index=True)

# execution_log.py
status = Column(String(20), ..., index=True)
workflow_name = Column(String(100), ..., index=True)
```

**Nota:** Sin Alembic, estos indices solo se aplican al recrear la DB. Alternativa: agregar `CREATE INDEX IF NOT EXISTS` al `init.sql`.

**Verificacion:** Conectar a la DB y verificar con `\di` que los indices existen.

**Riesgo:** BAJO. Indices adicionales no rompen nada, solo usan un poco mas de espacio.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- Sin Alembic, agregar `index=True` en los modelos ORM solo tiene efecto al CREAR las tablas desde cero. La DB existente NO recibe los indices automaticamente.
- Para aplicar en DB existente, agregar `CREATE INDEX IF NOT EXISTS` al `init.sql` O ejecutar manualmente:
  ```sql
  CREATE INDEX IF NOT EXISTS ix_alerts_delivery_status ON alerts(delivery_status);
  CREATE INDEX IF NOT EXISTS ix_alerts_acknowledged ON alerts(acknowledged);
  -- etc.
  ```
- n8n tambien hace SELECT contra estas tablas (Stage 2: Check Existing IDs). Los indices benefician a n8n tambien.
- Los triggers de `last_updated` no se ven afectados por indices nuevos.

---

### M17 — get_db() con rollback explicito [MEDIUM]

**Problema:** Si un commit falla, la sesion se cierra sin rollback explicito.

**Archivos a modificar:**
- `backend/database.py`

**Cambios exactos:**

```diff
  def get_db():
      db = SessionLocal()
      try:
          yield db
+     except Exception:
+         db.rollback()
+         raise
      finally:
          db.close()
```

**Verificacion:** Tests existentes deben seguir pasando. El comportamiento es el mismo para el caso feliz.

**Riesgo:** NULO.

---

### M18 — JWT_SECRET_KEY validacion de longitud [MEDIUM]

**Problema:** Un secreto de 4 caracteres es valido. Insuficiente para seguridad.

**Archivos a modificar:**
- `backend/config.py`

**Cambios exactos:**

```diff
  class Settings(BaseSettings):
      DATABASE_URL: str
-     JWT_SECRET_KEY: str
+     JWT_SECRET_KEY: str  # validated below
      ADMIN_USER: str
      ADMIN_PASSWORD: str
      N8N_INTERNAL_URL: str = "http://n8n:5678"

      model_config = SettingsConfigDict(env_file=".env")
+
+     @model_validator(mode="after")
+     def validate_secret_key_length(self):
+         if len(self.JWT_SECRET_KEY) < 32:
+             raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
+         return self
```

Agregar imports: `from pydantic import model_validator`.

**Verificacion:** Arrancar la app con `JWT_SECRET_KEY=abc`. Debe fallar al arrancar.

**Riesgo:** MEDIO. Si el secret actual tiene menos de 32 chars, la app no arranca. Verificar `.env` primero.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `config.py` es importado por `database.py`, `auth.py`, y `routers/n8n.py`. Si `Settings()` falla al validar, NINGUNO de estos modulos se inicializa — la app no arranca en absoluto (comportamiento DESEADO).
- `test_config.py` debe actualizarse para que el `JWT_SECRET_KEY` en los fixtures tenga al menos 32 chars.
- Verificar el `.env` actual y el `.env.example` — actualizar el ejemplo para que tenga un secret de 32+ chars.

---

### M19 — Remover console.warn en produccion [MEDIUM]

**Problema:** `console.warn` llega al browser del usuario en produccion.

**Archivos a modificar:**
- `frontend/src/features/threats/api.ts:67`
- `frontend/src/features/mentions/api.ts:19`

**Cambios exactos:**

Opcion simple — eliminar los `console.warn` y filtrar silenciosamente:
```diff
- console.warn('Backend returned item without ID, filtering out', raw);
  // Items without ID are filtered out silently
```

Opcion con logger condicional (si se quiere preservar en dev):
```typescript
const isDev = import.meta.env.DEV;
if (isDev) console.warn('Backend returned item without ID', raw);
```

**Verificacion:** Buscar `console.warn` en el bundle de produccion. No debe existir.

**Riesgo:** NULO.

---

### M20 — Accesibilidad (aria-labels, semantica) [MEDIUM]

**Problema:** Falta aria-labels en landmarks, iconos sin aria-hidden, semantica incorrecta en listas.

**Archivos a modificar:**
- `frontend/src/app/layouts/DashboardLayout.tsx`
- `frontend/src/features/threats/components/ThreatsList.tsx`

**Cambios exactos:**

1. En `DashboardLayout.tsx`:
   ```diff
   - <nav>
   + <nav aria-label="Main navigation">
   ```
   ```diff
   - <aside>
   + <aside aria-label="Sidebar">
   ```
   Agregar `aria-hidden="true"` a todos los iconos Lucide decorativos en el sidebar.

2. En `ThreatsList.tsx`:
   ```diff
   - <div aria-label="Threats list">
   + <ul aria-label="Threats list" className="space-y-4">
   ```
   Y envolver cada `ThreatCard` en `<li>`.

**Verificacion:** Correr un linter de accesibilidad (axe-core) o navegar con screen reader.

**Riesgo:** BAJO.

---

### M21 — Actualizar dependencias backend [MEDIUM]

**Archivos a modificar:**
- `backend/requirements.txt`

**Cambios:** Actualizar a las ultimas versiones estables. Ejecutar `pip install --upgrade` y correr tests.

**Riesgo:** MEDIO. Posibles breaking changes entre versiones. Correr la suite completa de tests antes de commitear.

---

### M22 — Separar dependencias de test [MEDIUM]

**Archivos a crear/modificar:**
- CREAR `backend/requirements-test.txt`
- MODIFICAR `backend/requirements.txt`

Mover `pytest`, `anyio`, `httpx` (si solo se usa en tests) a `requirements-test.txt`.

**Riesgo:** BAJO.

---

### M23 — Lazy loading de rutas [MEDIUM]

**Archivos a modificar:**
- `frontend/src/app/router/AppRouter.tsx`

**Cambios exactos:**

```tsx
import { lazy, Suspense } from 'react';

const ThreatsPage = lazy(() => import('../../features/threats').then(m => ({ default: m.ThreatsPage })));
const UsersPage = lazy(() => import('../../features/users').then(m => ({ default: m.UsersPage })));
// ... etc

// Envolver en Suspense:
<Route path="threats" element={
  <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
    <ThreatsPage />
  </Suspense>
} />
```

**Riesgo:** BAJO. Mejora de performance sin cambiar funcionalidad.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `AppRouter.test.tsx` usa `vi.mock` para mockear los modulos de features. Con lazy loading, los mocks deben funcionar igual porque `vi.mock` es hoisted — pero verificar.
- El test de arquitectura `architecture.test.ts` verifica que las features existen y que no hay deep imports. Los `lazy(() => import(...))` NO son deep imports (importan el barrel) — no hay conflicto.
- Cada feature necesita un `default` export o el `.then(m => ({ default: m.NamedExport }))` pattern. Verificar que cada barrel exporte lo necesario.

---

### M24 — OpenAPI metadata completa [MEDIUM]

**Archivos a modificar:**
- `backend/main.py`

**Cambios exactos:**

```diff
- app = FastAPI(title="Dashboard API")
+ app = FastAPI(
+     title="NSG Security Dashboard API",
+     description="API for the Nexus Security Group OSINT monitoring dashboard",
+     version="1.0.0",
+ )
```

**Riesgo:** NULO.

---

### M25 — Componente KpiCard reutilizable [LOW]

**Archivos a crear/modificar:**
- CREAR `frontend/src/features/dashboard/components/KpiCard.tsx`
- MODIFICAR `frontend/src/features/dashboard/pages/Dashboard.tsx`

Extraer las 7 cards repetitivas a un componente reutilizable con props para icon, label, value, color.

**Riesgo:** BAJO. Refactor estetico.

---

### M26 — FakeDb centralizado en tests [LOW]

**Archivos a modificar:**
- `backend/tests/conftest.py`
- Todos los archivos de test que definen FakeDb

Mover `FakeDb` y `FakeQuery` a `conftest.py` y eliminar las copias duplicadas.

**Riesgo:** BAJO.

---

### M27 — Interceptor HTTP centralizado [LOW]

**Archivos a crear/modificar:**
- CREAR `frontend/src/shared/api/apiClient.ts`
- MODIFICAR todos los `api.ts` de cada feature

Crear un wrapper de `fetch` que inyecte auth headers automaticamente y maneje 401 globalmente.

**Riesgo:** MEDIO. Requiere tocar todos los archivos de API. Hacer con cuidado.

**DEPENDENCIAS Y EFECTOS COLATERALES:**
- `shared/api/authHeaders.ts` tiene fan-in de 6 features. Un `apiClient` lo reemplazaria como punto unico de inyeccion de headers.
- Cada `api.ts` (automation, dashboard, mentions, metrics, threats, users) usa `createAuthHeaders(token)` y `fetch()` nativamente. Migrar a `apiClient` requiere cambiar TODOS estos archivos.
- Los tests que mockean `fetch` globalmente (`vi.fn()`) deberian seguir funcionando si `apiClient` usa `fetch` internamente.
- `features/auth/api.ts` (login) NO usa `createAuthHeaders` porque el login es pre-autenticacion — este archivo NO debe usar `apiClient`.
- **RECOMENDACION:** Si se implementa, hacer en un solo commit atomico para no dejar features en estados mixtos (unas con apiClient, otras con fetch directo).

---

### M28 — Eliminar schema muerto MetricsSummaryResponse [LOW]

**Archivos a modificar:**
- `backend/schemas/metrics.py`

Eliminar `MetricsSummaryResponse` si no se usa en ningun endpoint.

**Verificacion:** Grep por `MetricsSummaryResponse` en todo el backend. Si no hay uso, borrar.

**Riesgo:** NULO.

---

## Orden de Ejecucion Recomendado

### Bloque 1 — CRITICAL (hacer primero, en este orden)
1. M01 — python-jose -> PyJWT (porque todo lo demas depende de JWT funcionando)
2. M06 — Corregir 4 tests rotos (para tener baseline verde)
3. M05 — Ruta 404
4. M04 — Error boundaries
5. M02 — Logging estructurado
6. M03 — Rate limiting

### Bloque 2 — HIGH (hacer segundo)
7. M07 — CORS_ORIGINS a Settings
8. M08 — Health check con DB
9. M09 — Exception handler global
10. M13 — Security headers
11. M14 — Dockerfile non-root
12. M11 — Validacion JWT expiracion (frontend)
13. M10 — Validacion formularios (frontend)
14. M12 — Eliminar campos spoofable

### Bloque 3 — MEDIUM (hacer tercero)
15-24. M15 a M24 en cualquier orden

### Bloque 4 — LOW (si hay tiempo)
25-28. M25 a M28

---

## Grafo de Dependencias entre Modificaciones

Algunas modificaciones dependen de otras o deben coordinarse:

```
M02 (logging) ──> M09 (exception handler, usa logger de M02)
M02 (logging) ──> M13 (security headers, considerar combinar middlewares)
M13 (headers) ──> M02 (logging, mismo warning de BaseHTTPMiddleware)
M01 (PyJWT) ──> M06 (tests, correr tests DESPUES de M01 para verificar)
M07 (CORS Settings) ──> M18 (JWT validation, ambos tocan config.py)
M10 (validacion forms) ──> M12 (campos spoofable, si M12 elimina campos, M10 debe ajustarse)
M15 (paginacion) ──> M27 (apiClient, si se implementa apiClient, la paginacion debe usarlo)
M11 (JWT expiration) --> usa shared/auth/decodeTokenClaims (reusar, no duplicar)
```

### Modificaciones que pueden ejecutarse en PARALELO (sin dependencias entre si)

Frontend y backend son independientes entre si excepto cuando cambian contratos API.

**Paralelo seguro:**
- M04 + M05 + M06 (todas frontend, archivos distintos)
- M01 + M04 (backend y frontend, sin interaccion)
- M13 + M14 (backend, archivos distintos: main.py vs Dockerfile)
- M19 + M20 + M25 (frontend, features distintas)
- M16 + M17 + M24 (backend, archivos distintos: models vs database.py vs main.py)

**NO paralelizar:**
- M02 + M09 + M13 (todos tocan main.py y usan middlewares)
- M07 + M08 + M09 (todos tocan main.py)
- M01 + M03 (ambos tocan auth.py)

---

## Referencia Rapida — Archivos mas tocados

| Archivo | Modificaciones que lo tocan |
|---------|-----------------------------|
| `backend/main.py` | M02, M03, M07, M08, M09, M13, M24 |
| `backend/auth.py` | M01, M02, M03 |
| `backend/config.py` | M07, M18 |
| `backend/requirements.txt` | M01, M03, M21, M22 |
| `backend/database.py` | M17 |
| `frontend/src/app/router/AppRouter.tsx` | M04, M05, M23 |
| `frontend/src/features/auth/AuthContext.tsx` | M11 |
| `frontend/src/features/auth/LoginView.tsx` | M10 |
| `frontend/src/features/users/pages/UsersPage.tsx` | M10 |
| `frontend/src/app/layouts/DashboardLayout.tsx` | M20 |

> **ADVERTENCIA:** `backend/main.py` es tocado por 7 modificaciones distintas. Coordinar cuidadosamente el orden. Recomendacion: hacer M07 primero (mover CORS), luego M02+M09+M13 juntos (middlewares + exception handler), luego M08 (health check), luego M24 (metadata OpenAPI).
