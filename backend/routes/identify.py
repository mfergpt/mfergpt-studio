"""Trait identification route — free, no LLM calls."""
import asyncio
import uuid
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from config import SCRIPTS_DIR, OUTPUT_DIR, MAX_UPLOAD_SIZE

router = APIRouter(tags=["identify"])

ALLOWED_MIME = {"image/png", "image/jpeg", "image/gif", "image/webp"}

@router.post("/identify")
async def identify(file: UploadFile = File(...)):
    """Identify mfer traits from uploaded image. Free."""
    # Validate file type
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="only PNG, JPG, GIF, WEBP allowed")

    # Read with size limit
    data = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(data) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="file too large (10MB max)")

    # Save to temp
    job_id = uuid.uuid4().hex[:12]
    input_path = OUTPUT_DIR / f"identify-{job_id}.png"
    input_path.write_bytes(data)

    try:
        # Run identification — no user input in command, just the file path we control
        cmd = [
            "python3", "-m", "mfer_gen.identify",
            str(input_path),
            "--all", "--top", "3", "--json"
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(SCRIPTS_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)

        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail="identification failed")

        try:
            result = json.loads(stdout.decode())
        except json.JSONDecodeError:
            # Fallback: parse text output
            result = {"raw": stdout.decode(), "traits": {}}

        return result
    finally:
        # Cleanup
        input_path.unlink(missing_ok=True)
