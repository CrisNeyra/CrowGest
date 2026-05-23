"""Tests del modulo comprobantes fiscales."""

from __future__ import annotations

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.db import Base, engine
from app.modules.ventas.models import Comprobante, Remito


@pytest.fixture(autouse=True)
def _create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _item() -> dict[str, object]:
    return {
        "producto_id": "prod-1",
        "cantidad": "2",
        "precio_unitario": "100",
        "subtotal": "200",
        "nombre": "Producto test",
    }


def test_crear_y_emitir_comprobante(client: TestClient) -> None:
    create_resp = client.post(
        "/api/v1/ventas/comprobantes",
        json={
            "cliente_id": "cliente-1",
            "pedido_id": "ped-1",
            "pedido_numero": "PED-000001",
            "items": [_item()],
        },
    )
    assert create_resp.status_code == 201
    comp_id = create_resp.json()["id"]

    emit_resp = client.post(
        f"/api/v1/ventas/comprobantes/{comp_id}/emitir",
        json={"tipo_comprobante": "FB", "letra": "B", "punto_venta": 1, "usar_cae_simulado": True},
    )
    assert emit_resp.status_code == 200
    body = emit_resp.json()
    assert body["cae"] is not None
    assert len(body["cae"]) == 14
    assert body["bloqueado"] is True
    assert body["estado_fiscal"] == "emitido"
    assert body["cta_cte_impactada"] is True


def test_desvincular_con_reversion(client: TestClient) -> None:
    with Session(engine) as db:
        remito = Remito(
            numero="REM-000001",
            pedido_id="ped-1",
            pedido_numero="PED-000001",
            cliente_id="cliente-1",
            total=Decimal("200"),
            items=[_item()],
            estado="emitido",
        )
        db.add(remito)
        db.flush()

        comp = Comprobante(
            numero_interno="F-000001",
            cliente_id="cliente-1",
            total=Decimal("200"),
            saldo_pendiente=Decimal("200"),
            items=[_item()],
            cta_cte_impactada=True,
        )
        db.add(comp)
        db.commit()
        remito_id = str(remito.id)
        comp_id = str(comp.id)

    client.post(f"/api/v1/ventas/remitos/{remito_id}/vincular/{comp_id}")

    desv = client.post(
        f"/api/v1/ventas/remitos/{remito_id}/desvincular/{comp_id}",
        json={
            "motivo": "Error de imputacion en prueba",
            "revertir_stock": True,
            "revertir_cta_cte": True,
        },
    )
    assert desv.status_code == 200
    result = desv.json()
    assert result["stock_revertido"] is True
    assert result["cta_cte_revertida"] is True


def test_no_desvincular_comprobante_con_cae(client: TestClient) -> None:
    create_resp = client.post(
        "/api/v1/ventas/comprobantes",
        json={"cliente_id": "c1", "items": [_item()]},
    )
    comp_id = create_resp.json()["id"]
    client.post(
        f"/api/v1/ventas/comprobantes/{comp_id}/emitir",
        json={"usar_cae_simulado": True},
    )

    with Session(engine) as db:
        remito = Remito(
            numero="REM-000002",
            pedido_id="p2",
            pedido_numero="PED-2",
            cliente_id="c1",
            total=Decimal("200"),
            items=[_item()],
        )
        db.add(remito)
        db.commit()
        remito_id = str(remito.id)

    client.post(f"/api/v1/ventas/remitos/{remito_id}/vincular/{comp_id}")
    desv = client.post(
        f"/api/v1/ventas/remitos/{remito_id}/desvincular/{comp_id}",
        json={"motivo": "Intento invalido", "revertir_stock": False, "revertir_cta_cte": False},
    )
    assert desv.status_code == 409
