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

from fastapi.staticfiles import StaticFiles
from config import ALLOWED_ORIGINS, RATE_LIMIT_FREE
from routes import auth, render, identify, mferfy, scene, gmgn, create

FRONTEND_DIR = Path("/Users/mfergpt/dev/mfergpt-studio/frontend/dist")

# Layer directories
OG_LAYERS_DIR = Path("/Users/mfergpt/.openclaw/workspace/data/mfer-layers")
DERIVATIVE_LAYERS_DIR = Path("/Users/mfergpt/.openclaw/workspace/data/derivative-layers")
EXTENDED_LAYERS_DIR = Path("/Users/mfergpt/.openclaw/workspace/data/mfer-layers-extended")

# Map UI collection names → derivative directory names
DERIVATIVE_DIR_MAP = {
    "creyzies": "creyzies",
    "eos": "eos",
    "fineart": "fineArtMfers",
    "mfersahead": "mfersAhead",
    "mfersbehind": "mfersBehind",
    "sketchy": "sketchyMfers",
    "somfers": "somfers",
    "mfpurrs": "mfpurrs",
    "tinydinos": "tinyDinos",
    "3d": "3d",
}

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
    if "server" in response.headers:
        del response.headers["server"]
    return response

# Routes — all under /api to avoid SPA conflicts
app.include_router(auth.router, prefix="/api")
app.include_router(render.router, prefix="/api")
app.include_router(identify.router, prefix="/api")
app.include_router(mferfy.router, prefix="/api")
app.include_router(scene.router, prefix="/api")
app.include_router(gmgn.router, prefix="/api")
app.include_router(create.router, prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "mfergpt-studio"}

@app.get("/api/mfer/{mfer_id}")
async def get_mfer(mfer_id: int):
    from security import validate_mfer_id
    mid = validate_mfer_id(mfer_id)
    return {
        "id": mid,
        "headUrl": f"https://heads.mfers.dev/{mid}.png",
        "clearUrl": f"https://clear.mfers.dev/{mid}.png",
    }

@app.get("/api/layers/{collection}")
async def list_layers(collection: str):
    """List available layer files per category for a collection."""
    if collection == "og":
        base = OG_LAYERS_DIR
    elif collection == "extended":
        base = EXTENDED_LAYERS_DIR
    else:
        dirname = DERIVATIVE_DIR_MAP.get(collection)
        if not dirname:
            return JSONResponse({"error": "unknown collection"}, status_code=404)
        base = DERIVATIVE_LAYERS_DIR / dirname
    if not base.is_dir():
        return JSONResponse({"error": "collection not found"}, status_code=404)
    result = {}
    for subdir in sorted(base.iterdir()):
        if not subdir.is_dir():
            continue
        files = sorted(
            f.name for f in subdir.iterdir()
            if f.is_file() and f.suffix.lower() == ".png" and f.name != "none.png"
        )
        if files:
            result[subdir.name] = files
    return result

# Serve OG mfer layers as static files
if OG_LAYERS_DIR.is_dir():
    app.mount("/layers/og", StaticFiles(directory=str(OG_LAYERS_DIR)), name="og-layers")

# Serve extended layers (must be mounted BEFORE the general derivatives mount)
if EXTENDED_LAYERS_DIR.is_dir():
    app.mount("/layers/derivatives/extended", StaticFiles(directory=str(EXTENDED_LAYERS_DIR)), name="extended-layers")

# Serve derivative layers as static files
if DERIVATIVE_LAYERS_DIR.is_dir():
    app.mount("/layers/derivatives", StaticFiles(directory=str(DERIVATIVE_LAYERS_DIR)), name="derivative-layers")

# Serve frontend — must be LAST (catch-all)
if FRONTEND_DIR.exists():
    from fastapi.responses import HTMLResponse, Response

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Try to serve static file first
        file_path = FRONTEND_DIR / full_path
        # Security: ensure resolved path is within FRONTEND_DIR
        try:
            file_path = file_path.resolve()
            if not str(file_path).startswith(str(FRONTEND_DIR.resolve())):
                return HTMLResponse(content=(FRONTEND_DIR / "index.html").read_text())
        except Exception:
            return HTMLResponse(content=(FRONTEND_DIR / "index.html").read_text())

        if file_path.is_file():
            ext = file_path.suffix.lower()
            content_types = {
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.html': 'text/html',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.otf': 'font/otf',
                '.ttf': 'font/ttf',
                '.json': 'application/json',
            }
            ct = content_types.get(ext, 'application/octet-stream')
            return Response(content=file_path.read_bytes(), media_type=ct)

        # SPA fallback — serve index.html for client-side routing
        return HTMLResponse(content=(FRONTEND_DIR / "index.html").read_text())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",  # localhost only — exposed via tunnel
        port=8080,
        log_level="info",
    )
