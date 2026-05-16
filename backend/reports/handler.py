import json
import os
from datetime import datetime

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext

from backend.reports.db import get_financial_summary
from backend.reports.models import FinancialSummaryResponse
from backend.shared.auth import require_auth, set_request_headers
from backend.shared.db import get_connection

logger = Logger()
app = APIGatewayRestResolver()


def _cors_headers() -> dict:
    return {
        "Access-Control-Allow-Origin": os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
        "Access-Control-Allow-Credentials": "true",
    }


def _json_response(data: dict, status_code: int = 200) -> Response:
    return Response(
        status_code=status_code,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(data),
        headers=_cors_headers(),
    )


def _ensure_auth() -> Response | None:
    set_request_headers(dict(app.current_event.headers or {}))
    if not require_auth():
        return _json_response({"error": "unauthorized"}, 401)
    return None


@app.get("/api/v1/reports/summary")
def get_reports_summary():
    unauthorized = _ensure_auth()
    if unauthorized:
        return unauthorized

    try:
        with get_connection() as conn:
            summary = get_financial_summary(conn)

        total_expenses_amount = summary["total_expenses_cost"]
        total_sales_amount = summary["total_sales_amount"]
        historical_profit = round(total_sales_amount - total_expenses_amount, 2)
        generated_at = datetime.utcnow().isoformat() + "Z"

        response = FinancialSummaryResponse(
            total_expenses_amount=total_expenses_amount,
            total_sales_amount=total_sales_amount,
            historical_profit=historical_profit,
            generated_at=generated_at,
        )
        return _json_response(response.model_dump(), 200)
    except Exception as exc:
        logger.error(f"get_reports_summary error: {exc}")
        return _json_response({"error": "internal error"}, 500)


handler = app.resolve


def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
