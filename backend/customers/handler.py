import json
import os
import re
import uuid
from datetime import date, datetime
from decimal import Decimal

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext
from psycopg.errors import ForeignKeyViolation, UniqueViolation
from pydantic import ValidationError

from backend.customers import db as customers_db
from backend.customers.models import CustomerIn
from backend.shared.auth import require_auth, set_request_headers
from backend.shared.db import get_connection
from backend.shared.pagination import build_pagination_response, parse_pagination

logger = Logger()
app = APIGatewayRestResolver()

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def _cors_headers() -> dict:
    return {
        "Access-Control-Allow-Origin": os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
        "Access-Control-Allow-Credentials": "true",
    }


def _json_serializer(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def _json_response(data: dict, status_code: int = 200) -> Response:
    return Response(
        status_code=status_code,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(data, default=_json_serializer),
        headers=_cors_headers(),
    )


def _is_valid_uuid(value: str) -> bool:
    return bool(UUID_RE.match(value))


def _ensure_auth() -> Response | None:
    set_request_headers(dict(app.current_event.headers or {}))
    if not require_auth():
        return _json_response({"error": "unauthorized"}, 401)
    return None


@app.get("/api/v1/customers")
def list_customers():
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    try:
        query_params = app.current_event.query_string_parameters or {}
        limit, offset = parse_pagination(query_params)
    except Exception:
        return _json_response({"error": "invalid pagination"}, 400)

    try:
        with get_connection() as conn:
            items = customers_db.list_customers(limit, offset, conn)
            total = customers_db.count_customers(conn)
        return _json_response(build_pagination_response(items, total, limit, offset), 200)
    except Exception as exc:
        logger.error(f"list_customers error: {exc}")
        return _json_response({"error": "internal error"}, 500)


@app.get("/api/v1/customers/<id>")
def get_customer(id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id):
        return _json_response({"error": "invalid id"}, 400)

    try:
        with get_connection() as conn:
            customer = customers_db.get_customer_by_id(str(id), conn)
        if not customer:
            return _json_response({"error": "not found"}, 404)
        return _json_response(customer, 200)
    except Exception as exc:
        logger.error(f"get_customer error: {exc}")
        return _json_response({"error": "internal error"}, 500)


@app.post("/api/v1/customers")
def create_customer():
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    try:
        body = CustomerIn(**(app.current_event.json_body or {}))
    except ValidationError as exc:
        return _json_response({"error": "validation error", "details": exc.errors()}, 400)

    try:
        with get_connection() as conn:
            customer = customers_db.create_customer(body.model_dump(), conn)
        return _json_response(customer, 201)
    except UniqueViolation:
        return _json_response({"error": "customer name already exists"}, 409)
    except Exception as exc:
        logger.error(f"create_customer error: {exc}")
        return _json_response({"error": "internal error"}, 500)


@app.put("/api/v1/customers/<id>")
def update_customer(id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id):
        return _json_response({"error": "invalid id"}, 400)

    try:
        body = CustomerIn(**(app.current_event.json_body or {}))
    except ValidationError as exc:
        return _json_response({"error": "validation error", "details": exc.errors()}, 400)

    try:
        with get_connection() as conn:
            customer = customers_db.update_customer(str(id), body.model_dump(), conn)
        if not customer:
            return _json_response({"error": "not found"}, 404)
        return _json_response(customer, 200)
    except UniqueViolation:
        return _json_response({"error": "customer name already exists"}, 409)
    except Exception as exc:
        logger.error(f"update_customer error: {exc}")
        return _json_response({"error": "internal error"}, 500)


@app.delete("/api/v1/customers/<id>")
def delete_customer(id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id):
        return _json_response({"error": "invalid id"}, 400)

    try:
        with get_connection() as conn:
            deleted = customers_db.delete_customer(str(id), conn)
        if not deleted:
            return _json_response({"error": "not found"}, 404)
        return _json_response({}, 200)
    except ForeignKeyViolation:
        return _json_response({"error": "cannot delete customer with existing sales"}, 409)
    except Exception as exc:
        logger.error(f"delete_customer error: {exc}")
        return _json_response({"error": "internal error"}, 500)


handler = app.resolve


def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)