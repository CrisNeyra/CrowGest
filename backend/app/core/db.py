"""Sesion y motor de SQLAlchemy."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.settings import get_settings


class Base(DeclarativeBase):
    """Clase base para todos los modelos ORM."""


def _build_engine() -> Engine:
    settings = get_settings()
    if settings.database_url.startswith("sqlite"):
        return create_engine(
            settings.database_url,
            echo=settings.database_echo,
            connect_args={"check_same_thread": False},
            future=True,
        )
    return create_engine(
        settings.database_url,
        echo=settings.database_echo,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_pre_ping=True,
        future=True,
    )


engine: Engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Dependencia FastAPI: provee una sesion por request y la cierra al final."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
