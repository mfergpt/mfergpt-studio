"""3D Scene generation route — token-gated, async job queue."""
import asyncio
import uuid
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import FileResponse
from security import require_token_gate, validate_prompt, validate_mfer_ids, validate_world
from config import SCENE_SCRIPTS_DIR, OUTPUT_DIR

router = APIRouter(tags=["scenes"])

# Simple in-memory job store (upgrade to Redis/DB for production)
_jobs: dict[str, dict] = {}
MAX_CONCURRENT_SCENES = 2
_active_scenes = 0

class SceneRequest(BaseModel):
    prompt: str
    mferIds: Optional[list[int]] = None
    world: Optional[str] = None

@router.post("/scene")
async def create_scene(req: SceneRequest, user: dict = Depends(require_token_gate)):
    """Queue a 3D scene render. Token-gated."""
    global _active_scenes

    prompt = validate_prompt(req.prompt)
    mfer_ids = validate_mfer_ids(req.mferIds or [])
    world = validate_world(req.world) if req.world else None

    if _active_scenes >= MAX_CONCURRENT_SCENES:
        raise HTTPException(status_code=429, detail="too many scenes rendering, try again in a few minutes")

    job_id = uuid.uuid4().hex[:12]
    output_path = OUTPUT_DIR / f"scene-{job_id}.mp4"

    _jobs[job_id] = {"status": "queued", "url": None, "output": str(output_path)}

    # Fire and forget
    asyncio.create_task(_render_scene(job_id, prompt, mfer_ids, world, output_path))

    return {"jobId": job_id}

@router.get("/scene/{job_id}")
async def get_scene_status(job_id: str):
    """Poll scene status."""
    # Validate job_id format — hex only
    if not job_id.isalnum() or len(job_id) > 20:
        raise HTTPException(status_code=400, detail="invalid job ID")
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="job not found")
    job = _jobs[job_id]
    result = {"status": job["status"]}
    if job["status"] == "done" and job.get("output"):
        result["url"] = f"/scene/{job_id}/download"
    if job.get("error"):
        result["error"] = job["error"]
    return result

@router.get("/scene/{job_id}/download")
async def download_scene(job_id: str):
    if not job_id.isalnum() or len(job_id) > 20:
        raise HTTPException(status_code=400, detail="invalid job ID")
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="job not found")
    job = _jobs[job_id]
    if job["status"] != "done":
        raise HTTPException(status_code=400, detail="scene not ready")
    output = Path(job["output"])
    if not output.exists():
        raise HTTPException(status_code=404, detail="file not found")
    # Ensure path is within our output dir (prevent traversal)
    if not str(output.resolve()).startswith(str(OUTPUT_DIR.resolve())):
        raise HTTPException(status_code=403, detail="access denied")
    return FileResponse(output, media_type="video/mp4", filename=f"mfer-scene-{job_id}.mp4")

async def _render_scene(job_id: str, prompt: str, mfer_ids: list[int], world: Optional[str], output: Path):
    global _active_scenes
    _active_scenes += 1
    _jobs[job_id]["status"] = "rendering"

    try:
        # Build command as array — NEVER shell=True
        cmd = [
            "bash", str(SCENE_SCRIPTS_DIR / "make-scene.sh"),
            prompt,
            "--model=sonnet",
            "--style=short",
        ]
        if world:
            cmd.append(f"--world={world}")
        if mfer_ids:
            cmd.append(f"--ids={','.join(str(i) for i in mfer_ids)}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(SCENE_SCRIPTS_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={
                "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
                "HOME": "/Users/mfergpt",
            },
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)

        # Find the output mp4 in stdout
        for line in stdout.decode().split('\n'):
            if line.strip().endswith('.mp4') and Path(line.strip()).exists():
                # Copy to our controlled output dir
                import shutil
                shutil.copy2(line.strip(), output)
                break

        if output.exists():
            _jobs[job_id]["status"] = "done"
        else:
            _jobs[job_id]["status"] = "failed"
            _jobs[job_id]["error"] = "render produced no output"

    except asyncio.TimeoutError:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = "render timed out (10 min)"
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)[:200]
    finally:
        _active_scenes -= 1
