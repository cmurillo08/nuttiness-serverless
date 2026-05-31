import hmac
import hashlib
import base64
import json
import secrets
import time
from contextvars import ContextVar
from typing import Any
from aws_lambda_powertools.shared.cookies import Cookie, SameSite


SESSION_COOKIE_NAME = "nuttiness_session"
LEGACY_AUTH_COOKIE_PATH = "/api/v1/auth/"
_REQUEST_HEADERS: ContextVar[dict[str, Any]] = ContextVar("request_headers", default={})
_REQUEST_COOKIES: ContextVar[list[str]] = ContextVar("request_cookies", default=[])

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


def set_request_headers(headers: dict[str, Any] | None) -> None:
    _REQUEST_HEADERS.set(headers or {})
    _REQUEST_COOKIES.set([])


def set_request_context(headers: dict[str, Any] | None, cookies: list[str] | None) -> None:
    _REQUEST_HEADERS.set(headers or {})
    _REQUEST_COOKIES.set(cookies or [])


def extract_session_token(
    headers: dict[str, Any] | None = None,
    cookies: list[str] | None = None,
) -> str | None:
    cookie_sources: list[str] = []

    if cookies:
        cookie_sources.extend(cookies)

    if headers:
        cookie_header = headers.get("cookie") or headers.get("Cookie")
        if cookie_header:
            cookie_sources.append(cookie_header)

    for cookie_source in cookie_sources:
        for part in cookie_source.split(";"):
            if part.strip().startswith(f"{SESSION_COOKIE_NAME}="):
                return part.strip().split("=", 1)[1]

    return None


def require_auth() -> bool:
    headers = _REQUEST_HEADERS.get() or {}
    cookies = _REQUEST_COOKIES.get() or []
    token = extract_session_token(headers=headers, cookies=cookies)
    if not token:
        return False

    import os

    session_secret = os.environ.get("SESSION_SECRET", "")
    try:
        verify_token(token, session_secret)
        return True
    except Exception:
        return False

def make_session_cookie(token: str, secure: bool = False, path: str = "/") -> Cookie:
    # Omit Secure in local HTTP dev. Enable it in production once HTTPS is in place.
    return Cookie(
        name=SESSION_COOKIE_NAME,
        value=token,
        path=path,
        max_age=604800,
        http_only=True,
        secure=secure,
        same_site=SameSite.LAX_MODE,
    )

def clear_session_cookie(secure: bool = False, path: str = "/") -> Cookie:
    return Cookie(
        name=SESSION_COOKIE_NAME,
        value="",
        path=path,
        max_age=0,
        http_only=True,
        secure=secure,
        same_site=SameSite.LAX_MODE,
    )
