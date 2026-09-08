from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from routers import activity, alerts, dashboard, keywords, logs, metrics, n8n, permissions, threats, users

app = FastAPI(title="Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(metrics.router)
app.include_router(n8n.router)
app.include_router(threats.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(keywords.router)
app.include_router(logs.router)
app.include_router(activity.router)
app.include_router(permissions.router)
app.include_router(users.router)

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
