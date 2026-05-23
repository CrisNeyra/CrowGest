"""Rutas REST del modulo ventas / comprobantes fiscales."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.db import get_db
from app.modules.ventas.schemas import (
    ComprobanteCreateSchema,
    ComprobanteReadSchema,
    DesvincularResultSchema,
    DesvincularSchema,
    EmitirComprobanteSchema,
    NotaCreditoSchema,
)
from app.modules.ventas.service import VentasService

router = APIRouter(prefix="/ventas", tags=["ventas"])


def _service(db: Session = Depends(get_db)) -> VentasService:
    return VentasService(db)


@router.get("/comprobantes", response_model=list[ComprobanteReadSchema])
def listar_comprobantes(
    service: VentasService = Depends(_service),
    _user: CurrentUser = Depends(get_current_user),
) -> list[ComprobanteReadSchema]:
    return service.listar_comprobantes()


@router.post(
    "/comprobantes",
    response_model=ComprobanteReadSchema,
    status_code=status.HTTP_201_CREATED,
)
def crear_comprobante(
    data: ComprobanteCreateSchema,
    service: VentasService = Depends(_service),
    user: CurrentUser = Depends(get_current_user),
) -> ComprobanteReadSchema:
    return service.crear_comprobante_borrador(data, user)


@router.post("/comprobantes/{comprobante_id}/emitir", response_model=ComprobanteReadSchema)
def emitir_comprobante(
    comprobante_id: uuid.UUID,
    data: EmitirComprobanteSchema,
    service: VentasService = Depends(_service),
    user: CurrentUser = Depends(get_current_user),
) -> ComprobanteReadSchema:
    return service.emitir_comprobante_fiscal(comprobante_id, data, user)


@router.post(
    "/comprobantes/{comprobante_id}/nota-credito",
    response_model=ComprobanteReadSchema,
    status_code=status.HTTP_201_CREATED,
)
def nota_credito(
    comprobante_id: uuid.UUID,
    data: NotaCreditoSchema,
    service: VentasService = Depends(_service),
    user: CurrentUser = Depends(get_current_user),
) -> ComprobanteReadSchema:
    return service.crear_nota_credito(comprobante_id, data, user)


@router.post(
    "/remitos/{remito_id}/vincular/{comprobante_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def vincular_remito(
    remito_id: uuid.UUID,
    comprobante_id: uuid.UUID,
    service: VentasService = Depends(_service),
    user: CurrentUser = Depends(get_current_user),
) -> None:
    service.vincular_remito_comprobante(remito_id, comprobante_id, user)


@router.post(
    "/remitos/{remito_id}/desvincular/{comprobante_id}",
    response_model=DesvincularResultSchema,
)
def desvincular_remito(
    remito_id: uuid.UUID,
    comprobante_id: uuid.UUID,
    data: DesvincularSchema,
    service: VentasService = Depends(_service),
    user: CurrentUser = Depends(get_current_user),
) -> DesvincularResultSchema:
    return service.desvincular_remito_comprobante(remito_id, comprobante_id, data, user)
