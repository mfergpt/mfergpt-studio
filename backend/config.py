"""Centralized config — all paths, limits, and security settings."""
import os
import secrets
from pathlib import Path

# Base paths — LOCKED to workspace, no traversal possible
WORKSPACE = Path("/Users/mfergpt/.openclaw/workspace")
SCRIPTS_DIR = WORKSPACE / "scripts"
SCENE_SCRIPTS_DIR = WORKSPACE / "builds/mfer-scenes/scripts"
WATERMARK_SCRIPT = SCRIPTS_DIR / "watermark.py"
OUTPUT_DIR = Path("/tmp/mfergpt-studio-output")
OUTPUT_DIR.mkdir(exist_ok=True)

# Allowed theme names — WHITELIST only, no arbitrary input to CLI
# Auto-discover custom themes from the renderers directory
import glob as _glob
_CUSTOM_THEMES = frozenset(
    f.split('/')[-1].replace('.py', '')
    for f in _glob.glob('/Users/mfergpt/.openclaw/workspace/scripts/mfer_gen/renderers/custom_*.py')
)

ALLOWED_THEMES = frozenset([
    'original','acid','ascii','banksy','candy','chalk','chrome','circuit','clay',
    'collage','comic','cross_stitch','cyberpunk','diamond','duotone','ember',
    'frost','glitch','gold','graffiti','hand_drawn','hologram','infrared',
    'jungle','lego','matrix_rain','mosaic','negative','neon','newspaper',
    'noir','oil_paint','pixel','pop','radioactive','retro_tv','risograph',
    'sketch','stained_glass','sumi_e','sunset','tattoo','thermal','traced',
    'underwater','vapor','watercolor','woodcut','xray',
]) | _CUSTOM_THEMES  # auto-include all custom_*.py themes

# Allowed scene worlds — WHITELIST
ALLOWED_WORLDS = frozenset([
    'alley','arena','bar','countryside','dawn','industrial','moon',
    'night-street','office','party','podcast','rooftop','snowy','stage',
    'studio-pro','sunset-beach','trading-floor','void','wasteland'
])

# Limits
MAX_MFER_ID = 10020
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
MAX_PROMPT_LENGTH = 500  # chars for custom themes/scenes
MAX_SCENE_MFERS = 10  # max characters in a scene request
RATE_LIMIT_FREE = "30/minute"
RATE_LIMIT_GATED = "10/minute"

# Auth
JWT_SECRET = os.environ.get("STUDIO_JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
NONCE_EXPIRY_SECONDS = 300  # 5 min to sign

# Token gate
MFERGPT_TOKEN = "0x4160efdd66521483c22cb98b57b87d1fdafeab07"
TOKEN_GATE_USD = 5
BASE_RPC = os.environ.get("BASE_RPC_URL", "https://mainnet.base.org")

# CORS — LOCK to our domains only
ALLOWED_ORIGINS = [
    "https://studio.mfergpt.lol",
    "https://mfergpt.github.io",
    "http://localhost:5173",
    "http://localhost:5555",
    "http://192.168.50.206:8080",
    "http://192.168.50.206:5173",
]

# Allowed trait values for mfer creator — WHITELIST only
# Accept both layer filenames (from creator) and short CLI names
# _traits_to_cli() in create.py handles conversion to CLI flags
ALLOWED_TRAIT_VALUES = {
    'background': frozenset(['none', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'tree', 'space', 'graveyard', 'turquoise', 'dark', 'pink', 'alien spaceship', 'glowing zombie moon', 'lol', 'pcpurple', 'twitter circle']),
    'type': frozenset(['none', 'plain mfer', 'charcoal mfer', 'ape mfer', 'alien mfer', 'zombie mfer', 'plain', 'charcoal', 'ape', 'alien', 'zombie']),
    'eyes': frozenset(['none', 'regular eyes', 'shades', '3d glasses', '3D glasses', 'nerd glasses', 'vr', 'eye patch', 'eye mask', 'purple shades', 'normal', '3d', 'nerd', 'patch', 'mask', 'alien eyes', 'zombie eyes']),
    'mouth': frozenset(['none', 'flat', 'smile']),
    'headphones': frozenset(['none', 'black', 'red', 'blue', 'green', 'pink', 'gold', 'white', 'lined', 'orange', 'purple', 'black headphones', 'red headphones', 'blue headphones', 'green headphones', 'pink headphones', 'gold headphones', 'white headphones', 'lined headphones', 'orange headphones', 'purple headphones']),
    'hat_over': frozenset(['none', 'cowboy hat', 'top hat', 'pilot helmet', 'hoodie', 'hoodie red', 'hoodie blue', 'hoodie green', 'hoodie yellow', 'hoodie orange', 'hoodie purple', 'hoodie black', 'hoodie white', 'hoodie pink', 'hoodie gray', 'hoodie blue og', 'hoodie green og']),
    'hat_under': frozenset(['none', 'bandana red', 'bandana blue', 'bandana dark gray', 'bandana green', 'beanie', 'beanie monochrome', 'beanie red', 'beanie blue', 'beanie black', 'cap red', 'cap blue', 'cap black', 'cap forward', 'cap forward red', 'cap forward blue', 'cap forward black', 'cap green', 'cap pink', 'cap purple', 'cap white', 'cap monochrome', 'headband blue/white', 'headband red/white', 'headband blue/green', 'headband blue/red', 'headband green/white', 'headband pink/white', 'headband red', 'headband blue', 'headband green', 'knit red', 'knit blue', 'knit black', 'knit las vegas', 'knit green/yellow', 'knit pink/blue', 'knit red/blue/yellow', 'knit white/pink', 'knit atlanta', 'knit baltimore', 'knit buffalo', 'knit chicago', 'knit cleveland', 'knit dallas', 'knit kc', 'knit miami', 'knit new york', 'knit pittsburgh', 'knit san fran', 'mesa hat']),
    'short_hair': frozenset(['none', 'messy black', 'messy purple', 'messy red', 'messy yellow', 'messy brown', 'messy blonde', 'mohawk black', 'mohawk blue', 'mohawk green', 'mohawk pink', 'mohawk purple', 'mohawk red', 'mohawk white', 'mohawk yellow', 'mohawk brown', 'mohawk blonde']),
    'long_hair': frozenset(['none', 'long hair black', 'long hair yellow']),
    'shirt': frozenset(['none', 'collared shirt white', 'collared shirt blue', 'collared shirt green', 'collared shirt pink', 'collared shirt turquoise', 'collared shirt red', 'collared shirt yellow', 'hoodie down gray', 'hoodie down blue', 'hoodie down green', 'hoodie down pink', 'hoodie down purple', 'hoodie down red', 'hoodie down white', 'hoodie down black', 'hoodie down orange']),
    'chain': frozenset(['none', 'gold chain', 'silver chain', 'gold', 'silver']),
    'watch': frozenset(['none', 'argo black', 'argo white', 'oyster gold', 'oyster silver', 'sub black', 'sub blue', 'sub red', 'sub green', 'sub turquoise', 'sub white', 'sub bat (blue/black)', 'sub lantern (green)', 'sub aqua', 'argo', 'oyster', 'black', 'gold', 'red']),
    'beard': frozenset(['none', 'full beard', 'shadow beard', 'shadow', 'full']),
    'smoke': frozenset(['none', 'cig black', 'cig white', 'pipe', 'brown pipe', 'cig']),
}

# OpenAI (for mferfy + custom themes)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Allowed derivative collections for mfer_gen
ALLOWED_COLLECTIONS = frozenset([
    '3d', 'creyzies', 'eos', 'fineart', 'mfersahead', 'mfersbehind',
    'sketchy', 'extended', 'mpher', 'somfers', 'mfpurrs', 'tinydinos'
])

# 3D mfer CDN
CYBERMFER_CDN_URL = "https://cybermfers.sfo3.digitaloceanspaces.com/cybermfers/private/assets/png"
