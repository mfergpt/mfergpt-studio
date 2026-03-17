"""GM/GN video routes — 3D turntable videos."""
import asyncio
import uuid
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from security import validate_mfer_id
from config import OUTPUT_DIR

router = APIRouter(tags=["gmgn"])

SCENES_DIR = Path("/Users/mfergpt/.openclaw/workspace/builds/mfer-scenes")
WATERMARK_SCRIPT = Path("/Users/mfergpt/.openclaw/workspace/scripts/watermark.py")

class GmGnRequest(BaseModel):
    mferIds: list[int]  # 1-4 mfer IDs
    mode: str  # "gm" or "gn"
    duration: int = 15  # seconds

@router.post("/gmgn")
async def gmgn_video(req: GmGnRequest):
    if req.mode not in ("gm", "gn"):
        return {"error": "mode must be 'gm' or 'gn'"}
    if len(req.mferIds) < 1 or len(req.mferIds) > 4:
        return {"error": "provide 1-4 mfer IDs"}

    ids = [validate_mfer_id(mid) for mid in req.mferIds]
    duration = max(5, min(30, req.duration))

    job_id = uuid.uuid4().hex[:12]
    output = OUTPUT_DIR / f"{req.mode}-{job_id}.mp4"

    script = f"{req.mode}-video.js"
    ids_str = ",".join(str(i) for i in ids)

    cmd = [
        "node", f"scripts/{script}",
        f"--ids={ids_str}",
        f"--duration={duration}",
        f"--output={output}",
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(SCENES_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)

    if proc.returncode != 0 or not output.exists():
        return {"error": "video generation failed", "detail": stderr.decode()[-500:]}

    # Watermark
    wp = await asyncio.create_subprocess_exec(
        "python3", str(WATERMARK_SCRIPT), str(output),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    await asyncio.wait_for(wp.communicate(), timeout=30)

    return FileResponse(output, media_type="video/mp4", filename=f"{req.mode}-mfer-{ids_str}.mp4")
