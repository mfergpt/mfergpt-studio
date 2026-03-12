"""mferGPT Studio API — secure backend for mfer content creation."""
import os
import sys
from pathlib import Path

# Load .env.local from workspace
from dotenv import load_dotenv
load_dotenv("/Users/mfergpt/.openclaw/workspace/.env.local")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import ALLOWED_ORIGINS, RATE_LIMIT_FREE
from routes import auth, render, identify, mferfy, scene

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT_FREE])

app = FastAPI(
    title="mferGPT Studio API",
    description="create mfer content. no rules.",
    version="0.1.0",
    docs_url=None,   # disable swagger in prod
    redoc_url=None,  # disable redoc in prod
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — LOCKED to our domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,
)

# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # No server version leaking
    response.headers.pop("server", None)
    return response

# Routes
app.include_router(auth.router)
app.include_router(render.router)
app.include_router(identify.router)
app.include_router(mferfy.router)
app.include_router(scene.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "mfergpt-studio"}

@app.get("/mfer/{mfer_id}")
async def get_mfer(mfer_id: int):
    from security import validate_mfer_id
    mid = validate_mfer_id(mfer_id)
    return {
        "id": mid,
        "headUrl": f"https://heads.mfers.dev/{mid}.png",
        "clearUrl": f"https://clear.mfers.dev/{mid}.png",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",  # localhost only — exposed via tunnel
        port=8080,
        log_level="info",
    )
