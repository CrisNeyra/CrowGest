"""Tests del flujo WSAA/WSFEv1 con cliente mockeado (sin llamar a ARCA)."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.core.settings import Settings
from app.modules.ventas.afip_service import AfipEmissionRequest, AfipService
from app.modules.ventas.afip_wsfe import (
    WsfeCaeResult,
    codigo_comprobante_afip,
    desglosar_iva_21,
)


class _FakeWsfeClient:
    """Simula la respuesta aprobada de WSFE sin tocar la red."""

    def __init__(self) -> None:
        self.llamadas = []

    def solicitar_cae(self, **kwargs) -> WsfeCaeResult:
        self.llamadas.append(kwargs)
        return WsfeCaeResult(
            cae="61234567890123",
            cae_vencimiento=datetime(2026, 7, 15, tzinfo=UTC),
            numero_fiscal=kwargs["numero_fiscal"],
            resultado="A",
        )


def _request() -> AfipEmissionRequest:
    return AfipEmissionRequest(
        tipo_comprobante="FB",
        letra="B",
        punto_venta=1,
        numero_fiscal=42,
        total=Decimal("1210.00"),
        cliente_id="cliente-1",
    )


def test_homologacion_usa_wsfe_client() -> None:
    settings = Settings(afip_mode="homologacion", afip_cuit="20111111112")
    fake = _FakeWsfeClient()
    service = AfipService(settings=settings, wsfe_client=fake)

    result = service.emitir(_request())

    assert result.cae == "61234567890123"
    assert result.numero_fiscal == "00000042"
    assert result.modo == "homologacion"
    assert fake.llamadas[0]["punto_venta"] == 1
    assert fake.llamadas[0]["total"] == Decimal("1210.00")


def test_simulado_no_usa_wsfe() -> None:
    settings = Settings(afip_mode="simulated")
    service = AfipService(settings=settings)
    result = service.emitir(_request())
    assert len(result.cae) == 14
    assert result.modo == "simulated"


def test_codigo_comprobante_afip_mapea_letras() -> None:
    assert codigo_comprobante_afip("FA", "A") == 1
    assert codigo_comprobante_afip("FB", "B") == 6
    assert codigo_comprobante_afip("NC", "A") == 3


def test_codigo_comprobante_afip_rechaza_desconocido() -> None:
    with pytest.raises(HTTPException):
        codigo_comprobante_afip("XX", "Z")


def test_desglosar_iva_21_sin_float() -> None:
    total, neto, iva = desglosar_iva_21(Decimal("1210.00"))
    assert total == Decimal("1210.00")
    assert neto == Decimal("1000.00")
    assert iva == Decimal("210.00")
    assert neto + iva == total


def test_desglosar_iva_21_redondeo_centavos() -> None:
    total, neto, iva = desglosar_iva_21(Decimal("100.00"))
    assert neto + iva == total
    assert total.as_tuple().exponent == -2
    assert neto.as_tuple().exponent == -2
    assert iva.as_tuple().exponent == -2
