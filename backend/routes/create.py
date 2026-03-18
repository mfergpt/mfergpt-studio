"""Create routes — trait-based mfer creation (free)."""
import asyncio
import uuid
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from security import validate_traits, validate_collection
from config import SCRIPTS_DIR, OUTPUT_DIR

router = APIRouter(tags=["create"])


class TraitRenderRequest(BaseModel):
    traits: dict[str, str]
    collection: str = "og"
    format: str = "gif"


# Simple category -> CLI flag mappings
_SIMPLE_FLAGS = {
    'background': '--bg',
    'type': '--type',
    'eyes': '--eyes',
    'mouth': '--mouth',
    'headphones': '--headphones',
    'chain': '--chain',
    'watch': '--watch',
    'beard': '--beard',
    'smoke': '--smoke',
}

# Categories that split into name + color
_SPLIT_FLAGS = {
    'hat_over': ('--hat', '--hat-color'),
    'hat_under': ('--hat', '--hat-color'),
    'short_hair': ('--hair', '--hair-color'),
    'long_hair': ('--hair', '--hair-color'),
    'shirt': ('--shirt', '--shirt-color'),
}

_COLORS = frozenset([
    'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
    'pink', 'gold', 'brown', 'blonde', 'aqua', 'lined',
])


def _traits_to_cli(traits: dict[str, str]) -> list[str]:
    """Convert validated trait dict to CLI arguments."""
    args: list[str] = []
    for category, value in traits.items():
        if value == 'none':
            continue
        if category in _SIMPLE_FLAGS:
            args.extend([_SIMPLE_FLAGS[category], value])
        elif category in _SPLIT_FLAGS:
            flag_name, flag_color = _SPLIT_FLAGS[category]
            parts = value.rsplit(' ', 1)
            if len(parts) == 2 and parts[1].lower() in _COLORS:
                args.extend([flag_name, parts[0], flag_color, parts[1]])
            else:
                args.extend([flag_name, value])
    return args


def _find_output(base_path: Path) -> Path | None:
    """Find the actual output file — mfer_gen may change the extension."""
    stem = base_path.stem
    parent = base_path.parent
    for ext in ['.gif', '.png', '.mp4', '.jpg', '.webp']:
        candidate = parent / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    return None


def _media_type(path: Path) -> str:
    return {
        '.png': 'image/png', '.gif': 'image/gif',
        '.jpg': 'image/jpeg', '.mp4': 'video/mp4',
        '.webp': 'image/webp',
    }.get(path.suffix.lower(), 'application/octet-stream')


@router.post("/render-traits")
async def render_traits(req: TraitRenderRequest):
    """Free trait-based mfer render — all values whitelisted."""
    traits = validate_traits(req.traits)

    collection = None
    if req.collection and req.collection != 'og':
        collection = validate_collection(req.collection)

    job_id = uuid.uuid4().hex[:12]
    output_base = OUTPUT_DIR / f"create-{job_id}"
    output_requested = output_base.with_suffix(".png")

    cli_args = _traits_to_cli(traits)

    cmd = [
        "python3", "-m", "mfer_gen",
        *cli_args,
        "-o", str(output_requested),
    ]

    if collection:
        cmd.extend(["--collection", collection])

    fmt = req.format.lower()
    if fmt == "png":
        cmd.append("--static")
    else:
        cmd.append("--animated")
        if fmt == "gif":
            output_requested = output_base.with_suffix(".gif")
            cmd[cmd.index("-o") + 1] = str(output_requested)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(SCRIPTS_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

    output = _find_output(output_base)

    if not output:
        for line in stdout.decode().split('\n'):
            if line.strip().startswith('Done:'):
                done_path = Path(line.strip().split('Done:', 1)[1].strip())
                if done_path.exists():
                    import shutil
                    safe_output = OUTPUT_DIR / f"create-{job_id}{done_path.suffix}"
                    shutil.copy2(done_path, safe_output)
                    output = safe_output
                    break

    if proc.returncode != 0 or not output:
        return {"error": "render failed", "detail": stderr.decode()[-500:] + " | " + stdout.decode()[-500:]}

    from routes.render import _watermark
    await _watermark(output)

    return FileResponse(output, media_type=_media_type(output), filename=f"mfer-custom{output.suffix}")
