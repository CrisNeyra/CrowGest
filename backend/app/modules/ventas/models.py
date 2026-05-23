"""Modelos ORM del modulo ventas y comprobantes fiscales."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.db import Base

JsonType = JSON().with_variant(JSONB(), "postgresql")


class EstadoFiscal(str, enum.Enum):
    BORRADOR = "borrador"
    EMITIDO = "emitido"
    ANULADO = "anulado"


class EstadoRemito(str, enum.Enum):
    EMITIDO = "emitido"
    ANULADO = "anulado"
    STOCK_REVERTIDO = "stock_revertido"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)


class Comprobante(Base):
    __tablename__ = "comprobantes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    numero_interno: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    cliente_id: Mapped[str] = mapped_column(String(128), index=True)
    pedido_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    pedido_numero: Mapped[str | None] = mapped_column(String(32), nullable=True)

    tipo_comprobante: Mapped[str] = mapped_column(String(8), default="FB")
    letra: Mapped[str] = mapped_column(String(1), default="B")
    punto_venta: Mapped[int] = mapped_column(Integer, default=1)
    numero_fiscal: Mapped[str | None] = mapped_column(String(16), nullable=True)

    cae: Mapped[str | None] = mapped_column(String(14), nullable=True, index=True)
    cae_vencimiento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estado_fiscal: Mapped[str] = mapped_column(String(16), default=EstadoFiscal.BORRADOR.value)
    bloqueado: Mapped[bool] = mapped_column(Boolean, default=False)
    es_nota_credito: Mapped[bool] = mapped_column(Boolean, default=False)
    comprobante_origen_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("comprobantes.id"), nullable=True
    )

    total: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    saldo_pendiente: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    cta_cte_impactada: Mapped[bool] = mapped_column(Boolean, default=False)

    items: Mapped[list[dict[str, Any]]] = mapped_column(JsonType)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    fecha_emision_fiscal: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    vinculos_remito: Mapped[list[RemitoComprobanteVinculo]] = relationship(
        back_populates="comprobante",
        cascade="all, delete-orphan",
    )


class Remito(Base):
    __tablename__ = "remitos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    numero: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    pedido_id: Mapped[str] = mapped_column(String(128), index=True)
    pedido_numero: Mapped[str] = mapped_column(String(32))
    cliente_id: Mapped[str] = mapped_column(String(128), index=True)

    total: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    items: Mapped[list[dict[str, Any]]] = mapped_column(JsonType)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    estado: Mapped[str] = mapped_column(String(24), default=EstadoRemito.EMITIDO.value)
    stock_revertido: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vinculos_comprobante: Mapped[list[RemitoComprobanteVinculo]] = relationship(
        back_populates="remito",
        cascade="all, delete-orphan",
    )


class RemitoComprobanteVinculo(Base):
    """Relacion m:n entre remitos y comprobantes."""

    __tablename__ = "remito_comprobante_vinculos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    remito_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("remitos.id", ondelete="CASCADE"))
    comprobante_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("comprobantes.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    remito: Mapped[Remito] = relationship(back_populates="vinculos_comprobante")
    comprobante: Mapped[Comprobante] = relationship(back_populates="vinculos_remito")
