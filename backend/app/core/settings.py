"""Configuracion centralizada cargada desde variables de entorno."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuracion de la aplicacion."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "CrowGest API"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production", "test"] = "development"
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )

    database_url: str = Field(
        default="postgresql+psycopg://crowgest:crowgest@localhost:5432/crowgest",
        description="DSN SQLAlchemy. En tests se usa sqlite+pysqlite:///:memory:",
    )
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10

    firebase_project_id: str | None = None
    firebase_credentials_json: str | None = Field(
        default=None,
        description="Path al service account JSON o JSON inline.",
    )
    auth_disabled: bool = Field(
        default=False,
        description="Si es True, get_current_user devuelve un usuario stub (solo dev/test).",
    )

    afip_mode: Literal["simulated", "homologacion", "production"] = Field(
        default="simulated",
        description=(
            "simulated genera CAE de prueba; homologacion usa WSAA/WSFE de testing de ARCA; "
            "production usa los servicios productivos (requiere certificados)."
        ),
    )
    afip_cuit: str | None = Field(default=None, description="CUIT del emisor para WSFE.")
    afip_punto_venta_default: int = Field(default=1, ge=1)
    afip_cae_dias_validez: int = Field(default=10, ge=1, le=30)

    # Certificado digital ARCA (X.509) y clave privada para firmar el TRA de WSAA.
    afip_cert_path: str | None = Field(
        default=None, description="Ruta al certificado .crt/.pem emitido por ARCA."
    )
    afip_key_path: str | None = Field(
        default=None, description="Ruta a la clave privada .key/.pem del certificado."
    )
    # URLs de WSAA / WSFEv1. Por defecto apuntan a homologacion.
    afip_wsaa_url: str = Field(
        default="https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl"
    )
    afip_wsfe_url: str = Field(
        default="https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Devuelve la instancia cacheada de Settings."""

    return Settings()
