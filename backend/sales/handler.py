import json
import os
import re
import uuid
from datetime import date, datetime
from decimal import Decimal

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext
from pydantic import ValidationError
from psycopg.errors import ForeignKeyViolation, UniqueViolation

from backend.sales import db as sales_db
from backend.sales.models import SaleCreateIn, SaleItemUpdateIn, SaleLineIn, SaleTransitionIn
from backend.shared.auth import require_auth, set_request_context
from backend.shared.db import get_connection
from backend.shared.pagination import build_pagination_response, parse_pagination

logger = Logger()
app = APIGatewayRestResolver()

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)
ALLOWED_STATUSES = {"ordered", "prepared", "delivered", "paid", "cancelled"}


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
    set_request_context(
        dict(app.current_event.headers or {}),
        list(getattr(app.current_event, "cookies", []) or []),
    )
    if not require_auth():
        return _json_response({"error": "unauthorized"}, 401)
    return None


def _line_total(quantity: Decimal, unit_price: Decimal) -> Decimal:
    return quantity * unit_price


def _validate_transition(from_status: str, to_status: str) -> tuple[bool, int, str]:
    if to_status not in ALLOWED_STATUSES:
        return False, 400, "invalid to_status"

    if from_status in {"paid", "cancelled"}:
        return False, 403, f"cannot transition from {from_status}"

    if from_status == "ordered" and to_status in {"prepared", "cancelled"}:
        return True, 200, ""
    if from_status == "prepared" and to_status in {"delivered", "cancelled"}:
        return True, 200, ""
    if from_status == "delivered" and to_status in {"paid", "cancelled"}:
        return True, 200, ""

    return False, 400, f"invalid transition {from_status} -> {to_status}"


@app.get("/api/v1/sales")
def list_sales():
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    query_params = app.current_event.query_string_parameters or {}
    try:
        limit, offset = parse_pagination(query_params)
    except Exception:
        return _json_response({"error": "invalid pagination"}, 400)

    status = query_params.get("status")
    if status and status not in ALLOWED_STATUSES:
        return _json_response({"error": "invalid status"}, 400)

    try:
        with get_connection() as conn:
            items = sales_db.list_sales(limit, offset, status, conn)
            total = sales_db.count_sales(status, conn)
        return _json_response(build_pagination_response(items, total, limit, offset), 200)
    except Exception as exc:
        logger.error(f"list_sales error: {exc}")
        return _json_response({"error": "internal error"}, 500)


@app.get("/api/v1/sales/<id>")
def get_sale(id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id):
        return _json_response({"error": "invalid id"}, 400)

    try:
        with get_connection() as conn:
            sale = sales_db.get_sale_by_id(str(id), conn)
        if not sale:
            return _json_response({"error": "not found"}, 404)
        return _json_response(sale, 200)
    except Exception as exc:
        logger.error(f"get_sale error: {exc}")
        return _json_response({"error": "internal error"}, 500)


@app.post("/api/v1/sales")
def create_sale():
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    try:
        payload = SaleCreateIn(**(app.current_event.json_body or {}))
    except ValidationError as exc:
        return _json_response({"error": "validation error", "details": exc.errors()}, 400)

    if payload.status not in ALLOWED_STATUSES:
        return _json_response({"error": "invalid status"}, 400)

    conn = get_connection()
    try:
        with conn.transaction():
            customer_id = str(payload.customer_id) if payload.customer_id else None
            if customer_id and not sales_db.customer_exists(customer_id, conn):
                return _json_response({"error": "customer not found"}, 404)

            lines_payload = []
            total_amount = Decimal("0")
            for line in payload.lines:
                prepared_product_id = str(line.prepared_product_id) if line.prepared_product_id else None
                if prepared_product_id and not sales_db.prepared_product_exists(prepared_product_id, conn):
                    return _json_response({"error": "prepared_product not found"}, 404)
                line_total = _line_total(line.quantity, line.unit_price)
                lines_payload.append((prepared_product_id, line.quantity, line.unit_price, line_total))
                total_amount += line_total

            sale = sales_db.create_sale_record(customer_id, payload.status, total_amount, conn)
            for prepared_product_id, quantity, unit_price, line_total in lines_payload:
                sales_db.insert_sale_item(str(sale["id"]), prepared_product_id, quantity, unit_price, line_total, conn)

        result = sales_db.get_sale_by_id(str(sale["id"]), conn)
        return _json_response(result, 201)
    except (UniqueViolation, ForeignKeyViolation):
        return _json_response({"error": "conflict"}, 409)
    except Exception as exc:
        logger.error(f"create_sale error: {exc}")
        return _json_response({"error": "internal error"}, 500)
    finally:
        conn.close()


@app.post("/api/v1/sales/<id>/transition")
def transition_sale(id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id):
        return _json_response({"error": "invalid id"}, 400)

    try:
        payload = SaleTransitionIn(**(app.current_event.json_body or {}))
    except ValidationError as exc:
        return _json_response({"error": "validation error", "details": exc.errors()}, 400)

    try:
        with get_connection() as conn:
            current = sales_db.get_sale_status(str(id), conn)
            if not current:
                return _json_response({"error": "not found"}, 404)

            is_allowed, status_code, message = _validate_transition(current["status"], payload.to_status)
            if not is_allowed:
                return _json_response({"error": message}, status_code)

            if payload.to_status in {"delivered", "paid"} and sales_db.count_sale_items(str(id), conn) < 1:
                return _json_response({"error": "sale must contain at least one item"}, 400)

            sales_db.update_sale_status(str(id), payload.to_status, conn)
            updated = sales_db.get_sale_by_id(str(id), conn)
        return _json_response(updated, 200)
    except Exception as exc:
        logger.error(f"transition_sale error: {exc}")
        return _json_response({"error": "internal error"}, 500)


@app.post("/api/v1/sales/<id>/items")
def add_sale_item(id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id):
        return _json_response({"error": "invalid id"}, 400)

    try:
        payload = SaleLineIn(**(app.current_event.json_body or {}))
    except ValidationError as exc:
        return _json_response({"error": "validation error", "details": exc.errors()}, 400)

    conn = get_connection()
    try:
        with conn.transaction():
            sale_status = sales_db.get_sale_status(str(id), conn)
            if not sale_status:
                return _json_response({"error": "not found"}, 404)
            if sale_status["status"] != "prepared":
                return _json_response({"error": f"cannot edit items on a {sale_status['status']} sale"}, 403)

            prepared_product_id = str(payload.prepared_product_id) if payload.prepared_product_id else None
            if prepared_product_id and not sales_db.prepared_product_exists(prepared_product_id, conn):
                return _json_response({"error": "prepared_product not found"}, 404)

            line_total = _line_total(payload.quantity, payload.unit_price)
            sales_db.insert_sale_item(
                str(id),
                prepared_product_id,
                payload.quantity,
                payload.unit_price,
                line_total,
                conn,
            )
            sales_db.recalculate_sale_total(str(id), conn)

        updated = sales_db.get_sale_by_id(str(id), conn)
        return _json_response(updated, 201)
    except Exception as exc:
        logger.error(f"add_sale_item error: {exc}")
        return _json_response({"error": "internal error"}, 500)
    finally:
        conn.close()


@app.put("/api/v1/sales/<id>/items/<item_id>")
def update_sale_item(id: str, item_id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id) or not _is_valid_uuid(item_id):
        return _json_response({"error": "invalid id"}, 400)

    try:
        payload = SaleItemUpdateIn(**(app.current_event.json_body or {}))
    except ValidationError as exc:
        return _json_response({"error": "validation error", "details": exc.errors()}, 400)

    conn = get_connection()
    try:
        with conn.transaction():
            sale_status = sales_db.get_sale_status(str(id), conn)
            if not sale_status:
                return _json_response({"error": "not found"}, 404)
            if sale_status["status"] != "prepared":
                return _json_response({"error": f"cannot edit items on a {sale_status['status']} sale"}, 403)

            existing_item = sales_db.get_sale_item_by_id(str(id), str(item_id), conn)
            if not existing_item:
                return _json_response({"error": "sale item not found"}, 404)

            line_total = _line_total(payload.quantity, payload.unit_price)
            sales_db.update_sale_item(str(id), str(item_id), payload.quantity, payload.unit_price, line_total, conn)
            sales_db.recalculate_sale_total(str(id), conn)

        updated = sales_db.get_sale_by_id(str(id), conn)
        return _json_response(updated, 200)
    except Exception as exc:
        logger.error(f"update_sale_item error: {exc}")
        return _json_response({"error": "internal error"}, 500)
    finally:
        conn.close()


@app.delete("/api/v1/sales/<id>/items/<item_id>")
def delete_sale_item(id: str, item_id: str):
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    if not _is_valid_uuid(id) or not _is_valid_uuid(item_id):
        return _json_response({"error": "invalid id"}, 400)

    conn = get_connection()
    try:
        with conn.transaction():
            sale_status = sales_db.get_sale_status(str(id), conn)
            if not sale_status:
                return _json_response({"error": "not found"}, 404)
            if sale_status["status"] != "prepared":
                return _json_response({"error": f"cannot delete items from a {sale_status['status']} sale"}, 403)

            existing_item = sales_db.get_sale_item_by_id(str(id), str(item_id), conn)
            if not existing_item:
                return _json_response({"error": "sale item not found"}, 404)

            if sales_db.count_sale_items(str(id), conn) <= 1:
                return _json_response({"error": "sale must keep at least one item"}, 400)

            sales_db.delete_sale_item(str(id), str(item_id), conn)
            sales_db.recalculate_sale_total(str(id), conn)

        updated = sales_db.get_sale_by_id(str(id), conn)
        return _json_response(updated, 200)
    except Exception as exc:
        logger.error(f"delete_sale_item error: {exc}")
        return _json_response({"error": "internal error"}, 500)
    finally:
        conn.close()


handler = app.resolve


def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)