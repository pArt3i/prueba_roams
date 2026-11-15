"""Response schema of the customer endpoints."""

from pydantic import BaseModel, ConfigDict


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    tax_id: str
    email: str
    country: str
    plan: str
