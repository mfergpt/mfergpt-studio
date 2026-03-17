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
ALLOWED_THEMES = frozenset([
    'original','acid','ascii','banksy','candy','chalk','chrome','circuit','clay',
    'collage','comic','cross_stitch','cyberpunk','diamond','duotone','ember',
    'frost','glitch','gold','graffiti','hand_drawn','hologram','infrared',
    'jungle','lego','matrix_rain','mosaic','negative','neon','newspaper',
    'noir','oil_paint','pixel','pop','radioactive','retro_tv','risograph',
    'sketch','stained_glass','sumi_e','sunset','tattoo','thermal','traced',
    'underwater','vapor','watercolor','woodcut','xray'
])

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
]

# OpenAI (for mferfy + custom themes)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Allowed derivative collections for mfer_gen
ALLOWED_COLLECTIONS = frozenset([
    'creyzies', 'eos', 'fineart', 'mfersahead', 'mfersbehind',
    'sketchy', 'extended', 'mpher'
])
