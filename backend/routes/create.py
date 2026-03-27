"""Create routes — trait-based mfer creation (free)."""
import asyncio
import sys
import uuid
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from security import validate_traits, validate_collection
from config import SCRIPTS_DIR, OUTPUT_DIR

# Add mfer_gen to path so renderers can be imported
MFER_GEN_PATH = '/Users/mfergpt/.openclaw/workspace/scripts'
if MFER_GEN_PATH not in sys.path:
    sys.path.insert(0, MFER_GEN_PATH)

# Make mfer_gen importable
sys.path.insert(0, '/Users/mfergpt/.openclaw/workspace/scripts')

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
        'tinydinos': 'tinyDinos',
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
    'plainmfer': 'plain', 'charcoalmfer': 'charcoal', 'apemfer': 'ape',
    'alienmfer': 'alien', 'zombiemfer': 'zombie',
}
_EYES_MAP_EXTRA = {
    '3dglasses': '3d', '3Dglasses': '3d', 'nerdglasses': 'nerd',
    'regulareyes': 'normal', 'eyemask': 'mask', 'eyepatch': 'patch',
    'purpleshades': 'shades', 'alieneyes': 'normal', 'zombieeyes': 'normal',
}
_SMOKE_MAP_EXTRA = {'cigblack': 'cig', 'cigwhite': 'cig'}
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
            _VALID_BG = {'blue','red','green','orange','yellow','graveyard','space','tree','purple','pink','dark'}
            if value in _VALID_BG:
                args.extend(['--bg', value])
            # skip non-standard backgrounds

        elif category == 'type':
            mapped = _TYPE_MAP.get(value) or _TYPE_MAP.get(value.lower()) or value.replace(' mfer', '').replace('mfer', '')
            _VALID_TYPES = {'plain','charcoal','ape','alien','zombie'}
            if mapped in _VALID_TYPES:
                args.extend(['--type', mapped])

        elif category == 'eyes':
            mapped = _EYES_MAP.get(value) or _EYES_MAP_EXTRA.get(value) or _EYES_MAP.get(value.lower()) or _EYES_MAP_EXTRA.get(value.lower(), 'normal')
            args.extend(['--eyes', mapped])

        elif category == 'mouth':
            args.extend(['--mouth', value])

        elif category == 'headphones':
            # Handle "black headphones", "black", "blackheadphones" formats
            color = value.lower().replace('headphones', '').replace(' ', '').strip()
            if color in _HP_COLORS:
                args.extend(['--headphones', color])
            elif value.lower() in _HP_COLORS:
                args.extend(['--headphones', value.lower()])

        elif category == 'smoke':
            mapped = _SMOKE_MAP.get(value) or _SMOKE_MAP_EXTRA.get(value) or _SMOKE_MAP.get(value.lower()) or _SMOKE_MAP_EXTRA.get(value.lower(), 'cig')
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
            _VALID_HAIR_COLORS = {'black','yellow','red','purple','blue','green','pink','white'}
            val_lower = value.lower()
            matched = False
            for style_name, style_val in _HAIR_STYLE_MAP.items():
                if val_lower.startswith(style_name):
                    args.extend(['--hair', style_val])
                    # Handle "messy black", "messyblack", "messy_black" etc
                    color = val_lower.replace(style_name, '').strip().strip('_')
                    if color in _VALID_HAIR_COLORS:
                        args.extend(['--hair-color', color])
                    matched = True
                    break
            if not matched and val_lower:
                # Try to extract any recognizable pattern
                for style in ['mohawk', 'messy']:
                    if style in val_lower:
                        args.extend(['--hair', style])
                        for c in _VALID_HAIR_COLORS:
                            if c in val_lower:
                                args.extend(['--hair-color', c])
                                break
                        break

        elif category == 'long_hair':
            args.extend(['--hair', 'long'])
            # Handle both "long hair yellow" and "longhairyellow" formats
            color = value.lower().replace('long hair ', '').replace('longhair', '').strip()
            _VALID_HAIR_COLORS = {'black','yellow','red','purple','blue','green','pink','white'}
            if color in _VALID_HAIR_COLORS:
                args.extend(['--hair-color', color])

        elif category == 'shirt':
            _VALID_SHIRT_COLORS = {'white','blue','green','pink','red','gray','turquoise','yellow'}
            val_lower = value.lower()
            matched = False
            for style_name, style_val in _SHIRT_STYLE_MAP.items():
                clean_style = style_name.replace(' ', '')
                if val_lower.startswith(style_name) or val_lower.startswith(clean_style):
                    args.extend(['--shirt', style_val])
                    color = val_lower.replace(style_name, '').replace(clean_style, '').strip().strip('_')
                    if color in _VALID_SHIRT_COLORS:
                        args.extend(['--shirt-color', color])
                    matched = True
                    break
            if not matched:
                for style in ['collared', 'hoodie']:
                    if style in val_lower:
                        shirt_val = 'collared' if style == 'collared' else 'hoodie_down'
                        args.extend(['--shirt', shirt_val])
                        for c in _VALID_SHIRT_COLORS:
                            if c in val_lower:
                                args.extend(['--shirt-color', c])
                                break
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


def _creator_traits_to_layer_dict(traits: dict[str, str], collection: str | None) -> dict[str, str]:
    """Map creator category names + raw filenames → layer folder names + values.

    The creator sends {category: filename_without_png}. Categories match the
    actual folder names from /api/layers/{collection}. For OG these are the
    standard names; for derivatives they may differ (e.g. mfpurrs has 'clothing'
    instead of 'shirt'+'chain').

    Returns a dict keyed by LAYER_ORDER folder names with raw values.
    """
    # Direct category → layer folder mapping
    CATEGORY_TO_LAYER = {
        'background': 'background',
        'type': 'type',
        'eyes': 'eyes',
        'mouth': 'mouth',
        'headphones': 'headphones',
        'hat_over': 'hat over headphones',
        'hat_under': 'hat under headphones',
        'hat over headphones': 'hat over headphones',
        'hat under headphones': 'hat under headphones',
        'short_hair': 'short hair',
        'short hair': 'short hair',
        'long_hair': 'long hair',
        'long hair': 'long hair',
        'shirt': 'shirt',
        'chain': 'chain',
        'watch': '4_20 watch',
        '4_20 watch': '4_20 watch',
        'beard': 'beard',
        'smoke': 'smoke',
        # Derivative-specific folder names (pass through as-is)
        'clothing': 'clothing',
        'fur': 'type',
    }

    layer_dict = {}
    for category, value in traits.items():
        if not value or value == 'none':
            continue
        layer_name = CATEGORY_TO_LAYER.get(category, category)
        layer_dict[layer_name] = value
    return layer_dict


def _layer_dict_to_legacy_traits(layer_dict: dict[str, str]) -> dict[str, str]:
    """Convert raw layer dict to legacy CLI-style traits for resolve_colors().

    resolve_colors() needs keys like 'bg', 'type' (short name like 'plain'),
    'headphones' (color only like 'red'), etc. We do best-effort mapping
    so themed renderers get reasonable colors.
    """
    legacy = {}

    bg = layer_dict.get('background')
    if bg:
        legacy['bg'] = bg

    # Type: 'plain mfer' → 'plain', 'charcoal mfer' → 'charcoal'
    t = layer_dict.get('type')
    if t:
        for short in ('plain', 'charcoal', 'ape', 'alien', 'zombie'):
            if short in t.lower():
                legacy['type'] = short
                break
        else:
            legacy['type'] = 'plain'  # default for derivative types

    # Headphones: 'red headphones' → 'red'
    hp = layer_dict.get('headphones')
    if hp:
        color = hp.lower().replace('headphones', '').strip()
        if color:
            legacy['headphones'] = color
        else:
            legacy['headphones'] = hp

    legacy['eyes'] = layer_dict.get('eyes', 'normal')
    legacy['mouth'] = layer_dict.get('mouth', 'flat')

    smoke = layer_dict.get('smoke')
    if smoke:
        legacy['smoke'] = 'cig' if 'cig' in smoke.lower() else smoke

    chain = layer_dict.get('chain')
    if chain:
        legacy['chain'] = 'gold' if 'gold' in chain.lower() else 'silver'

    watch = layer_dict.get('4_20 watch')
    if watch:
        legacy['watch'] = 'black'
        for c in ('gold', 'red', 'black'):
            if c in watch.lower():
                legacy['watch'] = c
                break

    beard = layer_dict.get('beard')
    if beard:
        legacy['beard'] = 'full' if 'full' in beard.lower() else 'shadow'

    return legacy


def _render_direct(layer_dict: dict[str, str], collection: str | None,
                   theme: str | None, output_path: str, animated: bool = False) -> str:
    """Render using the Python compositor directly (no CLI subprocess)."""
    from mfer_gen.renderers._collection_state import set_active_collection, get_active_collection
    from mfer_gen.renderers.png_composer import PNGComposer, find_layer, LAYER_ORDER
    from mfer_gen.renderers import get_renderer, _REGISTRY
    # Force-load all renderer modules (can't rely on _ensure_loaded — 'original' is already registered)
    if len(_REGISTRY) < 10:
        import importlib, os
        rdir = os.path.dirname(os.path.abspath('/Users/mfergpt/.openclaw/workspace/scripts/mfer_gen/renderers/__init__.py'))
        for fname in os.listdir(rdir):
            if fname.endswith('.py') and fname not in ('__init__.py', 'base.py', '_collection_state.py'):
                try:
                    importlib.import_module(f"mfer_gen.renderers.{fname[:-3]}")
                except Exception:
                    pass
    from mfer_gen.traits import resolve_colors
    from mfer_gen.positions import get_position_map
    from PIL import Image

    # Set active collection so find_layer checks derivative folders
    prev_collection = get_active_collection()
    if collection:
        set_active_collection(collection)

    try:
        if theme and theme != 'original':
            # Themed render — needs legacy traits dict for resolve_colors
            renderer = get_renderer(theme)
            legacy_traits = _layer_dict_to_legacy_traits(layer_dict)
            # Also pass raw layer names so _build_layer_traits can use new-format fields
            for k, v in layer_dict.items():
                key = k.replace(' ', '_')
                if key not in legacy_traits:
                    legacy_traits[key] = v
            colors = resolve_colors(legacy_traits)
            positions = get_position_map(renderer.default_positions)
            return renderer.render(legacy_traits, colors, positions, output_path, animated=animated, anim_size=500)
        else:
            # Original PNG compositor — render directly from layer files
            canvas = None
            # For derivatives, also check collection-specific folder names
            all_layers = list(LAYER_ORDER)
            # Add any non-standard layer categories from the traits
            for layer_name in layer_dict:
                if layer_name not in all_layers:
                    all_layers.append(layer_name)

            for layer_name in all_layers:
                value = layer_dict.get(layer_name)
                if not value or value == 'none':
                    continue

                layer_file = find_layer(layer_name, value)
                if not layer_file:
                    continue

                layer_img = Image.open(layer_file).convert("RGBA")
                if canvas is None:
                    canvas = layer_img.copy()
                else:
                    if layer_img.size != canvas.size:
                        layer_img = layer_img.resize(canvas.size, Image.LANCZOS)
                    canvas = Image.alpha_composite(canvas, layer_img)

            if canvas is None:
                canvas = Image.new("RGBA", (1000, 1000), "#87CEEB")

            # Normalize to 1000x1000
            if canvas.size[0] != 1000:
                canvas = canvas.resize((1000, 1000), Image.LANCZOS)

            canvas.save(output_path, "PNG")
            return output_path
    finally:
        # Restore previous collection state
        set_active_collection(prev_collection)


@router.post("/render-traits")
async def render_traits(req: TraitRenderRequest):
    """Free trait-based mfer render — all values whitelisted."""
    # Clean trait values — strip .png extensions, handle filesystem filenames from creator
    cleaned_traits = {}
    for k, v in req.traits.items():
        if v and isinstance(v, str):
            v = v.strip()
            if v.endswith('.png'):
                v = v[:-4]
            # Strip rarity weights like #100
            if '#' in v:
                v = v.split('#')[0].strip()
        cleaned_traits[k] = v
    req.traits = cleaned_traits

    print(f"[render-traits] collection={req.collection}, theme={req.theme}, format={req.format}, traits={cleaned_traits}", flush=True)
    traits = validate_traits(req.traits)

    collection = None
    if req.collection and req.collection != 'og':
        collection = validate_collection(req.collection)

    # Validate theme if requested
    theme = None
    if req.theme:
        from security import validate_theme
        theme = validate_theme(req.theme)

    job_id = uuid.uuid4().hex[:12]
    output_path = str(OUTPUT_DIR / f"create-{job_id}.png")

    # Build layer dict from creator traits
    layer_dict = _creator_traits_to_layer_dict(traits, collection)

    # Determine if animated
    fmt = req.format.lower()
    animated = fmt != 'png'
    if animated:
        output_path = str(OUTPUT_DIR / f"create-{job_id}.gif")

    # Render directly via Python compositor
    try:
        result_path = await asyncio.get_event_loop().run_in_executor(
            None, _render_direct, layer_dict, collection, theme, output_path, animated
        )
    except Exception as e:
        import traceback
        return {"error": "render failed", "detail": traceback.format_exc()[-500:]}

    output = _find_output(Path(output_path).with_suffix(''))
    if not output:
        output = Path(result_path) if result_path and Path(result_path).exists() else None
    if not output or not output.exists():
        # Try the exact path we requested
        if Path(output_path).exists():
            output = Path(output_path)
        else:
            return {"error": "render failed", "detail": "output file not found"}

    from routes.render import _watermark
    await _watermark(output)

    return FileResponse(output, media_type=_media_type(output), filename=f"mfer-custom{output.suffix}")
