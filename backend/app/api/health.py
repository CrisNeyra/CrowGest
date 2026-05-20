"""Endpoints de healthcheck y metadata del servicio."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.settings import Settings, get_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Respuesta del endpoint de salud."""

    status: Literal["ok"]
    version: str
    environment: str


@router.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Indica que el servicio esta vivo."""

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        environment=settings.environment,
    )
