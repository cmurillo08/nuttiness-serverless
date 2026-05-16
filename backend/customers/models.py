from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CustomerIn(BaseModel):
    name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(str_strip_whitespace=True)