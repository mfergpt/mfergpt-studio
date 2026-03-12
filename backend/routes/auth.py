"""Auth routes — nonce + signature verification."""
from fastapi import APIRouter
from pydantic import BaseModel
from security import create_nonce, verify_nonce, recover_address, check_token_balance, create_jwt

router = APIRouter(prefix="/auth", tags=["auth"])

class VerifyRequest(BaseModel):
    address: str
    signature: str
    message: str

@router.get("/nonce")
async def get_nonce():
    nonce = create_nonce()
    return {"nonce": nonce, "message": f"Sign this message to verify your wallet for mferGPT Studio.\n\nNonce: {nonce}"}

@router.post("/verify")
async def verify(req: VerifyRequest):
    # Extract nonce from message
    if "Nonce: " not in req.message:
        return {"error": "invalid message format"}
    nonce = req.message.split("Nonce: ")[-1].strip()
    if not verify_nonce(nonce):
        return {"error": "invalid or expired nonce"}

    # Verify signature
    recovered = recover_address(req.message, req.signature)
    if recovered != req.address.lower():
        return {"error": "signature mismatch"}

    # Check token balance
    balance, balance_usd = await check_token_balance(recovered)

    # Issue JWT
    token = create_jwt(recovered, balance_usd)
    return {
        "token": token,
        "address": recovered,
        "balance": balance,
        "balanceUsd": balance_usd,
        "hasAccess": balance_usd >= 5,
    }
