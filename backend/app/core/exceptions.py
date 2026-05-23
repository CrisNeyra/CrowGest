"""Errores HTTP con codigo de dominio."""

from __future__ import annotations

from fastapi import HTTPException, status


class AppError(HTTPException):
    """Error de aplicacion con codigo estable para el cliente."""

    def __init__(self, status_code: int, detail: str, code: str) -> None:
        super().__init__(status_code=status_code, detail={"detail": detail, "code": code})


def not_found(message: str, code: str = "NOT_FOUND") -> AppError:
    return AppError(status.HTTP_404_NOT_FOUND, message, code)


def bad_request(message: str, code: str = "BAD_REQUEST") -> AppError:
    return AppError(status.HTTP_400_BAD_REQUEST, message, code)


def conflict(message: str, code: str = "CONFLICT") -> AppError:
    return AppError(status.HTTP_409_CONFLICT, message, code)
