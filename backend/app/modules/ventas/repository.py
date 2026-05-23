"""Acceso a datos del modulo ventas."""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.ventas.models import (
    AuditLog,
    Comprobante,
    EstadoFiscal,
    EstadoRemito,
    Remito,
    RemitoComprobanteVinculo,
)


class VentasRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add_audit(
        self,
        *,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        payload: dict[str, object] | None = None,
        motivo: str | None = None,
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
            motivo=motivo,
        )
        self._db.add(log)
        return log

    def count_comprobantes_fiscales_pv(self, punto_venta: int) -> int:
        stmt = select(func.count()).select_from(Comprobante).where(
            Comprobante.punto_venta == punto_venta,
            Comprobante.cae.isnot(None),
        )
        return int(self._db.scalar(stmt) or 0)

    def get_comprobante(self, comprobante_id: uuid.UUID) -> Comprobante | None:
        return self._db.get(Comprobante, comprobante_id)

    def get_remito(self, remito_id: uuid.UUID) -> Remito | None:
        return self._db.get(Remito, remito_id)

    def list_comprobantes(self, limit: int = 100) -> list[Comprobante]:
        stmt = select(Comprobante).order_by(Comprobante.created_at.desc()).limit(limit)
        return list(self._db.scalars(stmt).all())

    def vinculos_activos_por_remito(self, remito_id: uuid.UUID) -> list[RemitoComprobanteVinculo]:
        stmt = select(RemitoComprobanteVinculo).where(
            RemitoComprobanteVinculo.remito_id == remito_id,
            RemitoComprobanteVinculo.activo.is_(True),
        )
        return list(self._db.scalars(stmt).all())

    def vinculo_activo(
        self, remito_id: uuid.UUID, comprobante_id: uuid.UUID
    ) -> RemitoComprobanteVinculo | None:
        stmt = select(RemitoComprobanteVinculo).where(
            RemitoComprobanteVinculo.remito_id == remito_id,
            RemitoComprobanteVinculo.comprobante_id == comprobante_id,
            RemitoComprobanteVinculo.activo.is_(True),
        )
        return self._db.scalar(stmt)

    def create_comprobante(
        self,
        *,
        numero_interno: str,
        cliente_id: str,
        items: list[dict[str, object]],
        total: Decimal,
        pedido_id: str | None = None,
        pedido_numero: str | None = None,
        observaciones: str | None = None,
    ) -> Comprobante:
        comp = Comprobante(
            numero_interno=numero_interno,
            cliente_id=cliente_id,
            pedido_id=pedido_id,
            pedido_numero=pedido_numero,
            items=items,
            total=total,
            saldo_pendiente=total,
            observaciones=observaciones,
            estado_fiscal=EstadoFiscal.BORRADOR.value,
        )
        self._db.add(comp)
        self._db.flush()
        return comp

    def crear_vinculo(self, remito_id: uuid.UUID, comprobante_id: uuid.UUID) -> RemitoComprobanteVinculo:
        vinculo = RemitoComprobanteVinculo(remito_id=remito_id, comprobante_id=comprobante_id, activo=True)
        self._db.add(vinculo)
        self._db.flush()
        return vinculo

    def desactivar_vinculo(self, vinculo: RemitoComprobanteVinculo) -> None:
        vinculo.activo = False

    def next_numero_interno(self) -> str:
        count = self._db.scalar(select(func.count()).select_from(Comprobante)) or 0
        return f"F-{int(count) + 1:06d}"
