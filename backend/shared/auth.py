import hmac
import hashlib
import base64
import json
import secrets
import time
from typing import Any

def sign_token(username: str, secret: str) -> str:
    payload = {"user": username, "iat": int(time.time())}
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).rstrip(b"=").decode()
    hmac_hex = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{hmac_hex}"

def verify_token(token: str, secret: str) -> str:
    try:
        payload_b64, hmac_hex = token.split(".", 1)
    except ValueError:
        raise ValueError("Malformed token")
    expected_hmac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    if not secrets.compare_digest(hmac_hex, expected_hmac):
        raise ValueError("Invalid signature")
    # Pad base64 if needed
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    try:
        payload_json = base64.urlsafe_b64decode(padded.encode()).decode()
        payload = json.loads(payload_json)
    except Exception:
        raise ValueError("Invalid payload")
    if not isinstance(payload, dict) or "user" not in payload:
        raise ValueError("Invalid payload structure")
    return payload["user"]

def make_session_cookie(token: str, secure: bool = False) -> str:
    # Omit Secure flag by default (local HTTP dev). Set secure=True in production (Phase 6).
    secure_flag = "; Secure" if secure else ""
    return (
        f"nuttiness_session={token}; Path=/; Max-Age=604800; HttpOnly{secure_flag}; SameSite=Lax"
    )

def clear_session_cookie(secure: bool = False) -> str:
    secure_flag = "; Secure" if secure else ""
    return (
        f"nuttiness_session=; Path=/; Max-Age=0; HttpOnly{secure_flag}; SameSite=Lax"
    )
