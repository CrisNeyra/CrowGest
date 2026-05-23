"""Esquemas Pydantic del modulo ventas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ItemLineaSchema(BaseModel):
    producto_id: str
    cantidad: Decimal = Field(gt=0)
    precio_unitario: Decimal = Field(ge=0)
    subtotal: Decimal = Field(ge=0)
    nombre: str | None = None


class ComprobanteCreateSchema(BaseModel):
    cliente_id: str
    pedido_id: str | None = None
    pedido_numero: str | None = None
    items: list[ItemLineaSchema]
    observaciones: str | None = None

    @field_validator("items")
    @classmethod
    def validar_items(cls, items: list[ItemLineaSchema]) -> list[ItemLineaSchema]:
        if not items:
            msg = "El comprobante debe tener al menos un item"
            raise ValueError(msg)
        return items


class EmitirComprobanteSchema(BaseModel):
    tipo_comprobante: str = "FB"
    letra: str = "B"
    punto_venta: int = Field(default=1, ge=1)
    cae: str | None = None
    cae_vencimiento: datetime | None = None
    usar_cae_simulado: bool = True


class DesvincularSchema(BaseModel):
    motivo: str = Field(min_length=3, max_length=500)
    revertir_stock: bool = False
    revertir_cta_cte: bool = False


class NotaCreditoSchema(BaseModel):
    motivo: str = Field(min_length=3, max_length=500)
    usar_cae_simulado: bool = True


class ComprobanteReadSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    numero_interno: str
    cliente_id: str
    pedido_id: str | None
    pedido_numero: str | None
    tipo_comprobante: str
    letra: str
    punto_venta: int
    numero_fiscal: str | None
    cae: str | None
    cae_vencimiento: datetime | None
    estado_fiscal: str
    bloqueado: bool
    es_nota_credito: bool
    total: Decimal
    saldo_pendiente: Decimal
    cta_cte_impactada: bool
    items: list[dict[str, object]]
    created_at: datetime
    fecha_emision_fiscal: datetime | None


class DesvincularResultSchema(BaseModel):
    comprobante_id: UUID
    remito_id: UUID
    stock_revertido: bool
    cta_cte_revertida: bool
    monto_cta_cte: Decimal


class AfipEmissionReadSchema(BaseModel):
    cae: str
    cae_vencimiento: datetime
    numero_fiscal: str
    punto_venta: int
    letra: str
    modo: str
