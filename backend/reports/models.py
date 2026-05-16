from pydantic import BaseModel


class FinancialSummaryResponse(BaseModel):
    total_expenses_amount: float
    total_sales_amount: float
    historical_profit: float
    generated_at: str
