"""Dependencias FastAPI reutilizables."""

from __future__ import annotations

from app.core.auth import CurrentUser, get_current_user
from app.core.db import get_db

__all__ = ["CurrentUser", "get_current_user", "get_db"]
