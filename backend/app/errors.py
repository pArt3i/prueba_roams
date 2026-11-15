"""Every error answers `{"detail": "texto en español"}` (spec 001, R13)."""

from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

REQUEST_INVALID = "Solicitud no válida."
INTERNAL_ERROR = "Error interno del servidor."
# Texts of the errors Starlette raises by itself (unknown route, wrong method).
_DEFAULT_TEXTS = {404: "Recurso no encontrado.", 405: "Método no permitido."}


async def _validation_error(_: Request, __: Exception) -> JSONResponse:
    """FastAPI's own validation (no endpoint declares typed input) never leaks."""
    return JSONResponse(status_code=422, content={"detail": REQUEST_INVALID})


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    detail = exc.detail
    if detail == HTTPStatus(exc.status_code).phrase:
        detail = _DEFAULT_TEXTS.get(exc.status_code, "Error en la petición.")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
        headers=getattr(exc, "headers", None),
    )


async def _unhandled_error(_: Request, __: Exception) -> JSONResponse:
    """Nothing about the failure (type, message, trace) reaches the client."""
    return JSONResponse(status_code=500, content={"detail": INTERNAL_ERROR})


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(Exception, _unhandled_error)
