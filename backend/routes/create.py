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


@router.get("/trait-map/{collection}")
async def get_trait_map(collection: str):
    """Return OG→derivative trait name mapping for a collection."""
    import sys
    sys.path.insert(0, '/Users/mfergpt/.openclaw/workspace/scripts')
    from mfer_gen.renderers.trait_maps import COLLECTION_MAPS

    coll_key_map = {
        'creyzies': 'creyzies', 'eos': 'eos', 'fineart': 'fineArtMfers',
        'mfersahead': 'mfersAhead', 'mfersbehind': 'mfersBehind',
        'sketchy': 'sketchyMfers', 'somfers': 'somfers', 'mfpurrs': 'mfpurrs',
    }

    key = coll_key_map.get(collection)
    if not key or key not in COLLECTION_MAPS:
        return {}

    return COLLECTION_MAPS[key]


class TraitRenderRequest(BaseModel):
    traits: dict[str, str]
    collection: str = "og"
    format: str = "gif"
    theme: str | None = None


# Map layer filenames → CLI flag values
# CLI expects short names: --type plain, --eyes 3d, --smoke cig, etc.
_TYPE_MAP = {
    'plain mfer': 'plain', 'charcoal mfer': 'charcoal', 'ape mfer': 'ape',
    'alien mfer': 'alien', 'zombie mfer': 'zombie',
}
_EYES_MAP = {
    'regular eyes': 'normal', 'shades': 'shades', '3d glasses': '3d', '3D glasses': '3d',
    'nerd glasses': 'nerd', 'vr': 'vr', 'eye patch': 'patch', 'eye mask': 'mask',
    'purple shades': 'shades',
}
_SMOKE_MAP = {
    'cig black': 'cig', 'cig white': 'cig', 'pipe': 'pipe', 'brown pipe': 'pipe',
}
_CHAIN_MAP = {'gold chain': 'gold', 'silver chain': 'silver'}
_BEARD_MAP = {'full beard': 'full', 'shadow': 'shadow', 'shadow beard': 'shadow'}
_WATCH_MAP = {
    'argo black': 'black', 'argo white': 'black', 'oyster gold': 'gold', 'oyster silver': 'gold',
    'sub black': 'black', 'sub blue': 'black', 'sub red': 'red', 'sub green': 'black',
    'sub turquoise': 'black', 'sub white': 'black', 'sub bat (blue/black)': 'black',
    'sub lantern (green)': 'black',
}
# Headphones: just need the color
_HP_COLORS = {'black', 'red', 'blue', 'green', 'pink', 'gold', 'white', 'lined', 'purple', 'orange'}

# Hat: extract hat type + color
_HAT_TYPE_MAP = {
    'cowboy hat': ('cowboy', None), 'top hat': ('tophat', None), 'pilot helmet': ('tophat', None),
    'mesa hat': ('cap', None),
}
# Hair: extract style + color
_HAIR_STYLE_MAP = {'messy': 'messy', 'mohawk': 'mohawk', 'long hair': 'long'}
# Shirt: extract style + color
_SHIRT_STYLE_MAP = {'collared shirt': 'collared', 'hoodie down': 'hoodie_down'}


def _traits_to_cli(traits: dict[str, str]) -> list[str]:
    """Convert validated trait dict to CLI arguments."""
    args: list[str] = []
    for category, value in traits.items():
        if value == 'none' or not value:
            continue

        if category == 'background':
            args.extend(['--bg', value])

        elif category == 'type':
            mapped = _TYPE_MAP.get(value, value.replace(' mfer', ''))
            args.extend(['--type', mapped])

        elif category == 'eyes':
            mapped = _EYES_MAP.get(value, 'normal')
            args.extend(['--eyes', mapped])

        elif category == 'mouth':
            args.extend(['--mouth', value])

        elif category == 'headphones':
            # Value might be "black headphones" or just "black"
            color = value.replace(' headphones', '').lower()
            if color in _HP_COLORS:
                args.extend(['--headphones', color])

        elif category == 'smoke':
            mapped = _SMOKE_MAP.get(value, 'cig')
            args.extend(['--smoke', mapped])

        elif category == 'chain':
            mapped = _CHAIN_MAP.get(value, value.replace(' chain', ''))
            args.extend(['--chain', mapped])

        elif category == 'watch':
            mapped = _WATCH_MAP.get(value, 'black')
            args.extend(['--watch', mapped])

        elif category == 'beard':
            mapped = _BEARD_MAP.get(value, 'full')
            args.extend(['--beard', mapped])

        elif category in ('hat_over', 'hat_under'):
            if value in _HAT_TYPE_MAP:
                hat_type, _ = _HAT_TYPE_MAP[value]
                args.extend(['--hat', hat_type])
            elif value.startswith('hoodie'):
                args.extend(['--hat', 'hoodie'])
                # Extract color if present
                parts = value.split()
                if len(parts) > 1:
                    args.extend(['--hat-color', parts[-1]])
            elif value.startswith('bandana'):
                args.extend(['--hat', 'bandana'])
                parts = value.split()
                if len(parts) > 1:
                    args.extend(['--hat-color', parts[-1]])
            elif value.startswith('beanie'):
                args.extend(['--hat', 'beanie'])
            elif value.startswith('cap'):
                args.extend(['--hat', 'cap'])
                parts = value.split()
                if len(parts) > 1 and parts[-1] in _HP_COLORS:
                    args.extend(['--hat-color', parts[-1]])
            elif value.startswith('knit'):
                args.extend(['--hat', 'beanie'])
            elif value.startswith('headband'):
                args.extend(['--hat', 'bandana'])
                parts = value.split()
                if len(parts) > 1 and parts[-1] in _HP_COLORS:
                    args.extend(['--hat-color', parts[-1]])

        elif category == 'short_hair':
            for style_name, style_val in _HAIR_STYLE_MAP.items():
                if value.startswith(style_name):
                    args.extend(['--hair', style_val])
                    color = value.replace(style_name, '').strip()
                    if color:
                        args.extend(['--hair-color', color])
                    break

        elif category == 'long_hair':
            args.extend(['--hair', 'long'])
            color = value.replace('long hair', '').strip()
            if color:
                args.extend(['--hair-color', color])

        elif category == 'shirt':
            for style_name, style_val in _SHIRT_STYLE_MAP.items():
                if value.startswith(style_name):
                    args.extend(['--shirt', style_val])
                    color = value.replace(style_name, '').strip()
                    if color:
                        args.extend(['--shirt-color', color])
                    break

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
    print(f"[render-traits] collection={req.collection}, theme={req.theme}, format={req.format}, traits_keys={list(req.traits.keys())}", flush=True)
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

    if req.theme:
        from security import validate_theme
        theme = validate_theme(req.theme)
        cmd.extend(["--theme", theme])

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
