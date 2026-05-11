from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal

class CreateExpenseRequest(BaseModel):
    raw_product_id: str = Field(..., min_length=36, max_length=36)
    quantity: Decimal = Field(..., gt=0)
    cost: Decimal = Field(..., ge=0)
    purchased_at: str = Field(..., min_length=1)   # ISO 8601 datetime string
    notes: Optional[str] = None
    model_config = ConfigDict(str_strip_whitespace=True)

class UpdateExpenseRequest(BaseModel):
    raw_product_id: str = Field(..., min_length=36, max_length=36)
    quantity: Decimal = Field(..., gt=0)
    cost: Decimal = Field(..., ge=0)
    purchased_at: str = Field(..., min_length=1)
    notes: Optional[str] = None
    model_config = ConfigDict(str_strip_whitespace=True)
