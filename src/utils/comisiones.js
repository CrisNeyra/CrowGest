export const COMISION_MODOS = [
  { value: 'facturado', label: 'Por ventas facturadas' },
  { value: 'cobrado', label: 'Por cobranzas' },
  { value: 'acreditado', label: 'Por valores acreditados' },
  { value: 'sin_acreditar', label: 'Por valores sin acreditar' },
  { value: 'producto', label: 'Por vendedor/producto' },
];

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function inDateRange(fecha, desde, hasta) {
  if (!fecha) return false;
  const d = new Date(fecha);
  if (desde && d < new Date(`${desde}T00:00:00`)) return false;
  if (hasta && d > new Date(`${hasta}T23:59:59`)) return false;
  return true;
}

export function getFacturasComisionables(facturas, desde, hasta) {
  return facturas
    .filter((f) => !f.esNotaCredito)
    .filter((f) => f.estado !== 'anulada' && f.estadoFiscal !== 'anulado')
    .filter((f) => f.vendedorId)
    .filter((f) => inDateRange(f.fechaEmisionFiscal || f.fecha, desde, hasta));
}

function pagoEstaAcreditado(pago, movimientosTesoreria = []) {
  return movimientosTesoreria.some((mov) => mov.pagoId === pago.id && mov.conciliado && !mov.anulado);
}

function getPagosClienteComisionables({ pagos, facturas, movimientosTesoreria = [], desde, hasta, modo }) {
  return pagos
    .filter((pago) => pago.estado !== 'anulado' && pago.tipo === 'cliente' && pago.facturaId)
    .filter((pago) => inDateRange(pago.fecha, desde, hasta))
    .map((pago) => {
      const factura = facturas.find((f) => f.id === pago.facturaId);
      return { pago, factura, acreditado: pagoEstaAcreditado(pago, movimientosTesoreria) };
    })
    .filter(({ factura }) => factura?.vendedorId && !factura.esNotaCredito && factura.estadoFiscal !== 'anulado')
    .filter(({ acreditado }) => {
      if (modo === 'acreditado') return acreditado;
      if (modo === 'sin_acreditar') return !acreditado;
      return true;
    });
}

export function calcularComisionesPorVendedor({
  vendedores,
  facturas,
  pagos,
  movimientosTesoreria = [],
  desde,
  hasta,
  modo,
}) {
  const vendedoresById = Object.fromEntries(vendedores.map((v) => [v.id, v]));
  const grouped = {};

  const ensure = (vendedorId, vendedorNombreFallback) => {
    const vendedor = vendedoresById[vendedorId];
    const nombre = vendedor?.nombre || vendedorNombreFallback || 'Vendedor eliminado';
    if (!grouped[vendedorId]) {
      grouped[vendedorId] = {
        vendedorId,
        vendedor: nombre,
        comisionPorcentaje: vendedor?.comisionPorcentaje || 0,
        baseFacturada: 0,
        baseCobrada: 0,
        baseAcreditada: 0,
        baseSinAcreditar: 0,
        baseProductos: 0,
        operaciones: 0,
        comisionFacturada: 0,
        comisionCobrada: 0,
      };
    }
    return grouped[vendedorId];
  };

  const facturasComisionables = getFacturasComisionables(facturas, desde, hasta);

  facturasComisionables.forEach((factura) => {
    const row = ensure(factura.vendedorId, factura.vendedorNombre);
    row.baseFacturada += factura.total || 0;
    if (modo === 'producto') {
      const totalProductos = factura.items?.reduce(
        (acc, item) => acc + (item.subtotal || (item.precioUnitario || item.precio || 0) * (item.cantidad || 0)),
        0
      ) || 0;
      row.baseProductos += totalProductos;
      row.operaciones += factura.items?.length || 0;
    } else {
      row.operaciones += 1;
    }
  });

  getPagosClienteComisionables({ pagos, facturas, movimientosTesoreria, desde, hasta, modo })
    .forEach(({ pago, factura, acreditado }) => {
      const row = ensure(factura.vendedorId, factura.vendedorNombre);
      row.baseCobrada += pago.monto || 0;
      if (acreditado) row.baseAcreditada += pago.monto || 0;
      else row.baseSinAcreditar += pago.monto || 0;
    });

  return Object.values(grouped)
    .map((row) => {
      const porcentaje = row.comisionPorcentaje / 100;
      return {
        ...row,
        baseCalculo:
          modo === 'cobrado'
            ? row.baseCobrada
            : modo === 'acreditado'
              ? row.baseAcreditada
              : modo === 'sin_acreditar'
                ? row.baseSinAcreditar
                : modo === 'producto'
                  ? row.baseProductos
                  : row.baseFacturada,
        comisionFacturada: row.baseFacturada * porcentaje,
        comisionCobrada: row.baseCobrada * porcentaje,
        comision:
          (modo === 'cobrado'
            ? row.baseCobrada
            : modo === 'acreditado'
              ? row.baseAcreditada
              : modo === 'sin_acreditar'
                ? row.baseSinAcreditar
                : modo === 'producto'
                  ? row.baseProductos
                  : row.baseFacturada) * porcentaje,
      };
    })
    .sort((a, b) => b.comision - a.comision);
}

export function getDetalleComisiones({ vendedorId, facturas, pagos, movimientosTesoreria = [], desde, hasta, modo }) {
  if (['cobrado', 'acreditado', 'sin_acreditar'].includes(modo)) {
    return getPagosClienteComisionables({ pagos, facturas, movimientosTesoreria, desde, hasta, modo })
      .filter(({ factura }) => factura?.vendedorId === vendedorId)
      .map(({ pago, factura, acreditado }) => ({
        id: pago.id,
        fecha: pago.fecha,
        comprobante: factura.numero,
        tipo: acreditado ? 'Cobranza acreditada' : 'Cobranza sin acreditar',
        base: pago.monto || 0,
        porcentaje: factura.comisionPorcentaje || null,
        vendedorNombre: factura.vendedorNombre,
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  if (modo === 'producto') {
    return getFacturasComisionables(facturas, desde, hasta)
      .filter((factura) => factura.vendedorId === vendedorId)
      .flatMap((factura) =>
        (factura.items || []).map((item, index) => ({
          id: `${factura.id}-${item.productoId || index}`,
          fecha: factura.fechaEmisionFiscal || factura.fecha,
          comprobante: item.nombre || item.productoNombre || factura.numero,
          tipo: `Producto · ${factura.numero}`,
          base: item.subtotal || (item.precioUnitario || item.precio || 0) * (item.cantidad || 0),
          porcentaje: factura.comisionPorcentaje || null,
          vendedorNombre: factura.vendedorNombre,
        }))
      )
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  return getFacturasComisionables(facturas, desde, hasta)
    .filter((factura) => factura.vendedorId === vendedorId)
    .map((factura) => ({
      id: factura.id,
      fecha: factura.fechaEmisionFiscal || factura.fecha,
      comprobante: factura.numeroFiscal
        ? `${factura.letra || ''} ${String(factura.puntoVenta || 1).padStart(4, '0')}-${factura.numeroFiscal}`
        : factura.numero,
      tipo: 'Facturación',
      base: factura.total || 0,
      porcentaje: factura.comisionPorcentaje || null,
      vendedorNombre: factura.vendedorNombre,
    }))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
