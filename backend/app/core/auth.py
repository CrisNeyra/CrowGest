"""Verificacion de JWT de Firebase y dependencia get_current_user."""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.logging import get_logger
from app.core.settings import Settings, get_settings

logger = get_logger(__name__)

_firebase_lock = threading.Lock()
_firebase_initialized = False
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class CurrentUser:
    """Representacion del usuario autenticado."""

    uid: str
    email: str | None = None
    name: str | None = None
    claims: dict[str, Any] | None = None


def _init_firebase_if_needed(settings: Settings) -> None:
    """Inicializa firebase_admin una unica vez en forma lazy."""

    global _firebase_initialized

    if _firebase_initialized or settings.auth_disabled:
        return

    with _firebase_lock:
        if _firebase_initialized:
            return

        try:
            import firebase_admin
            from firebase_admin import credentials
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("firebase-admin no esta instalado") from exc

        if settings.firebase_credentials_json is None:
            logger.warning(
                "FIREBASE_CREDENTIALS_JSON no configurado; usando credenciales por defecto"
            )
            firebase_admin.initialize_app()
        else:
            value = settings.firebase_credentials_json
            try:
                cred_dict = json.loads(value)
                cred = credentials.Certificate(cred_dict)
            except json.JSONDecodeError:
                cred = credentials.Certificate(value)
            firebase_admin.initialize_app(cred)

        _firebase_initialized = True
        logger.info("firebase_admin inicializado")


def _verify_token(token: str, settings: Settings) -> CurrentUser:
    _init_firebase_if_needed(settings)

    from firebase_admin import auth as fb_auth

    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception as exc:
        logger.info("Token Firebase invalido: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    uid = decoded.get("uid") or decoded.get("user_id")
    if not isinstance(uid, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin uid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(
        uid=uid,
        email=decoded.get("email"),
        name=decoded.get("name"),
        claims=decoded,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """Dependencia FastAPI que devuelve el usuario autenticado.

    En modo `auth_disabled=True` (solo dev/test) devuelve un usuario stub.
    En produccion exige un Bearer token valido emitido por Firebase Auth.
    """

    if settings.auth_disabled:
        return CurrentUser(uid="dev-user", email="dev@crowgest.local", name="Dev User")

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta header Authorization: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _verify_token(credentials.credentials, settings)
