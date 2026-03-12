"""Render routes — theme renders (free) and custom renders (gated)."""
import asyncio
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from security import validate_mfer_id, validate_theme, validate_prompt, require_token_gate
from config import SCRIPTS_DIR, OUTPUT_DIR, ALLOWED_THEMES

router = APIRouter(tags=["render"])

class RenderRequest(BaseModel):
    mferId: int
    theme: str
    animated: bool = False

class CustomRenderRequest(BaseModel):
    mferId: int
    prompt: str
    animated: bool = False

@router.get("/themes")
async def list_themes():
    return [{"name": t} for t in sorted(ALLOWED_THEMES)]

@router.post("/render")
async def render(req: RenderRequest):
    """Free theme render — whitelisted themes only, no user input in shell."""
    mfer_id = validate_mfer_id(req.mferId)
    theme = validate_theme(req.theme)

    job_id = uuid.uuid4().hex[:12]
    ext = "mp4" if req.animated else "png"
    output = OUTPUT_DIR / f"render-{job_id}.{ext}"

    # Build command as ARRAY — never shell=True, never string interpolation
    cmd = [
        "python3", "-m", "mfer_gen",
        "--id", str(mfer_id),
        "--theme", theme,
        "-o", str(output),
    ]
    if req.animated:
        cmd.append("--animated")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(SCRIPTS_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

    if proc.returncode != 0 or not output.exists():
        return {"error": "render failed", "detail": stderr.decode()[-500:]}

    # Watermark
    await _watermark(output)

    media_type = "video/mp4" if req.animated else "image/png"
    return FileResponse(output, media_type=media_type, filename=f"mfer-{mfer_id}-{theme}.{ext}")

@router.post("/render-custom")
async def render_custom(req: CustomRenderRequest, user: dict = Depends(require_token_gate)):
    """Token-gated custom theme render."""
    mfer_id = validate_mfer_id(req.mferId)
    prompt = validate_prompt(req.prompt)

    job_id = uuid.uuid4().hex[:12]
    ext = "mp4" if req.animated else "png"
    output = OUTPUT_DIR / f"custom-{job_id}.{ext}"

    cmd = [
        "python3", "-m", "mfer_gen",
        "--id", str(mfer_id),
        "--theme", "custom",
        "--custom-prompt", prompt,
        "-o", str(output),
    ]
    if req.animated:
        cmd.append("--animated")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(SCRIPTS_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)

    if proc.returncode != 0 or not output.exists():
        return {"error": "render failed", "detail": stderr.decode()[-500:]}

    await _watermark(output)

    media_type = "video/mp4" if req.animated else "image/png"
    return FileResponse(output, media_type=media_type, filename=f"mfer-{mfer_id}-custom.{ext}")

async def _watermark(filepath: Path):
    """Run watermark script — no user input involved."""
    from config import WATERMARK_SCRIPT
    proc = await asyncio.create_subprocess_exec(
        "python3", str(WATERMARK_SCRIPT), str(filepath),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await asyncio.wait_for(proc.communicate(), timeout=30)
