"""Proveedor de emision fiscal AFIP/ARCA."""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.core.exceptions import bad_request
from app.core.settings import Settings, get_settings


@dataclass(frozen=True, slots=True)
class AfipEmissionRequest:
    """Datos minimos para solicitar CAE."""

    tipo_comprobante: str
    letra: str
    punto_venta: int
    numero_fiscal: int
    total: Decimal
    cliente_id: str
    cae_manual: str | None = None
    cae_vencimiento_manual: datetime | None = None


@dataclass(frozen=True, slots=True)
class AfipEmissionResult:
    cae: str
    cae_vencimiento: datetime
    numero_fiscal: str
    modo: str


class AfipService:
    """Emisión fiscal. Modo simulado para desarrollo; WSAA/WSFEv1 para ARCA.

    El cliente WSFE se puede inyectar (para tests) o se construye perezosamente
    a partir de la configuración cuando el modo es homologacion/production.
    """

    def __init__(self, settings: Settings | None = None, wsfe_client=None) -> None:
        self._settings = settings or get_settings()
        self._wsfe_client = wsfe_client

    def emitir(self, request: AfipEmissionRequest) -> AfipEmissionResult:
        if self._settings.afip_mode == "simulated":
            return self._emitir_simulado(request)
        if self._settings.afip_mode in ("homologacion", "production"):
            return self._emitir_wsfe(request)
        msg = f"Modo AFIP no soportado: {self._settings.afip_mode}"
        raise bad_request(msg, "AFIP_MODE_INVALID")

    def _get_wsfe_client(self):
        if self._wsfe_client is not None:
            return self._wsfe_client
        from app.modules.ventas.afip_wsfe import WsfeClient

        self._wsfe_client = WsfeClient(self._settings)
        return self._wsfe_client

    def _emitir_wsfe(self, request: AfipEmissionRequest) -> AfipEmissionResult:
        client = self._get_wsfe_client()
        result = client.solicitar_cae(
            tipo_comprobante=request.tipo_comprobante,
            letra=request.letra,
            punto_venta=request.punto_venta,
            total=request.total,
            numero_fiscal=request.numero_fiscal,
        )
        return AfipEmissionResult(
            cae=result.cae,
            cae_vencimiento=result.cae_vencimiento,
            numero_fiscal=str(result.numero_fiscal).zfill(8),
            modo=self._settings.afip_mode,
        )

    def _emitir_simulado(self, request: AfipEmissionRequest) -> AfipEmissionResult:
        if request.cae_manual:
            cae = request.cae_manual.replace(" ", "")
            if len(cae) != 14 or not cae.isdigit():
                raise bad_request("El CAE debe tener 14 digitos numericos", "CAE_INVALID")
        else:
            base = datetime.now(UTC).strftime("%y%m%d%H%M%S")
            cae = f"{base}{random.randint(100, 999):03d}"[:14].ljust(14, "0")

        vencimiento = request.cae_vencimiento_manual or (
            datetime.now(UTC) + timedelta(days=self._settings.afip_cae_dias_validez)
        )
        numero_fiscal = str(request.numero_fiscal).zfill(8)

        return AfipEmissionResult(
            cae=cae,
            cae_vencimiento=vencimiento,
            numero_fiscal=numero_fiscal,
            modo="simulated",
        )

