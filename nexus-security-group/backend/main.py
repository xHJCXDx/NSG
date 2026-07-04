from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from routers import metrics, n8n, threats

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

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
