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
        # Derivative-specific: map native keys → OG layer folder names
        # (symlinks in derivative dirs handle the actual file lookup)
        'clothing': 'shirt',
        'fur': 'type',
        'eyewear': 'eyes',
        'eye_color': 'eye_color',
        'piercing': 'piercing',
        # TinyDinos native → OG equivalents (symlinks: type→body, shirt→chest, etc.)
        'body': 'type',
        'chest': 'shirt',
        'spikes': 'short hair',
        'face': 'mouth',
        'head': 'hat over headphones',
        'hands': 'smoke',
        'feet': '4_20 watch',
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
    # Don't default to 'plain' — derivative types (e.g. dino 'red') should pass through
    t = layer_dict.get('type')
    if t:
        for short in ('plain', 'charcoal', 'ape', 'alien', 'zombie'):
            if short in t.lower():
                legacy['type'] = short
                break

    # Headphones: 'red headphones' → 'red'
    hp = layer_dict.get('headphones')
    if hp:
        color = hp.lower().replace('headphones', '').strip()
        if color:
            legacy['headphones'] = color
        else:
            legacy['headphones'] = hp

    eyes = layer_dict.get('eyes')
    if eyes:
        legacy['eyes'] = eyes
    mouth = layer_dict.get('mouth')
    if mouth:
        legacy['mouth'] = mouth

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


# Collections with non-mfer anatomy — theme renderers can't reconstruct these
# from scratch, so we compose the original PNG first then apply the theme via CLI.
# Collections with traits that have no OG equivalents (eye_color, piercing)
# and can't fully go through the standard themed render pipeline.
_NON_STANDARD_ANATOMY = {'mfpurrs'}


def _compose_original(layer_dict: dict[str, str], find_layer) -> 'Image.Image | None':
    """Compose a PNG from raw layer files. Returns PIL Image or None."""
    from mfer_gen.renderers.png_composer import LAYER_ORDER
    from PIL import Image

    canvas = None
    all_layers = list(LAYER_ORDER)
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

    if canvas and canvas.size[0] != 1000:
        canvas = canvas.resize((1000, 1000), Image.LANCZOS)
    return canvas


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
        is_non_standard = collection in _NON_STANDARD_ANATOMY

        if theme and theme != 'original' and is_non_standard:
            # Non-mfer anatomy + theme: compose original PNG first,
            # then apply theme via CLI --from-image (theme renderers
            # can't reconstruct non-mfer anatomy from scratch).
            canvas = _compose_original(layer_dict, find_layer)
            if canvas is None:
                canvas = Image.new("RGBA", (1000, 1000), "#87CEEB")
            return _apply_theme_to_image(canvas, theme, output_path, animated)

        elif theme and theme != 'original':
            # Standard mfer anatomy — themed render via Python API
            renderer = get_renderer(theme)
            legacy_traits = _layer_dict_to_legacy_traits(layer_dict)
            # Raw layer values override legacy — derivatives send actual filenames
            # which find_layer needs to locate the right PNGs
            for k, v in layer_dict.items():
                key = k.replace(' ', '_')
                legacy_traits[key] = v
            colors = resolve_colors(legacy_traits)
            positions = get_position_map(renderer.default_positions)
            return renderer.render(legacy_traits, colors, positions, output_path, animated=animated, anim_size=500)
        else:
            # Original PNG compositor — render directly from layer files
            canvas = _compose_original(layer_dict, find_layer)
            if canvas is None:
                canvas = Image.new("RGBA", (1000, 1000), "#87CEEB")
            canvas.save(output_path, "PNG")
            return output_path
    finally:
        # Restore previous collection state
        set_active_collection(prev_collection)


def _styled_frame(original: 'Image.Image', theme: str, t: float) -> 'Image.Image':
    """Render one frame of a themed image. t is 0.0–1.0 progress through the animation cycle."""
    from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ImageChops
    import math

    img = original.copy()
    # Oscillating value: 0→1→0 over the cycle
    pulse = 0.5 + 0.5 * math.sin(2 * math.pi * t)
    # Secondary offset wave
    pulse2 = 0.5 + 0.5 * math.sin(2 * math.pi * t + math.pi / 3)

    if theme in ('noir', 'sketch', 'chalk', 'newspaper', 'sumi_e', 'woodcut', 'banksy'):
        gray = ImageOps.grayscale(img.convert("RGB"))
        if theme == 'sketch':
            gray = gray.filter(ImageFilter.FIND_EDGES)
        elif theme == 'chalk':
            gray = ImageOps.invert(gray)
        elif theme == 'woodcut':
            thresh = int(100 + 56 * pulse)  # animated threshold
            gray = gray.point(lambda p: 255 if p > thresh else 0)
        # Blend: original → grayscale themed, with brightness pulse
        themed = gray.convert("RGB")
        bright = ImageEnhance.Brightness(themed).enhance(0.8 + 0.4 * pulse)
        return bright

    elif theme in ('neon', 'cyberpunk', 'hologram', 'radioactive', 'matrix_rain'):
        edges = img.convert("RGB").filter(ImageFilter.FIND_EDGES)
        # Glow intensity pulses
        bright = ImageEnhance.Brightness(edges).enhance(1.0 + 2.0 * pulse)
        color = ImageEnhance.Color(bright).enhance(2.0 + 3.0 * pulse2)
        # Tint per theme
        tints = {'neon': (255,0,255), 'cyberpunk': (255,0,100), 'hologram': (100,200,255),
                 'radioactive': (0,255,50), 'matrix_rain': (0,255,65)}
        r, g, b = tints.get(theme, (255,255,255))
        a = int(40 + 60 * pulse)
        overlay = Image.new("RGBA", img.size, (r, g, b, a))
        return Image.alpha_composite(color.convert("RGBA"), overlay).convert("RGB")

    elif theme in ('pixel', 'lego', 'mosaic', 'cross_stitch'):
        # Animate block size
        base_block = 10 if theme == 'pixel' else 14 if theme == 'lego' else 8
        block = max(4, int(base_block + 10 * pulse))
        small = img.resize((img.width // block, img.height // block), Image.NEAREST)
        return small.resize(img.size, Image.NEAREST).convert("RGB")

    elif theme in ('gold', 'chrome', 'diamond'):
        gray = ImageOps.grayscale(img.convert("RGB"))
        shine = 0.7 + 0.6 * pulse  # animated shine
        if theme == 'gold':
            r = gray.point(lambda p: min(255, int(p * shine * 1.3)))
            g = gray.point(lambda p: min(255, int(p * shine * 0.95)))
            b = gray.point(lambda p: int(p * 0.2))
        elif theme == 'chrome':
            v = gray.point(lambda p: min(255, int(p * shine)))
            r = g = b = v
        else:
            r = gray.point(lambda p: min(255, int(p * 0.6 + 100 * pulse)))
            g = gray.point(lambda p: min(255, int(p * 0.7 + 100 * pulse)))
            b = gray.point(lambda p: min(255, int(p * 0.9 + 60 * pulse)))
        return ImageEnhance.Contrast(Image.merge("RGB", (r, g, b))).enhance(1.3 + 0.4 * pulse2)

    elif theme in ('thermal', 'infrared', 'xray'):
        gray = ImageOps.grayscale(img.convert("RGB"))
        if theme == 'xray':
            inv = ImageOps.invert(gray)
            return ImageEnhance.Brightness(inv.convert("RGB")).enhance(0.8 + 0.4 * pulse)
        # Animated heat shift
        shift = int(40 * pulse)
        r = gray.point(lambda p: min(255, max(0, p * 2 + shift)))
        g = gray.point(lambda p: max(0, 255 - abs(p - 128 + shift) * 4))
        b = gray.point(lambda p: max(0, 255 - p * 2 + shift))
        return Image.merge("RGB", (r, g, b))

    elif theme in ('acid', 'vapor', 'pop'):
        sat = 1.5 + 3.0 * pulse  # 1.5→4.5 saturation cycle
        con = 1.0 + 1.0 * pulse2
        out = ImageEnhance.Color(img.convert("RGB")).enhance(sat)
        return ImageEnhance.Contrast(out).enhance(con)

    elif theme in ('glitch', 'retro_tv'):
        r, g, b = img.convert("RGB").split()
        offset = int(3 + 12 * pulse)
        r = ImageChops.offset(r, offset, int(2 * pulse2))
        b = ImageChops.offset(b, -offset, -int(2 * pulse2))
        return Image.merge("RGB", (r, g, b))

    elif theme in ('frost', 'underwater'):
        desat = ImageEnhance.Color(img.convert("RGB")).enhance(0.3 + 0.4 * pulse)
        tint = (100, 180, 255) if theme == 'frost' else (0, 80, 160)
        a = int(30 + 50 * pulse)
        overlay = Image.new("RGBA", img.size, (*tint, a))
        return Image.alpha_composite(desat.convert("RGBA"), overlay).convert("RGB")

    elif theme in ('ember', 'sunset'):
        tint = (255, 80, 0) if theme == 'ember' else (255, 140, 50)
        a = int(30 + 70 * pulse)
        overlay = Image.new("RGBA", img.size, (*tint, a))
        out = Image.alpha_composite(img.convert("RGBA"), overlay)
        return ImageEnhance.Contrast(out.convert("RGB")).enhance(1.0 + 0.6 * pulse2)

    elif theme in ('negative',):
        inv = ImageOps.invert(img.convert("RGB"))
        return Image.blend(img.convert("RGB"), inv, pulse)

    elif theme in ('comic', 'graffiti', 'tattoo', 'traced', 'oil_paint', 'watercolor', 'hand_drawn'):
        edged = img.convert("RGB").filter(ImageFilter.EDGE_ENHANCE_MORE)
        smoothed = img.convert("RGB").filter(ImageFilter.SMOOTH_MORE)
        blended = Image.blend(smoothed, edged, 0.3 + 0.7 * pulse)
        return ImageEnhance.Contrast(blended).enhance(1.0 + 0.8 * pulse2)

    else:
        sat = 1.0 + 1.5 * pulse
        con = 1.0 + 0.5 * pulse2
        out = ImageEnhance.Color(img.convert("RGB")).enhance(sat)
        return ImageEnhance.Contrast(out).enhance(con)


def _apply_theme_to_image(image: 'Image.Image', theme: str, output_path: str, animated: bool = False) -> str:
    """Apply a theme effect to a composed PIL Image (static or animated)."""
    from PIL import Image

    if not animated:
        frame = _styled_frame(image, theme, 0.25)
        frame.save(output_path, "PNG")
        return output_path

    # Animated GIF: render frames at different points in the animation cycle
    num_frames = 16
    size = 500
    frames = []
    for i in range(num_frames):
        t = i / num_frames
        frame = _styled_frame(image, theme, t)
        frame = frame.resize((size, size), Image.LANCZOS)
        frames.append(frame)

    gif_path = output_path.rsplit('.', 1)[0] + '.gif'
    frames[0].save(gif_path, save_all=True, append_images=frames[1:],
                   duration=100, loop=0, optimize=True)
    return gif_path


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
