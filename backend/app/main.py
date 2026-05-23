"""Punto de entrada de la API FastAPI de CrowGest."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.modules.ventas.router import router as ventas_router
from app.core.logging import configure_logging, get_logger
from app.core.settings import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Hook de arranque/cierre de la app."""

    configure_logging()
    logger = get_logger(__name__)
    settings = get_settings()
    logger.info(
        "Iniciando %s v%s en entorno=%s",
        settings.app_name,
        settings.app_version,
        settings.environment,
    )
    yield
    logger.info("Cerrando %s", settings.app_name)


def create_app() -> FastAPI:
    """Factory de la aplicacion FastAPI."""

    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API REST del sistema de gestion CrowGest (ERP/CRM).",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url=f"{settings.api_v1_prefix}/docs",
        redoc_url=f"{settings.api_v1_prefix}/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(ventas_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
