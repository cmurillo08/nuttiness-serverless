import json
import os
import re
import uuid
from decimal import Decimal
from datetime import datetime
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext
import psycopg
from psycopg.errors import UniqueViolation
from backend.shared.db import get_connection
from backend.shared.auth import verify_token
from backend.products import db as products_db
from backend.products.models import (
    CreatePreparedProductRequest,
    UpdatePreparedProductRequest,
    CreateRawProductRequest,
    UpdateRawProductRequest,
)
from backend.shared.pagination import parse_pagination, build_pagination_response

logger = Logger()
app = APIGatewayRestResolver()

UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

# --- Helpers ---

def _cors_headers() -> dict:
    return {
        "Access-Control-Allow-Origin": os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
        "Access-Control-Allow-Credentials": "true",
    }

def _json_response(status_code: int, body: dict, extra_headers: dict = None) -> Response:
    headers = _cors_headers()
    if extra_headers:
        headers.update(extra_headers)
    return Response(
        status_code=status_code,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(body, default=_json_serializer),
        headers=headers,
    )

def _json_serializer(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

def serialize_row(row: dict) -> dict:
    return {k: _json_serializer(v) if isinstance(v, (Decimal, datetime)) else v for k, v in row.items()}

def require_auth() -> bool:
    """Returns True if the session cookie is valid, False otherwise."""
    all_headers = dict(app.current_event.headers or {})
    logger.info("DEBUG require_auth headers", extra={"headers": all_headers})
    cookie_header = (
        app.current_event.headers.get("cookie")
        or app.current_event.headers.get("Cookie")
        or ""
    )
    logger.info("DEBUG cookie_header value", extra={"cookie_header": cookie_header})
    token = None
    for part in cookie_header.split(";"):
        if part.strip().startswith("nuttiness_session="):
            token = part.strip().split("=", 1)[1]
            break
    if not token:
        return False
    session_secret = os.environ.get("SESSION_SECRET", "")
    try:
        verify_token(token, session_secret)
        return True
    except Exception:
        return False

# --- Prepared Products Routes ---
@app.get("/api/v1/products")
def list_products():
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    qp = app.current_event.query_string_parameters or {}
    limit, offset = parse_pagination(qp)
    with get_connection() as conn:
        items = products_db.list_prepared_products(conn, limit, offset)
        total = products_db.count_prepared_products(conn)
        items = [serialize_row(row) for row in items]
    return _json_response(200, build_pagination_response(items, total, limit, offset))

@app.get("/api/v1/products/<id>")
def get_product(id):
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "Invalid ID"})
    with get_connection() as conn:
        row = products_db.get_prepared_product_by_id(conn, id)
        if not row:
            return _json_response(404, {"error": "Not found"})
        return _json_response(200, serialize_row(row))

@app.post("/api/v1/products")
def create_product():
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    try:
        body = CreatePreparedProductRequest(**app.current_event.json_body)
    except Exception as e:
        return _json_response(400, {"error": str(e)})
    try:
        with get_connection() as conn:
            row = products_db.create_prepared_product(conn, body.model_dump())
        return _json_response(201, serialize_row(row))
    except UniqueViolation:
        return _json_response(409, {"error": "Product already exists"})
    except Exception as e:
        logger.error(str(e))
        return _json_response(500, {"error": "Server error"})

@app.put("/api/v1/products/<id>")
def update_product(id):
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "Invalid ID"})
    try:
        body = UpdatePreparedProductRequest(**app.current_event.json_body)
    except Exception as e:
        return _json_response(400, {"error": str(e)})
    try:
        with get_connection() as conn:
            row = products_db.update_prepared_product_by_id(conn, id, body.model_dump())
        if not row:
            return _json_response(404, {"error": "Not found"})
        return _json_response(200, serialize_row(row))
    except UniqueViolation:
        return _json_response(409, {"error": "Product already exists"})
    except Exception as e:
        logger.error(str(e))
        return _json_response(500, {"error": "Server error"})

@app.delete("/api/v1/products/<id>")
def delete_product(id):
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "Invalid ID"})
    with get_connection() as conn:
        row = products_db.delete_prepared_product_by_id(conn, id)
        if not row:
            return _json_response(404, {"error": "Not found"})
        return _json_response(200, serialize_row(row))

# --- Raw Products Routes ---
@app.get("/api/v1/raw-products")
def list_raw_products():
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    qp = app.current_event.query_string_parameters or {}
    limit, offset = parse_pagination(qp)
    with get_connection() as conn:
        items = products_db.list_raw_products(conn, limit, offset)
        total = products_db.count_raw_products(conn)
        items = [serialize_row(row) for row in items]
    return _json_response(200, build_pagination_response(items, total, limit, offset))

@app.get("/api/v1/raw-products/<id>")
def get_raw_product(id):
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "Invalid ID"})
    with get_connection() as conn:
        row = products_db.get_raw_product_by_id(conn, id)
        if not row:
            return _json_response(404, {"error": "Not found"})
        return _json_response(200, serialize_row(row))

@app.post("/api/v1/raw-products")
def create_raw_product():
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    try:
        body = CreateRawProductRequest(**app.current_event.json_body)
    except Exception as e:
        return _json_response(400, {"error": str(e)})
    try:
        with get_connection() as conn:
            row = products_db.create_raw_product(conn, body.model_dump())
        return _json_response(201, serialize_row(row))
    except UniqueViolation:
        return _json_response(409, {"error": "Raw product already exists"})
    except Exception as e:
        logger.error(str(e))
        return _json_response(500, {"error": "Server error"})

@app.put("/api/v1/raw-products/<id>")
def update_raw_product(id):
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "Invalid ID"})
    try:
        body = UpdateRawProductRequest(**app.current_event.json_body)
    except Exception as e:
        return _json_response(400, {"error": str(e)})
    try:
        with get_connection() as conn:
            row = products_db.update_raw_product_by_id(conn, id, body.model_dump())
        if not row:
            return _json_response(404, {"error": "Not found"})
        return _json_response(200, serialize_row(row))
    except UniqueViolation:
        return _json_response(409, {"error": "Raw product already exists"})
    except Exception as e:
        logger.error(str(e))
        return _json_response(500, {"error": "Server error"})

@app.delete("/api/v1/raw-products/<id>")
def delete_raw_product(id):
    if not require_auth():
        return _json_response(401, {"error": "Unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "Invalid ID"})
    with get_connection() as conn:
        row = products_db.delete_raw_product_by_id(conn, id)
        if not row:
            return _json_response(404, {"error": "Not found"})
        return _json_response(200, serialize_row(row))

def handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
