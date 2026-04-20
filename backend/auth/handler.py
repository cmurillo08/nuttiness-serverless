import json
import os
import secrets
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext
from backend.shared import auth

app = APIGatewayRestResolver()

def _cors_headers(extra: dict = None) -> dict:
    headers = {
        "Access-Control-Allow-Origin": os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
        "Access-Control-Allow-Credentials": "true",
    }
    if extra:
        headers.update(extra)
    return headers

def _json_response(status_code: int, body: dict, extra_headers: dict = None) -> Response:
    return Response(
        status_code=status_code,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(body),
        headers=_cors_headers(extra_headers),
    )


def _json_response_with_cookies(status_code: int, body: dict, cookies: list) -> Response:
    return Response(
        status_code=status_code,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(body),
        headers=_cors_headers(),
        cookies=cookies,
    )


def _session_cookies(token: str | None = None) -> list:
    cookies = []
    if token is not None:
        cookies.append(auth.make_session_cookie(token))
    return cookies


def _clear_session_cookies() -> list:
    return [
        auth.clear_session_cookie(),
        auth.clear_session_cookie(path=auth.LEGACY_AUTH_COOKIE_PATH),
    ]

@app.post("/api/v1/auth/login")
def login():
    body = app.current_event.json_body or {}
    username = body.get("username", "")
    password = body.get("password", "")
    if not isinstance(username, str) or not username.strip() or not isinstance(password, str) or not password.strip():
        return _json_response(400, {"error": "Missing credentials"})
    env_user = os.environ.get("APP_USERNAME", "")
    env_pass = os.environ.get("APP_PASSWORD", "")
    if not (secrets.compare_digest(username, env_user) and secrets.compare_digest(password, env_pass)):
        return _json_response(401, {"error": "Invalid credentials"})
    session_secret = os.environ.get("SESSION_SECRET", "")
    token = auth.sign_token(username, session_secret)
    return _json_response_with_cookies(200, {"ok": True}, _session_cookies(token))

@app.post("/api/v1/auth/logout")
def logout():
    return _json_response_with_cookies(200, {"ok": True}, _clear_session_cookies())

@app.get("/api/v1/auth/me")
def me():
    cookie_header = app.current_event.headers.get("cookie") or app.current_event.headers.get("Cookie")
    if not cookie_header:
        return _json_response(401, {"error": "Unauthenticated"})
    token = None
    for part in cookie_header.split(";"):
        if part.strip().startswith("nuttiness_session="):
            token = part.strip().split("=", 1)[1]
            break
    if not token:
        return _json_response(401, {"error": "Unauthenticated"})
    session_secret = os.environ.get("SESSION_SECRET", "")
    try:
        username = auth.verify_token(token, session_secret)
    except Exception:
        return _json_response(401, {"error": "Unauthenticated"})
    return _json_response_with_cookies(200, {"username": username}, _session_cookies(token))

def handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
