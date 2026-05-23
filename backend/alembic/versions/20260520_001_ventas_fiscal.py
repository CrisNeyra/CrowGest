"""ventas fiscal: comprobantes, remitos, vinculos, audit_log

Revision ID: 20260520_001
Revises:
Create Date: 2026-05-20

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260520_001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("motivo", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])

    op.create_table(
        "comprobantes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("numero_interno", sa.String(length=32), nullable=False),
        sa.Column("cliente_id", sa.String(length=128), nullable=False),
        sa.Column("pedido_id", sa.String(length=128), nullable=True),
        sa.Column("pedido_numero", sa.String(length=32), nullable=True),
        sa.Column("tipo_comprobante", sa.String(length=8), nullable=False),
        sa.Column("letra", sa.String(length=1), nullable=False),
        sa.Column("punto_venta", sa.Integer(), nullable=False),
        sa.Column("numero_fiscal", sa.String(length=16), nullable=True),
        sa.Column("cae", sa.String(length=14), nullable=True),
        sa.Column("cae_vencimiento", sa.DateTime(timezone=True), nullable=True),
        sa.Column("estado_fiscal", sa.String(length=16), nullable=False),
        sa.Column("bloqueado", sa.Boolean(), nullable=False),
        sa.Column("es_nota_credito", sa.Boolean(), nullable=False),
        sa.Column("comprobante_origen_id", sa.Uuid(), nullable=True),
        sa.Column("total", sa.Numeric(18, 4), nullable=False),
        sa.Column("saldo_pendiente", sa.Numeric(18, 4), nullable=False),
        sa.Column("cta_cte_impactada", sa.Boolean(), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("fecha_emision_fiscal", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["comprobante_origen_id"], ["comprobantes.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("numero_interno"),
    )
    op.create_index("ix_comprobantes_cliente_id", "comprobantes", ["cliente_id"])
    op.create_index("ix_comprobantes_cae", "comprobantes", ["cae"])

    op.create_table(
        "remitos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("numero", sa.String(length=32), nullable=False),
        sa.Column("pedido_id", sa.String(length=128), nullable=False),
        sa.Column("pedido_numero", sa.String(length=32), nullable=False),
        sa.Column("cliente_id", sa.String(length=128), nullable=False),
        sa.Column("total", sa.Numeric(18, 4), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("estado", sa.String(length=24), nullable=False),
        sa.Column("stock_revertido", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("numero"),
    )

    op.create_table(
        "remito_comprobante_vinculos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("remito_id", sa.Uuid(), nullable=False),
        sa.Column("comprobante_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["comprobante_id"], ["comprobantes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["remito_id"], ["remitos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("remito_comprobante_vinculos")
    op.drop_table("remitos")
    op.drop_index("ix_comprobantes_cae", table_name="comprobantes")
    op.drop_index("ix_comprobantes_cliente_id", table_name="comprobantes")
    op.drop_table("comprobantes")
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")
