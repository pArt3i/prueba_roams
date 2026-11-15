"""Dependencies shared by the routers."""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.db import get_db


async def read_body(request: Request) -> bytes:
    """Raw body: the JSON is parsed by hand so FastAPI's own 422 never appears."""
    return await request.body()


Db = Annotated[Session, Depends(get_db)]
Body = Annotated[bytes, Depends(read_body)]
