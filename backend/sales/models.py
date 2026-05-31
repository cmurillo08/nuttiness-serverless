from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SaleLineIn(BaseModel):
    prepared_product_id: Optional[UUID] = None
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)

    model_config = ConfigDict(str_strip_whitespace=True)


class SaleCreateIn(BaseModel):
    customer_id: Optional[UUID] = None
    status: str = Field(default="prepared", min_length=1)
    lines: List[SaleLineIn] = Field(..., min_length=1)

    model_config = ConfigDict(str_strip_whitespace=True)


class SaleTransitionIn(BaseModel):
    to_status: str = Field(..., min_length=1)

    model_config = ConfigDict(str_strip_whitespace=True)


class SaleItemUpdateIn(BaseModel):
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)

    model_config = ConfigDict(str_strip_whitespace=True)