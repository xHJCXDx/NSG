# NSG — Arquitectura del Sistema

**Ultima actualizacion:** 2026-09-17
**Stack:** React 18 + FastAPI + PostgreSQL 15 + n8n 2.39.7 + Traefik 2.10 + Sentiment API (Flask)

---

## 1. Vista General — Servicios Docker

```
                         [Internet]
                             |
              +--------------+---------------+
              |              |               |
         hn.algolia.com  exploit-db.com  github.com
              |              |               |
              +--------------+---------------+
                             |
                          [n8n] :5678
                             |
              +--------------+---------------+
              |              |               |
       [sentiment-api]  [postgres]      [SMTP/Slack]
           :5000            :5432
              |              |
              |     +--------+--------+
              |     |                 |
              |  osint_db        n8n_internal
              |     |
              |     |
           [dashboard-api] :8000
                    |
                 [traefik] :80
                    |
              +-----+-----+
              |           |
         /api/*      todo lo demas
              |           |
       [dashboard-api]  [frontend] :4173
                          |
                      [Browser]
```

### Tabla de Servicios

| Servicio | Container | Imagen/Build | Puerto Host | Puerto Interno | Healthcheck |
|----------|-----------|-------------|-------------|----------------|-------------|
| postgres | osint-postgres | postgres:15 | — | 5432 | `pg_isready` |
| n8n | osint-n8n | n8nio/n8n:2.39.7 | 5678 | 5678 | — |
| n8n-import | — | n8nio/n8n:2.39.7 | — | — | run-once (profile: tools) |
| sentiment-api | osint-sentiment-api | ./sentiment-api | — | 5000 | `urllib.request.urlopen` |
| dashboard-api | osint-dashboard-api | ./backend | — | 8000 | `urlopen /api/health` |
| frontend | osint-frontend | ./frontend | — | 4173 | `wget :4173/` |
| traefik | osint-traefik | traefik:v2.10 | 80 | 80 | — |

**Red:** Todos en `nexus-net` (bridge). Solo traefik (:80) y n8n (:5678) expuestos al host.

---

## 2. Comunicacion entre Servicios

### Mapa de conexiones

```
Browser  ──HTTP:80──>  Traefik
                         ├── Host(localhost) && PathPrefix(/api)  ──>  dashboard-api:8000
                         └── Host(localhost)                      ──>  frontend:4173

dashboard-api  ──TCP:5432──>  postgres (osint_db)
dashboard-api  ──HTTP:5678──>  n8n /webhook/{id}  (proxy, sin auth adicional)

n8n  ──TCP:5432──>  postgres (osint_db)      ← datos del pipeline
n8n  ──TCP:5432──>  postgres (n8n_internal)   ← estado interno n8n
n8n  ──HTTP:5000──>  sentiment-api /analyze   ← Bearer SENTIMENT_API_TOKEN
n8n  ──HTTPS:443──>  hn.algolia.com           ← Hacker News API
n8n  ──HTTPS:443──>  exploit-db.com           ← RSS feed
n8n  ──HTTPS:443──>  github.com               ← GitHub Issues API
n8n  ──HTTPS──>  Slack webhook               ← PLACEHOLDER (no configurado)
n8n  ──SMTP──>  Gmail                        ← credential configurada
```

### Tabla detallada

| Origen | Destino | Protocolo | Puerto | Auth | Patron URL |
|--------|---------|-----------|--------|------|------------|
| Browser | Traefik | HTTP | 80 | — | `http://localhost/*` |
| Traefik | frontend | HTTP | 4173 | — | label: `Host(localhost)` |
| Traefik | dashboard-api | HTTP | 8000 | — | label: `Host(localhost) && PathPrefix(/api)` |
| frontend | dashboard-api | HTTP via Traefik | 80->8000 | JWT Bearer header | `/api/*` |
| dashboard-api | postgres | TCP/PostgreSQL | 5432 | user/pass env | `postgresql://user:pass@postgres:5432/osint_db` |
| dashboard-api | n8n | HTTP | 5678 | ninguna (protegido por JWT en backend) | `http://n8n:5678/webhook/{webhook_id}` |
| n8n | postgres (osint_db) | TCP/PostgreSQL | 5432 | credential n8n | INSERT/SELECT en tablas de datos |
| n8n | postgres (n8n_internal) | TCP/PostgreSQL | 5432 | credential n8n | tablas internas de n8n |
| n8n | sentiment-api | HTTP | 5000 | Bearer SENTIMENT_API_TOKEN | `http://sentiment-api:5000/analyze` |
| n8n | APIs externas | HTTPS | 443 | ninguna (rate limit anonimo) | Hacker News, Exploit-DB, GitHub |
| n8n | Slack | HTTPS | 443 | webhook URL | PLACEHOLDER |
| n8n | Gmail | SMTP | 465 SSL/TLS | App Password | credential SMTP |

---

## 3. Base de Datos — Schema y Dependencias FK

### Cadena de dependencias (orden de creacion)

```
[Sin FK - tablas raiz]
├── social_mentions           ← tabla raiz del pipeline OSINT
├── keywords_monitor          ← keywords independientes
├── execution_logs            ← logs de ejecucion independientes
├── permissions               ← catalogo de permisos
└── system_users              ← usuarios del dashboard

[Con FK - nivel 1]
├── sentiment_analysis        ← FK → social_mentions (mention_id) CASCADE
├── role_permissions          ← FK → permissions (permission_id) CASCADE
└── user_activity             ← FK → social_mentions SET NULL (nullable)
                                FK → threat_detections SET NULL (nullable)
                                FK → alerts SET NULL (nullable)

[Con FK - nivel 2]
├── threat_detections         ← FK → social_mentions (mention_id) CASCADE
│                               FK → sentiment_analysis (sentiment_id) SET NULL

[Con FK - nivel 3]
└── alerts                    ← FK → threat_detections (detection_id) CASCADE
```

### Diagrama FK

```
social_mentions ──(1:1)──> sentiment_analysis
       │                          │
       │                          │ (SET NULL)
       │                          ▼
       └──────(1:1)──────> threat_detections
                                  │
                                  │ (CASCADE)
                                  ▼
                               alerts
                                  │
                                  │ (SET NULL)
                                  ▼
                           user_activity

permissions ──(1:N)──> role_permissions ──(N:1)──> [role string]

system_users (sin FK, role CHECK admin|analyst)
keywords_monitor (sin FK, trigger actualiza match_count)
execution_logs (sin FK, trigger calcula duration)
```

### Databases PostgreSQL

| Database | Usado por | Proposito |
|----------|-----------|-----------|
| `osint_db` | dashboard-api, n8n (workflow) | Datos del pipeline OSINT + usuarios + permisos |
| `n8n_internal` | n8n (servicio) | Estado interno: workflows, credenciales, ejecuciones |

### Triggers de servidor

| Trigger | Tabla | Evento | Accion |
|---------|-------|--------|--------|
| `update_social_mentions_last_updated` | social_mentions | BEFORE UPDATE | Actualiza `last_updated` |
| `update_threat_detections_last_updated` | threat_detections | BEFORE UPDATE | Actualiza `last_updated` |
| `update_alerts_last_updated` | alerts | BEFORE UPDATE | Actualiza `last_updated` |
| `trigger_calculate_duration` | execution_logs | BEFORE INSERT/UPDATE | Calcula `duration_seconds` |
| `trigger_update_keyword_match` | social_mentions | AFTER INSERT | Actualiza `match_count` y `last_match_at` en keywords_monitor |
| `update_system_users_updated_at` | system_users | BEFORE UPDATE | Actualiza `updated_at` |
| `update_permissions_updated_at` | permissions | BEFORE UPDATE | Actualiza `updated_at` |

### Roles PostgreSQL

| Rol | Privilegios |
|-----|-------------|
| `osint_admin` | ALL en todas las tablas |
| `osint_analyst` | SELECT en todo; INSERT/UPDATE en threat_detections, alerts, user_activity |
| `osint_readonly` | SELECT en todo |
| `appsmith_readonly` | Hereda osint_readonly; solo acceso a vistas |

### Row Level Security

- `social_mentions`: RLS activado, policy SELECT para todos los roles
- `threat_detections`: RLS activado, osint_analyst solo ve `reviewed_by = current_user OR reviewed_by IS NULL`

### Vistas y Materialized Views

| Vista | Tipo | Proposito |
|-------|------|-----------|
| `daily_mention_stats` | MATERIALIZED | Agregacion por fecha/plataforma/sentimiento (90 dias) |
| `top_keywords_stats` | MATERIALIZED | Keywords con mas detecciones (30 dias) |
| `workflow_performance_stats` | MATERIALIZED | Ejecuciones por workflow y fecha (30 dias) |
| `daily_activity_summary` | VIEW | Totales del dia |
| `unresolved_threats` | VIEW | Amenazas high/critical pendientes |
| `recent_mentions_dashboard` | VIEW | Joins mentions + sentiment |
| `recent_alerts_dashboard` | VIEW | Joins alerts + detections |

---

## 4. Backend — Estructura Interna

### Modulos y dependencias

```
config.py (Settings: DATABASE_URL, JWT_SECRET_KEY, ADMIN_USER, ADMIN_PASSWORD, N8N_INTERNAL_URL)
    │
    ├──> database.py (create_engine, SessionLocal, get_db)
    │        │
    │        └──> Todos los routers (via Depends(get_db))
    │
    └──> auth.py (JWT, RBAC, hash_password, require_permission)
             │
             ├──> Todos los routers (via Depends(require_permission("resource","action")))
             └──> routers/users.py (usa hash_password)

models/__init__.py
    ├── social_mention.py     (SocialMention)
    ├── sentiment_analysis.py (SentimentAnalysis)
    ├── threat_detection.py   (ThreatDetection → rel: SocialMention, SentimentAnalysis)
    ├── alert.py              (Alert → rel: ThreatDetection)
    ├── keyword_monitor.py    (KeywordMonitor)
    ├── execution_log.py      (ExecutionLog)
    ├── user_activity.py      (UserActivity → rel: SocialMention, ThreatDetection, Alert)
    ├── permission.py         (Permission, RolePermission)
    └── system_user.py        (SystemUser → rel: Permission via RolePermission)

schemas/
    ├── auth.py       (Token, TokenData)
    ├── alert.py      (AlertListResponse, AlertDetailResponse, AcknowledgeRequest)
    ├── dashboard.py  (DashboardSummaryResponse)
    ├── keyword.py    (KeywordCreateRequest, KeywordUpdateRequest, KeywordResponse)
    ├── log.py        (ExecutionLogListResponse, ExecutionLogDetailResponse)
    ├── activity.py   (UserActivityListResponse, UserActivityDetailResponse)
    ├── metrics.py    (MetricsSummaryEndpointResponse, MetricsSummaryResponse [MUERTO])
    ├── permission.py (PermissionResponse, RolePermissionsUpdate)
    ├── threat.py     (ThreatListResponse, ThreatDetailResponse, ThreatReviewRequest)
    └── user.py       (UserCreate, UserUpdate, UserResponse)
```

### Endpoints — Tabla completa

| Metodo | Endpoint | Router | Permiso | Modelos | Schema Response |
|--------|----------|--------|---------|---------|-----------------|
| POST | /api/auth/login | auth.py | ninguno | SystemUser | Token |
| POST | /api/auth/logout | auth.py | ninguno | — | dict |
| GET | /api/health | main.py | ninguno | — | dict |
| GET | /api/dashboard/summary | dashboard.py | dashboard:read | ThreatDetection, Alert, KeywordMonitor, ExecutionLog, UserActivity | DashboardSummaryResponse |
| GET | /api/metrics/summary | metrics.py | metrics:read | SocialMention, SentimentAnalysis, Alert | MetricsSummaryEndpointResponse |
| GET | /api/metrics/mentions | metrics.py | mentions:read | SocialMention, SentimentAnalysis | list[dict] |
| POST | /api/n8n/webhook/{id} | n8n.py | workflows:execute | — (proxy) | passthrough |
| GET | /api/threats | threats.py | threats:read | ThreatDetection, SocialMention | list[ThreatListResponse] |
| GET | /api/threats/{id} | threats.py | threats:read | ThreatDetection, SocialMention | ThreatDetailResponse |
| PATCH | /api/threats/{id}/review | threats.py | threats:write | ThreatDetection | ThreatDetailResponse |
| GET | /api/alerts | alerts.py | alerts:read | Alert | list[AlertListResponse] |
| GET | /api/alerts/{id} | alerts.py | alerts:read | Alert | AlertDetailResponse |
| PATCH | /api/alerts/{id}/acknowledge | alerts.py | alerts:write | Alert | AlertDetailResponse |
| GET | /api/keywords | keywords.py | keywords:read | KeywordMonitor | list[KeywordResponse] |
| POST | /api/keywords | keywords.py | keywords:write | KeywordMonitor | KeywordResponse |
| GET | /api/keywords/{id} | keywords.py | keywords:read | KeywordMonitor | KeywordResponse |
| PATCH | /api/keywords/{id} | keywords.py | keywords:write | KeywordMonitor | KeywordResponse |
| DELETE | /api/keywords/{id} | keywords.py | keywords:delete | KeywordMonitor | 204 |
| GET | /api/logs | logs.py | logs:read | ExecutionLog | list[ExecutionLogListResponse] |
| GET | /api/logs/{id} | logs.py | logs:read | ExecutionLog | ExecutionLogDetailResponse |
| GET | /api/activity | activity.py | logs:read | UserActivity | list[UserActivityListResponse] |
| GET | /api/activity/{id} | activity.py | logs:read | UserActivity | UserActivityDetailResponse |
| GET | /api/permissions | permissions.py | permissions:read | Permission, RolePermission | list[PermissionResponse] |
| PUT | /api/permissions/roles/{role} | permissions.py | permissions:write | Permission, RolePermission | list[PermissionResponse] |
| POST | /api/users | users.py | users:write | SystemUser | UserResponse |
| GET | /api/users | users.py | users:read | SystemUser | list[UserResponse] |
| PATCH | /api/users/{id} | users.py | users:write | SystemUser | UserResponse |

### Sistema de Permisos (RBAC)

```
JWT payload contiene:
{
  "sub": "username",
  "role": "admin|analyst",
  "auth_source": "database|bootstrap",
  "user_id": 1,
  "permissions": ["alerts:read", "alerts:write", ...],
  "exp": 1726614000
}

Flujo de autenticacion:
1. POST /api/auth/login (username + password)
2. Si hay usuarios en system_users → valida contra DB (pbkdf2_sha256 o bcrypt legacy)
3. Si la tabla esta vacia → valida contra ADMIN_USER/ADMIN_PASSWORD del env (bootstrap)
4. Genera JWT con claims incluyendo permissions[] del usuario
5. Frontend almacena token en localStorage ("nsg:auth:token")
6. Cada request envia "Authorization: Bearer <token>"
7. require_permission(resource, action) verifica "resource:action" en permissions[] del JWT
```

#### Permisos por rol

| Permiso | Admin | Analyst |
|---------|-------|---------|
| dashboard:read | SI | SI |
| metrics:read | SI | SI |
| mentions:read | SI | SI |
| threats:read | SI | SI |
| threats:write | SI | SI |
| alerts:read | SI | SI |
| alerts:write | SI | SI |
| keywords:read | SI | SI |
| keywords:write | SI | SI |
| keywords:delete | SI | NO |
| workflows:read | SI | SI |
| workflows:execute | SI | SI |
| logs:read | SI | SI |
| users:read | SI | NO |
| users:write | SI | NO |
| users:delete | SI | NO |
| permissions:read | SI | NO |
| permissions:write | SI | NO |

---

## 5. Frontend — Estructura Interna

### Arbol de composicion

```
main.tsx
└── App.tsx
    ├── AppProviders.tsx
    │   ├── QueryClientProvider (staleTime: 60s, retry: 1)
    │   └── AuthProvider
    │       ├── estado: token ← localStorage "nsg:auth:token"
    │       ├── claims: decodeTokenClaims() → {sub, role, permissions[]}
    │       └── expone: token, login(), logout(), isAuthenticated,
    │                   claims, hasPermission(), role, isAdmin
    └── AppRouter.tsx
        ├── /login → LoginView
        └── / → ProtectedRoute → DashboardLayout
            ├── index → ProtectedRoute(dashboard:read) → DashboardPage
            │   ├── Dashboard (recharts + useDashboardSummary)
            │   └── AutomationTriggers (useTriggerWorkflow)
            ├── /mentions → ProtectedRoute(mentions:read) → MentionsPage
            ├── /threats → ProtectedRoute(threats:read) → ThreatsPage
            ├── /users → ProtectedRoute(users:read) → UsersPage
            ├── /analytics → ProtectedRoute(metrics:read) → AnalyticsPage [placeholder]
            └── /settings → ProtectedRoute(permissions:read) → SettingsPage [placeholder]
```

### Dependencias entre features

```
                    shared/
            ┌────────────────────────┐
            │ api/authHeaders.ts     │ ← usado por 6 features (todas menos auth)
            │ auth/decodeTokenClaims │ ← usado por auth/AuthContext
            │ storage/tokenStorage   │ ← usado por auth/AuthContext
            │ test/createTestQClient │ ← usado por tests
            └────────────────────────┘
                       ▲
          ┌────────────┼────────────────┐
          │            │                │
    ┌─────┴─────┐  ┌──┴───┐   ┌───────┴───────┐
    │   auth    │  │ otros │   │  automation   │
    │ (barrel)  │  │ feat  │   │   (barrel)    │
    │           │  │       │   │               │
    │ AuthProv  │  │       │   │ AutoTriggers  │
    │ useAuth   │◄─┤       │   │ useTrigger..  │
    │ LoginView │  │       │   │               │
    └───────────┘  └───────┘   └───────┬───────┘
          ▲                            │
          │                            │
          └────────────────────────────┘
          (automation importa useAuth via barrel)

    ┌──────────┐
    │dashboard │
    │ (barrel) │──> importa AutomationTriggers via barrel
    │          │
    │ DashPage │ = Dashboard + AutomationTriggers
    └──────────┘

Cross-feature imports (solo 2, ambos via barrel):
  1. dashboard/pages/DashboardPage → features/automation (barrel)
  2. automation/* → features/auth (barrel)
  (todos los hooks de features usan auth via barrel — esto es normal)
```

### Endpoints consumidos por cada feature

| Feature | Endpoint Backend | Metodo | Hook |
|---------|-----------------|--------|------|
| auth | POST /api/auth/login | fetch directo | — (en LoginView) |
| dashboard | GET /api/dashboard/summary | fetch + Bearer | useDashboardSummary |
| mentions | GET /api/metrics/mentions?limit=50 | fetch + Bearer | useMentions |
| threats | GET /api/threats?limit=50 | fetch + Bearer | useThreats |
| users | GET /api/users | fetch + Bearer | useUsersQuery |
| users | POST /api/users | fetch + Bearer | useCreateUserMutation |
| automation | POST /api/n8n/webhook/osint-trigger | fetch + Bearer | useTriggerWorkflow |
| metrics | GET /api/metrics/summary | fetch + Bearer | — (sin hook, solo api.ts) |

### Shared modules — Fan-in

| Modulo | Consumidores |
|--------|-------------|
| `shared/api/authHeaders` | automation/api, dashboard/api, mentions/api, metrics/api, threats/api, users/api |
| `shared/storage/tokenStorage` | auth/AuthContext (get/set/remove) |
| `shared/auth/decodeTokenClaims` | auth/AuthContext |
| `shared/test/createTestQueryClient` | 6 archivos de test |

---

## 6. n8n Workflow — Pipeline OSINT

### Stages del workflow

```
[TRIGGER] ─────────────────────────────────────────────────
  ├── Schedule Every 15 Minutes (scheduleTrigger)
  └── Manual OSINT Trigger (webhook: POST /webhook/osint-trigger)
         │
[STAGE 1: INGESTION] ─────────────────────────────────────
         ├── Hacker News API Search → Parse Items
         ├── Fetch Exploit-DB RSS → Parse RSS Items
         └── Fetch GitHub Security Issues → Parse GitHub Issues
         │
         └── Deduplicate (intra-ejecucion por platform::external_id)
         │
[STAGE 2: ANALYSIS] ──────────────────────────────────────
         ├── Prep Existing Check → Check Existing IDs (SQL SELECT)
         ├── Filter Already Processed (elimina items ya en BD)
         ├── Sentiment Analysis (POST sentiment-api:5000/analyze)
         └── Classify Threat (funcion JS: score ponderado por keywords + sentiment)
         │
[STAGE 3: STORAGE] ───────────────────────────────────────
         ├── Insert Social Mention (ON CONFLICT DO UPDATE)
         ├── Insert Sentiment Analysis (ON CONFLICT DO UPDATE)
         └── Insert Threat Detection (ON CONFLICT DO UPDATE)
         │
[STAGE 4: ALERTING] ──────────────────────────────────────
         ├── IF criticality == 'critical' OR 'high'
         │   ├── Build Alert Content
         │   ├── Send Slack Alert (PLACEHOLDER)
         │   ├── Send Gmail Alert (SMTP configurado)
         │   └── Log Alert in DB (INSERT alerts)
         └── ELSE → Summarize Skipped Items
         │
[STAGE 5: LOGGING] ───────────────────────────────────────
         └── Log Execution (INSERT execution_logs)
```

### Clasificacion de amenazas (Classify Threat)

Score ponderado por keywords:
- ransomware, zero-day: 30 pts
- phishing, malware: 20 pts
- vulnerability, exploit: 15 pts

Boosts:
- Sentimiento negativo: +15
- Engagement alto: +5/10/20
- Autor verificado: +10
- URLs sospechosas: +15

Resultado → criticality_level: low (<20), medium (20-39), high (40-59), critical (>=60)

### Mapeo de severidad para alertas

| criticality_level | alert_severity |
|-------------------|----------------|
| low | info |
| medium | warning |
| high | high |
| critical | critical |

---

## 7. Sentiment API

**Path:** `sentiment-api/`
**Framework:** Flask + Gunicorn
**Puerto:** 5000

### Endpoints

| Endpoint | Metodo | Auth | Descripcion |
|----------|--------|------|-------------|
| GET /health | — | ninguna | `{status: "healthy", version: "1.1"}` |
| POST /analyze | Bearer SENTIMENT_API_TOKEN | token via env | Analiza texto, retorna scores |

### Proceso de analisis

```
Texto entrada (max 5000 chars)
    │
    ├── VADER → {compound, pos, neu, neg}
    ├── TextBlob → {polarity, subjectivity}
    │
    └── Ensemble:
        final_score = (vader_compound + textblob_polarity) / 2
        label = positive (>=0.05) | negative (<=-0.05) | neutral
        confidence = 1 - (|vader - textblob| / 2) clamped [0,1]
```

### Seguridad

- Token comparado con `hmac.compare_digest` (timing-safe)
- Dockerfile usa usuario non-root `appuser`
- Limite de texto: 5000 chars (trunca con flag)

---

## 8. Variables de Entorno

### Requeridas (sin default, la app falla sin ellas)

| Variable | Usado por | Proposito |
|----------|-----------|-----------|
| POSTGRES_USER | postgres, dashboard-api, n8n | Usuario PostgreSQL |
| POSTGRES_PASSWORD | postgres, dashboard-api, n8n | Password PostgreSQL |
| POSTGRES_DB | postgres, dashboard-api | Nombre de la DB (osint_db) |
| JWT_SECRET_KEY | dashboard-api | Firma de tokens JWT HS256 |
| ADMIN_USER | dashboard-api | Usuario bootstrap (cuando no hay usuarios en DB) |
| ADMIN_PASSWORD | dashboard-api | Password bootstrap |
| N8N_BASIC_AUTH_USER | n8n | Auth basica UI de n8n |
| N8N_BASIC_AUTH_PASSWORD | n8n | Auth basica UI de n8n |
| N8N_ENCRYPTION_KEY | n8n | Cifrado de credenciales guardadas |
| SENTIMENT_API_TOKEN | n8n, sentiment-api | Token compartido para auth del API de sentimiento |

### Opcionales (con default)

| Variable | Default | Usado por |
|----------|---------|-----------|
| N8N_INTERNAL_URL | `http://n8n:5678` | dashboard-api |
| CORS_ORIGINS | `http://localhost:5173,http://localhost:3000,http://localhost` | dashboard-api (main.py) |

---

## 9. Mapa de Impacto — Que depende de que

### Si modificas auth.py...

Afecta a:
- TODOS los routers (usan `require_permission` o `get_current_user`)
- `routers/users.py` (usa `hash_password`)
- Frontend: `features/auth/api.ts` (consume POST /api/auth/login)
- Frontend: `shared/auth/decodeTokenClaims.ts` (decodifica payload JWT)
- Frontend: `features/auth/AuthContext.tsx` (maneja token)
- Tests: `backend/tests/conftest.py`, todos los test_*.py

### Si modificas database.py...

Afecta a:
- TODOS los routers (usan `Depends(get_db)`)
- `auth.py` (usa `Depends(get_db)` en login)

### Si modificas config.py (Settings)...

Afecta a:
- `database.py` (DATABASE_URL)
- `auth.py` (JWT_SECRET_KEY, ADMIN_USER, ADMIN_PASSWORD)
- `routers/n8n.py` (N8N_INTERNAL_URL)
- `main.py` (si se mueve CORS_ORIGINS aca)
- Tests: `test_config.py`

### Si modificas main.py...

Afecta a:
- Nada internamente (es el punto de entrada, no tiene dependientes)
- Docker healthcheck depende de GET /api/health

### Si modificas init.sql...

Afecta a:
- TODOS los modelos ORM (deben coincidir con el schema)
- n8n workflow (INSERT/SELECT directos contra las tablas)
- Vistas y materialized views
- Requiere recrear la DB (no hay Alembic)

### Si modificas workflow.json...

Afecta a:
- n8n (nodos, conexiones, credenciales)
- Las tablas de osint_db (INSERT directos)
- `routers/n8n.py` (proxy webhook, debe coincidir webhook_id)
- Frontend `features/automation/contract.ts` (webhookId: 'osint-trigger')

### Si modificas shared/api/authHeaders.ts...

Afecta a:
- 6 features: automation, dashboard, mentions, metrics, threats, users (todas sus api.ts)

### Si modificas shared/storage/tokenStorage.ts...

Afecta a:
- `features/auth/AuthContext.tsx`
- Tests que acceden a localStorage directamente con key "nsg:auth:token"

### Si modificas features/auth/AuthContext.tsx...

Afecta a:
- AppProviders.tsx (importa AuthProvider)
- TODOS los componentes que usan useAuth() (todos los hooks de features)
- ProtectedRoute.tsx
- DashboardLayout.tsx

### Si modificas schemas/...

Afecta a:
- El router que usa ese schema (response_model o request body)
- Tests del router
- Test contractual `test_router_response_models_contract.py`
- Frontend si cambia la forma de la respuesta

### Si modificas models/...

Afecta a:
- Los routers que query-an ese modelo
- El schema de BD (init.sql debe coincidir)
- n8n workflow (si hace INSERT directo a esa tabla)
- Tests unitarios que usan FakeDb con ese modelo

### Si modificas docker-compose.yml...

Afecta a:
- Traefik routing (labels)
- Healthchecks
- Variables de entorno de todos los servicios
- Volumenes y persistencia
- Puerto expuesto al host

### Si modificas requirements.txt...

Afecta a:
- Docker build del backend (pip install)
- Imports en todo el backend
- Tests (si cambia un API de libreria)
