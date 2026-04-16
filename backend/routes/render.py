"""Render routes — theme renders (free) and custom renders (gated)."""
import asyncio
import glob
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
import httpx
from security import validate_mfer_id, validate_theme, validate_prompt, validate_collection, require_token_gate
from config import SCRIPTS_DIR, OUTPUT_DIR, ALLOWED_THEMES, CYBERMFER_CDN_URL

router = APIRouter(tags=["render"])

class RenderRequest(BaseModel):
    mferId: int
    theme: str
    animated: bool = True
    format: str = "gif"  # gif (default), png, mp4
    collection: str | None = None

class CustomRenderRequest(BaseModel):
    mferId: int
    prompt: str
    animated: bool = False

@router.get("/themes")
async def list_themes():
    return [{"name": t} for t in sorted(ALLOWED_THEMES)]

def _find_output(base_path: Path) -> Path | None:
    """Find the actual output file — mfer_gen may change the extension (gif vs png vs mp4)."""
    stem = base_path.stem
    parent = base_path.parent
    for ext in ['.gif', '.png', '.mp4', '.jpg', '.webp']:
        candidate = parent / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    # Also check if the script wrote to stdout with "Done: /path"
    return None

def _ensure_output_dir():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def _media_type(path: Path) -> str:
    ext = path.suffix.lower()
    return {
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.jpg': 'image/jpeg',
        '.mp4': 'video/mp4',
        '.webp': 'image/webp',
    }.get(ext, 'application/octet-stream')

@router.post("/render")
async def render(req: RenderRequest):
    """Free theme render — whitelisted themes only, no user input in shell."""
    mfer_id = validate_mfer_id(req.mferId)
    theme = validate_theme(req.theme)
    _ensure_output_dir()

    job_id = uuid.uuid4().hex[:12]
    output_base = OUTPUT_DIR / f"render-{job_id}"
    output_requested = output_base.with_suffix(".png")

    # Validate collection if provided
    collection = None
    if req.collection:
        collection = validate_collection(req.collection)

    # For 3d collection: download CDN PNG and use --from-image
    from_image_path = None
    if collection == "3d":
        import httpx
        cdn_url = f"{CYBERMFER_CDN_URL}/{mfer_id}.png"
        from_image_path = OUTPUT_DIR / f"3d-source-{job_id}.png"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(cdn_url)
            if resp.status_code != 200:
                return {"error": f"failed to download 3d mfer #{mfer_id} from CDN"}
            from_image_path.write_bytes(resp.content)

    # Build command as ARRAY — never shell=True, never string interpolation
    cmd = ["python3", "-m", "mfer_gen"]
    if from_image_path:
        cmd.extend(["--from-image", str(from_image_path)])
    else:
        cmd.extend(["--id", str(mfer_id)])
    cmd.extend(["--theme", theme, "-o", str(output_requested)])
    if collection and collection != "3d":
        cmd.extend(["--collection", collection])
    
    # Format: gif (animated, default), png (static), mp4 (animated video)
    fmt = req.format.lower()
    if fmt == "png":
        cmd.append("--static")
    elif fmt == "mp4":
        cmd.append("--animated")
        output_requested = output_base.with_suffix(".mp4")
        cmd[cmd.index("-o") + 1] = str(output_requested)
    else:
        # gif (default) — animated
        cmd.append("--animated")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(SCRIPTS_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

    # Find actual output — script may have used different extension
    output = _find_output(output_base)

    # Also check stdout for "Done: /path" line
    if not output:
        for line in stdout.decode().split('\n'):
            if line.strip().startswith('Done:'):
                done_path = Path(line.strip().split('Done:', 1)[1].strip())
                if done_path.exists():
                    # Copy to our output dir for security
                    import shutil
                    safe_output = OUTPUT_DIR / f"render-{job_id}{done_path.suffix}"
                    shutil.copy2(done_path, safe_output)
                    output = safe_output
                    break

    if proc.returncode != 0 or not output:
        return {"error": "render failed", "detail": stderr.decode()[-500:] + " | " + stdout.decode()[-500:]}

    # Watermark
    await _watermark(output)

    return FileResponse(output, media_type=_media_type(output), filename=f"mfer-{mfer_id}-{theme}{output.suffix}")

@router.post("/render-custom")
async def render_custom(req: CustomRenderRequest, user: dict = Depends(require_token_gate)):
    """Token-gated custom theme render."""
    mfer_id = validate_mfer_id(req.mferId)
    prompt = validate_prompt(req.prompt)
    _ensure_output_dir()

    job_id = uuid.uuid4().hex[:12]
    output_base = OUTPUT_DIR / f"custom-{job_id}"
    output_requested = output_base.with_suffix(".png")

    cmd = [
        "python3", "-m", "mfer_gen",
        "--id", str(mfer_id),
        "--theme", "custom",
        "--custom-prompt", prompt,
        "-o", str(output_requested),
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

    output = _find_output(output_base)
    if not output:
        for line in stdout.decode().split('\n'):
            if line.strip().startswith('Done:'):
                done_path = Path(line.strip().split('Done:', 1)[1].strip())
                if done_path.exists():
                    import shutil
                    safe_output = OUTPUT_DIR / f"custom-{job_id}{done_path.suffix}"
                    shutil.copy2(done_path, safe_output)
                    output = safe_output
                    break

    if proc.returncode != 0 or not output:
        return {"error": "render failed", "detail": stderr.decode()[-500:]}

    await _watermark(output)

    return FileResponse(output, media_type=_media_type(output), filename=f"mfer-{mfer_id}-custom{output.suffix}")

async def _watermark(filepath: Path):
    """Run watermark script — no user input involved."""
    from config import WATERMARK_SCRIPT
    proc = await asyncio.create_subprocess_exec(
        "python3", str(WATERMARK_SCRIPT), str(filepath),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await asyncio.wait_for(proc.communicate(), timeout=30)
