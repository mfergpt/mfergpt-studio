"""Mferfy route — token-gated, uses OpenAI edits API."""
import asyncio
import uuid
import base64
import httpx
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import FileResponse
from security import require_token_gate, validate_prompt, validate_username
from config import OUTPUT_DIR, OPENAI_API_KEY, MAX_UPLOAD_SIZE, SCRIPTS_DIR

router = APIRouter(tags=["mferfy"])

ALLOWED_MIME = {"image/png", "image/jpeg", "image/gif", "image/webp"}

@router.post("/mferfy")
async def mferfy(
    file: Optional[UploadFile] = File(None),
    username: Optional[str] = Form(None),
    customPrompt: Optional[str] = Form(None),
    user: dict = Depends(require_token_gate),
):
    """Mferfy an image or Twitter PFP. Token-gated."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI not configured")

    job_id = uuid.uuid4().hex[:12]
    input_path = OUTPUT_DIR / f"mferfy-input-{job_id}.png"
    output_path = OUTPUT_DIR / f"mferfy-{job_id}.png"

    try:
        if file:
            if file.content_type not in ALLOWED_MIME:
                raise HTTPException(status_code=400, detail="only PNG, JPG, GIF, WEBP")
            data = await file.read(MAX_UPLOAD_SIZE + 1)
            if len(data) > MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=400, detail="file too large")
            input_path.write_bytes(data)

            # Convert to PNG if needed
            if file.content_type != "image/png":
                conv_path = OUTPUT_DIR / f"mferfy-conv-{job_id}.png"
                proc = await asyncio.create_subprocess_exec(
                    "sips", "-s", "format", "png", str(input_path), "--out", str(conv_path),
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                )
                await proc.communicate()
                input_path.unlink(missing_ok=True)
                input_path = conv_path

        elif username:
            safe_username = validate_username(username)
            # Fetch PFP using our script — safe, validated username
            proc = await asyncio.create_subprocess_exec(
                "bash", str(SCRIPTS_DIR / "x-get-pfp.sh"), safe_username,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(SCRIPTS_DIR),
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
            pfp_path = stdout.decode().strip()
            if not pfp_path or not Path(pfp_path).exists():
                raise HTTPException(status_code=404, detail="couldn't fetch PFP")
            input_path = Path(pfp_path)
        else:
            raise HTTPException(status_code=400, detail="provide a file or username")

        # Build mferfy prompt
        base_prompt = "Add mfer-style headphones (random color from: red, blue, green, yellow, orange, purple, pink, white, black) on the head and a lit cigarette dangling from the mouth. Keep the original image intact. Make the additions look natural and well-integrated."
        if customPrompt:
            safe_custom = validate_prompt(customPrompt)
            base_prompt += f" Also: {safe_custom}"

        # Call OpenAI edits API
        async with httpx.AsyncClient(timeout=120) as client:
            with open(input_path, "rb") as f:
                resp = await client.post(
                    "https://api.openai.com/v1/images/edits",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                    files={"image": ("input.png", f, "image/png")},
                    data={
                        "model": "gpt-image-1-mini",
                        "prompt": base_prompt,
                        "n": "1",
                        "size": "1024x1024",
                    },
                )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="OpenAI API error")

        result = resp.json()
        b64 = result.get("data", [{}])[0].get("b64_json", "")
        if not b64:
            raise HTTPException(status_code=502, detail="no image in response")

        output_path.write_bytes(base64.b64decode(b64))

        # Watermark
        from routes.render import _watermark
        await _watermark(output_path)

        return FileResponse(output_path, media_type="image/png", filename="mferfied.png")

    finally:
        # Cleanup input (not output — FileResponse needs it)
        if input_path.exists() and "mferfy-input" in str(input_path):
            input_path.unlink(missing_ok=True)
