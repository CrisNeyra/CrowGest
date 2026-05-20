"""Configuracion de logging estructurado para la aplicacion."""

from __future__ import annotations

import logging
import sys
from logging.config import dictConfig

from app.core.settings import get_settings


def configure_logging() -> None:
    """Configura formato y nivel de logs segun settings."""

    settings = get_settings()

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "stream": sys.stdout,
                    "formatter": "default",
                    "level": settings.log_level,
                },
            },
            "root": {
                "level": settings.log_level,
                "handlers": ["console"],
            },
            "loggers": {
                "uvicorn.access": {"level": "INFO", "propagate": False, "handlers": ["console"]},
                "sqlalchemy.engine": {
                    "level": "WARNING" if not settings.database_echo else "INFO",
                    "propagate": False,
                    "handlers": ["console"],
                },
            },
        }
    )


def get_logger(name: str) -> logging.Logger:
    """Devuelve un logger nombrado consistente."""

    return logging.getLogger(name)
