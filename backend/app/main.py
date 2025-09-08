from fastapi import FastAPI, WebSocket
from . import models, schemas, database, events
from app.routers.projects import router as projects_router
from fastapi.middleware.cors import CORSMiddleware
from .realtime import router as realtime_router  # exposes GET /stream (SSE)


app = FastAPI(title="Project Management Dashboard")

# Allow requests from your frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],    # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],
)

# include routers
app.include_router(projects_router, prefix="/projects", tags=["projects"])
app.include_router(realtime_router)  # <-- exposes GET /stream

@app.get("/health")
def health():
    return {"status": "ok"}