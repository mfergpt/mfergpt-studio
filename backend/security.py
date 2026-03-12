"""Security utilities — auth, token gating, input validation."""
import re
import time
import jwt
import httpx
from typing import Optional
from eth_account.messages import encode_defunct
from eth_account import Account
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS,
    NONCE_EXPIRY_SECONDS, MFERGPT_TOKEN, TOKEN_GATE_USD, BASE_RPC,
    MAX_MFER_ID, MAX_PROMPT_LENGTH, ALLOWED_THEMES, ALLOWED_WORLDS, MAX_SCENE_MFERS,
)

# --- Nonce store (in-memory, short-lived) ---
_nonces: dict[str, float] = {}  # nonce -> expiry timestamp

def create_nonce() -> str:
    import secrets
    nonce = secrets.token_hex(16)
    _nonces[nonce] = time.time() + NONCE_EXPIRY_SECONDS
    # Cleanup expired
    now = time.time()
    expired = [k for k, v in _nonces.items() if v < now]
    for k in expired:
        del _nonces[k]
    return nonce

def verify_nonce(nonce: str) -> bool:
    if nonce not in _nonces:
        return False
    if time.time() > _nonces[nonce]:
        del _nonces[nonce]
        return False
    del _nonces[nonce]  # one-time use
    return True

# --- Wallet signature verification ---
def recover_address(message: str, signature: str) -> str:
    """Recover ETH address from personal_sign signature."""
    try:
        msg = encode_defunct(text=message)
        address = Account.recover_message(msg, signature=signature)
        return address.lower()
    except Exception:
        raise HTTPException(status_code=401, detail="invalid signature")

# --- Token balance check ---
async def check_token_balance(address: str) -> tuple[float, float]:
    """Check MFERGPT balance and USD value. Returns (balance, usd_value)."""
    # Get raw balance
    balance_hex = await _eth_call(
        MFERGPT_TOKEN,
        # balanceOf(address) selector + padded address
        "0x70a08231" + address[2:].lower().zfill(64)
    )
    balance_raw = int(balance_hex, 16) if balance_hex else 0
    balance = balance_raw / (10 ** 18)

    # Get price from DexScreener
    price = 0.0
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"https://api.dexscreener.com/latest/dex/tokens/{MFERGPT_TOKEN}")
            data = resp.json()
            pair = data.get("pairs", [{}])[0]
            price = float(pair.get("priceUsd", 0))
    except Exception:
        pass

    return balance, balance * price

async def _eth_call(to: str, data: str) -> str:
    """Make an eth_call to Base RPC."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(BASE_RPC, json={
                "jsonrpc": "2.0", "id": 1, "method": "eth_call",
                "params": [{"to": to, "data": data}, "latest"]
            })
            result = resp.json().get("result", "0x0")
            return result
    except Exception:
        return "0x0"

# --- JWT ---
def create_jwt(address: str, balance_usd: float) -> str:
    return jwt.encode({
        "sub": address.lower(),
        "balance_usd": balance_usd,
        "has_access": balance_usd >= TOKEN_GATE_USD,
        "exp": int(time.time()) + JWT_EXPIRY_HOURS * 3600,
        "iat": int(time.time()),
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid token")

# --- FastAPI dependencies ---
bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Optional[dict]:
    """Returns decoded JWT payload or None if no auth."""
    if not credentials:
        return None
    return decode_jwt(credentials.credentials)

async def require_token_gate(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> dict:
    """Requires valid JWT with $5+ MFERGPT."""
    payload = decode_jwt(credentials.credentials)
    if not payload.get("has_access"):
        raise HTTPException(status_code=403, detail="need $5+ of $MFERGPT")
    return payload

# --- Input sanitization ---
_SAFE_TEXT = re.compile(r'^[\w\s.,!?\'"()\-:;#@$%&*/+=<>\[\]{}|~`^]+$', re.UNICODE)

def validate_mfer_id(mfer_id: int) -> int:
    if not isinstance(mfer_id, int) or mfer_id < 0 or mfer_id > MAX_MFER_ID:
        raise HTTPException(status_code=400, detail=f"mfer ID must be 0-{MAX_MFER_ID}")
    return mfer_id

def validate_theme(theme: str) -> str:
    theme = theme.strip().lower()
    if theme not in ALLOWED_THEMES:
        raise HTTPException(status_code=400, detail=f"unknown theme: {theme}")
    return theme

def validate_world(world: str) -> str:
    world = world.strip().lower()
    if world not in ALLOWED_WORLDS:
        raise HTTPException(status_code=400, detail=f"unknown world: {world}")
    return world

def validate_prompt(prompt: str) -> str:
    """Sanitize user prompt — strip dangerous chars, limit length."""
    prompt = prompt.strip()
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise HTTPException(status_code=400, detail=f"prompt too long (max {MAX_PROMPT_LENGTH} chars)")
    if len(prompt) < 3:
        raise HTTPException(status_code=400, detail="prompt too short")
    # Strip any shell-dangerous characters
    # Allow unicode text but no backticks, $(), etc
    prompt = re.sub(r'[`$\\]', '', prompt)
    prompt = re.sub(r'\$\(', '(', prompt)
    return prompt

def validate_mfer_ids(ids: list[int]) -> list[int]:
    if len(ids) > MAX_SCENE_MFERS:
        raise HTTPException(status_code=400, detail=f"max {MAX_SCENE_MFERS} mfers per scene")
    return [validate_mfer_id(i) for i in ids]

def validate_username(username: str) -> str:
    """Twitter username — alphanumeric + underscore only."""
    username = username.strip().lstrip('@')
    if not re.match(r'^[a-zA-Z0-9_]{1,15}$', username):
        raise HTTPException(status_code=400, detail="invalid username")
    return username
