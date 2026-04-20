from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal

class CreatePreparedProductRequest(BaseModel):
    name: str = Field(..., min_length=1)
    price: Decimal = Field(..., ge=0)
    unit: str = Field(..., min_length=1)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    recipe_notes: Optional[str] = None
    model_config = ConfigDict(str_strip_whitespace=True)

class UpdatePreparedProductRequest(BaseModel):
    name: str = Field(..., min_length=1)
    price: Decimal = Field(..., ge=0)
    unit: str = Field(..., min_length=1)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    recipe_notes: Optional[str] = None
    model_config = ConfigDict(str_strip_whitespace=True)

class CreateRawProductRequest(BaseModel):
    name: str = Field(..., min_length=1)
    unit: str = Field(..., min_length=1)
    price: Decimal = Field(..., ge=0)
    supplier: Optional[str] = None
    model_config = ConfigDict(str_strip_whitespace=True)

class UpdateRawProductRequest(BaseModel):
    name: str = Field(..., min_length=1)
    unit: str = Field(..., min_length=1)
    price: Decimal = Field(..., ge=0)
    supplier: Optional[str] = None
    model_config = ConfigDict(str_strip_whitespace=True)
