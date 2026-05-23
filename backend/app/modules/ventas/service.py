"""Logica de negocio: comprobantes fiscales y desvinculacion remito."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.exceptions import bad_request, conflict, not_found
from app.modules.ventas.afip_service import AfipEmissionRequest, AfipService
from app.modules.ventas.models import Comprobante, EstadoFiscal, EstadoRemito, Remito
from app.modules.ventas.repository import VentasRepository
from app.modules.ventas.schemas import (
    ComprobanteCreateSchema,
    ComprobanteReadSchema,
    DesvincularResultSchema,
    DesvincularSchema,
    EmitirComprobanteSchema,
    NotaCreditoSchema,
)


class VentasService:
    def __init__(self, db: Session, afip: AfipService | None = None) -> None:
        self._db = db
        self._repo = VentasRepository(db)
        self._afip = afip or AfipService()

    def crear_comprobante_borrador(
        self, data: ComprobanteCreateSchema, user: CurrentUser
    ) -> ComprobanteReadSchema:
        total = sum((item.subtotal for item in data.items), Decimal("0"))
        items_dict = [item.model_dump(mode="json") for item in data.items]
        numero = self._repo.next_numero_interno()

        comp = self._repo.create_comprobante(
            numero_interno=numero,
            cliente_id=data.cliente_id,
            items=items_dict,
            total=total,
            pedido_id=data.pedido_id,
            pedido_numero=data.pedido_numero,
            observaciones=data.observaciones,
        )
        self._repo.add_audit(
            user_id=user.uid,
            action="comprobante.creado",
            entity_type="comprobante",
            entity_id=str(comp.id),
            payload={"numero_interno": numero, "total": str(total)},
        )
        self._db.commit()
        self._db.refresh(comp)
        return ComprobanteReadSchema.model_validate(comp)

    def emitir_comprobante_fiscal(
        self,
        comprobante_id: uuid.UUID,
        data: EmitirComprobanteSchema,
        user: CurrentUser,
    ) -> ComprobanteReadSchema:
        comp = self._repo.get_comprobante(comprobante_id)
        if comp is None:
            raise not_found("Comprobante no encontrado", "COMPROBANTE_NOT_FOUND")
        if comp.bloqueado or comp.cae:
            raise conflict("El comprobante ya tiene CAE", "COMPROBANTE_LOCKED")

        secuencial = self._repo.count_comprobantes_fiscales_pv(data.punto_venta) + 1
        afip_result = self._afip.emitir(
            AfipEmissionRequest(
                tipo_comprobante=data.tipo_comprobante,
                letra=data.letra,
                punto_venta=data.punto_venta,
                numero_fiscal=secuencial,
                total=comp.total,
                cliente_id=comp.cliente_id,
                cae_manual=None if data.usar_cae_simulado else data.cae,
                cae_vencimiento_manual=data.cae_vencimiento,
            )
        )

        now = datetime.now(UTC)
        comp.tipo_comprobante = data.tipo_comprobante
        comp.letra = data.letra
        comp.punto_venta = data.punto_venta
        comp.numero_fiscal = afip_result.numero_fiscal
        comp.cae = afip_result.cae
        comp.cae_vencimiento = afip_result.cae_vencimiento
        comp.estado_fiscal = EstadoFiscal.EMITIDO.value
        comp.bloqueado = True
        comp.fecha_emision_fiscal = now

        if not comp.cta_cte_impactada and comp.saldo_pendiente > 0:
            comp.cta_cte_impactada = True

        self._repo.add_audit(
            user_id=user.uid,
            action="comprobante.emitido",
            entity_type="comprobante",
            entity_id=str(comp.id),
            payload={
                "cae": afip_result.cae,
                "modo": afip_result.modo,
                "numero_fiscal": afip_result.numero_fiscal,
            },
        )
        self._db.commit()
        self._db.refresh(comp)
        return ComprobanteReadSchema.model_validate(comp)

    def crear_nota_credito(
        self,
        comprobante_origen_id: uuid.UUID,
        data: NotaCreditoSchema,
        user: CurrentUser,
    ) -> ComprobanteReadSchema:
        origen = self._repo.get_comprobante(comprobante_origen_id)
        if origen is None or not origen.cae:
            raise bad_request("Solo comprobantes emitidos pueden recibir NC", "ORIGEN_INVALID")
        if origen.estado_fiscal == EstadoFiscal.ANULADO.value:
            raise conflict("El comprobante origen ya esta anulado", "ORIGEN_ANULADO")

        items_dict = list(origen.items)
        nc = self._repo.create_comprobante(
            numero_interno=self._repo.next_numero_interno(),
            cliente_id=origen.cliente_id,
            items=items_dict,
            total=origen.total,
            pedido_id=origen.pedido_id,
            pedido_numero=origen.pedido_numero,
            observaciones=data.motivo,
        )
        nc.es_nota_credito = True
        nc.comprobante_origen_id = origen.id
        nc.saldo_pendiente = Decimal("0")

        secuencial = self._repo.count_comprobantes_fiscales_pv(origen.punto_venta) + 1
        afip_result = self._afip.emitir(
            AfipEmissionRequest(
                tipo_comprobante="NC",
                letra=origen.letra,
                punto_venta=origen.punto_venta,
                numero_fiscal=secuencial,
                total=origen.total,
                cliente_id=origen.cliente_id,
                cae_manual=None,
            )
        )

        now = datetime.now(UTC)
        nc.tipo_comprobante = "NC"
        nc.letra = origen.letra
        nc.punto_venta = origen.punto_venta
        nc.numero_fiscal = afip_result.numero_fiscal
        nc.cae = afip_result.cae
        nc.cae_vencimiento = afip_result.cae_vencimiento
        nc.estado_fiscal = EstadoFiscal.EMITIDO.value
        nc.bloqueado = True
        nc.fecha_emision_fiscal = now

        origen.estado_fiscal = EstadoFiscal.ANULADO.value
        origen.saldo_pendiente = Decimal("0")
        if origen.cta_cte_impactada:
            origen.cta_cte_impactada = False

        self._repo.add_audit(
            user_id=user.uid,
            action="comprobante.nota_credito",
            entity_type="comprobante",
            entity_id=str(nc.id),
            payload={"origen_id": str(origen.id), "motivo": data.motivo},
            motivo=data.motivo,
        )
        self._db.commit()
        self._db.refresh(nc)
        return ComprobanteReadSchema.model_validate(nc)

    def vincular_remito_comprobante(
        self,
        remito_id: uuid.UUID,
        comprobante_id: uuid.UUID,
        user: CurrentUser,
    ) -> None:
        remito = self._repo.get_remito(remito_id)
        comp = self._repo.get_comprobante(comprobante_id)
        if remito is None or comp is None:
            raise not_found("Remito o comprobante no encontrado", "VINCULO_NOT_FOUND")
        if remito.estado != EstadoRemito.EMITIDO.value:
            raise bad_request("Solo remitos emitidos pueden vincularse", "REMITO_INVALID")
        if remito.cliente_id != comp.cliente_id:
            raise bad_request("Cliente distinto entre remito y comprobante", "CLIENTE_MISMATCH")

        if self._repo.vinculo_activo(remito_id, comprobante_id) is None:
            self._repo.crear_vinculo(remito_id, comprobante_id)

        self._repo.add_audit(
            user_id=user.uid,
            action="remito.vinculado",
            entity_type="remito",
            entity_id=str(remito_id),
            payload={"comprobante_id": str(comprobante_id)},
        )
        self._db.commit()

    def desvincular_remito_comprobante(
        self,
        remito_id: uuid.UUID,
        comprobante_id: uuid.UUID,
        data: DesvincularSchema,
        user: CurrentUser,
    ) -> DesvincularResultSchema:
        remito = self._repo.get_remito(remito_id)
        comp = self._repo.get_comprobante(comprobante_id)
        if remito is None or comp is None:
            raise not_found("Remito o comprobante no encontrado", "VINCULO_NOT_FOUND")
        if comp.bloqueado and comp.cae:
            raise conflict(
                "No se puede desvincular comprobante con CAE. Emita NC.",
                "COMPROBANTE_LOCKED",
            )

        vinculo = self._repo.vinculo_activo(remito_id, comprobante_id)
        if vinculo is None:
            raise bad_request("No existe vinculo activo", "VINCULO_INEXISTENTE")

        vinculos_restantes = [
            v for v in self._repo.vinculos_activos_por_remito(remito_id) if v.id != vinculo.id
        ]
        puede_revertir_stock = (
            data.revertir_stock
            and len(vinculos_restantes) == 0
            and not remito.stock_revertido
            and remito.estado == EstadoRemito.EMITIDO.value
        )

        if data.revertir_stock and not puede_revertir_stock and len(vinculos_restantes) > 0:
            raise bad_request(
                "No se puede revertir stock: hay otros comprobantes vinculados",
                "STOCK_REVERT_BLOCKED",
            )

        self._repo.desactivar_vinculo(vinculo)
        stock_revertido = False
        cta_cte_revertida = False
        monto_cta_cte = Decimal("0")

        if data.revertir_cta_cte and comp.cta_cte_impactada:
            monto_cta_cte = comp.saldo_pendiente
            comp.cta_cte_impactada = False
            cta_cte_revertida = monto_cta_cte > 0

        if puede_revertir_stock:
            remito.stock_revertido = True
            remito.estado = EstadoRemito.STOCK_REVERTIDO.value
            stock_revertido = True

        self._repo.add_audit(
            user_id=user.uid,
            action="remito.desvinculado",
            entity_type="remito",
            entity_id=str(remito_id),
            payload={
                "comprobante_id": str(comprobante_id),
                "revertir_stock": stock_revertido,
                "revertir_cta_cte": cta_cte_revertida,
                "monto_cta_cte": str(monto_cta_cte),
            },
            motivo=data.motivo,
        )
        self._db.commit()

        return DesvincularResultSchema(
            comprobante_id=comprobante_id,
            remito_id=remito_id,
            stock_revertido=stock_revertido,
            cta_cte_revertida=cta_cte_revertida,
            monto_cta_cte=monto_cta_cte,
        )

    def listar_comprobantes(self) -> list[ComprobanteReadSchema]:
        return [ComprobanteReadSchema.model_validate(c) for c in self._repo.list_comprobantes()]

    def registrar_remito_emitido(
        self,
        *,
        numero: str,
        pedido_id: str,
        pedido_numero: str,
        cliente_id: str,
        items: list[dict[str, object]],
        total: Decimal,
        user: CurrentUser,
        observaciones: str | None = None,
    ) -> Remito:
        remito = Remito(
            numero=numero,
            pedido_id=pedido_id,
            pedido_numero=pedido_numero,
            cliente_id=cliente_id,
            items=items,
            total=total,
            observaciones=observaciones,
            estado=EstadoRemito.EMITIDO.value,
        )
        self._db.add(remito)
        self._db.flush()
        self._repo.add_audit(
            user_id=user.uid,
            action="remito.emitido",
            entity_type="remito",
            entity_id=str(remito.id),
            payload={"numero": numero, "pedido_id": pedido_id},
        )
        self._db.commit()
        self._db.refresh(remito)
        return remito
