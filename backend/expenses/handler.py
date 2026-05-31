import json
import os
import re
import uuid
from decimal import Decimal
from datetime import datetime, date
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext
import psycopg
from pydantic import ValidationError
from backend.shared.db import get_connection
from backend.shared.auth import extract_session_token, verify_token
from backend.expenses import db as expenses_db
from backend.expenses.models import CreateExpenseRequest, UpdateExpenseRequest
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
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    return obj

def serialize_row(row: dict) -> dict:
    return {k: _json_serializer(v) if isinstance(v, (Decimal, datetime, date, uuid.UUID)) else v for k, v in row.items()}

def require_auth() -> bool:
    all_headers = dict(app.current_event.headers or {})
    token = extract_session_token(
        headers=all_headers,
        cookies=list(getattr(app.current_event, "cookies", []) or []),
    )
    if not token:
        return False
    session_secret = os.environ.get("SESSION_SECRET", "")
    try:
        verify_token(token, session_secret)
        return True
    except Exception:
        return False

# --- Routes ---
@app.get("/api/v1/expenses")
def list_expenses():
    if not require_auth():
        return _json_response(401, {"error": "unauthorized"})
    try:
        query_params = app.current_event.query_string_parameters or {}
        limit, offset = parse_pagination(query_params)
        raw_product_id = query_params.get("raw_product_id")
        if raw_product_id and not UUID_RE.match(raw_product_id):
            return _json_response(400, {"error": "invalid raw_product_id"})
        with get_connection() as conn:
            items = expenses_db.list_expenses(conn, limit, offset, raw_product_id)
            total = expenses_db.count_expenses(conn, raw_product_id)
        return _json_response(200, build_pagination_response(items, total, limit, offset))
    except Exception as e:
        logger.error(f"list_expenses error: {e}")
        return _json_response(500, {"error": "internal error"})

@app.get("/api/v1/expenses/<id>")
def get_expense(id):
    if not require_auth():
        return _json_response(401, {"error": "unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "invalid id"})
    try:
        with get_connection() as conn:
            row = expenses_db.get_expense_by_id(conn, id)
        if not row:
            return _json_response(404, {"error": "not found"})
        return _json_response(200, row)
    except Exception as e:
        logger.error(f"get_expense error: {e}")
        return _json_response(500, {"error": "internal error"})

@app.post("/api/v1/expenses")
def create_expense():
    if not require_auth():
        return _json_response(401, {"error": "unauthorized"})
    try:
        body = CreateExpenseRequest(**app.current_event.json_body)
        with get_connection() as conn:
            if not expenses_db.raw_product_exists(conn, body.raw_product_id):
                return _json_response(404, {"error": "raw_product not found"})
            row = expenses_db.create_expense(conn, body.model_dump())
        return _json_response(201, row)
    except ValidationError as e:
        return _json_response(400, {"error": str(e)})
    except Exception as e:
        logger.error(f"create_expense error: {e}")
        return _json_response(500, {"error": "internal error"})

@app.put("/api/v1/expenses/<id>")
def update_expense(id):
    if not require_auth():
        return _json_response(401, {"error": "unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "invalid id"})
    try:
        body = UpdateExpenseRequest(**app.current_event.json_body)
        with get_connection() as conn:
            if not expenses_db.get_expense_by_id(conn, id):
                return _json_response(404, {"error": "not found"})
            if not expenses_db.raw_product_exists(conn, body.raw_product_id):
                return _json_response(404, {"error": "raw_product not found"})
            row = expenses_db.update_expense(conn, id, body.model_dump())
        return _json_response(200, row)
    except ValidationError as e:
        return _json_response(400, {"error": str(e)})
    except Exception as e:
        logger.error(f"update_expense error: {e}")
        return _json_response(500, {"error": "internal error"})

@app.delete("/api/v1/expenses/<id>")
def delete_expense(id):
    if not require_auth():
        return _json_response(401, {"error": "unauthorized"})
    if not UUID_RE.match(id):
        return _json_response(400, {"error": "invalid id"})
    try:
        with get_connection() as conn:
            row = expenses_db.delete_expense(conn, id)
        if not row:
            return _json_response(404, {"error": "not found"})
        return _json_response(204, {})
    except Exception as e:
        logger.error(f"delete_expense error: {e}")
        return _json_response(500, {"error": "internal error"})

def handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
