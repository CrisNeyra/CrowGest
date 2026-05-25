export const TIPOS_CUENTA_TESORERIA = [
  { value: 'caja', label: 'Caja' },
  { value: 'banco', label: 'Banco' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'otro', label: 'Otro' },
];

export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function getTipoCuentaLabel(tipo) {
  return TIPOS_CUENTA_TESORERIA.find((t) => t.value === tipo)?.label || tipo;
}

export function getMetodoPagoLabel(metodo) {
  return METODOS_PAGO.find((m) => m.value === metodo)?.label || metodo || '-';
}

export function getTesoreriaStats(cuentas, movimientos) {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

  const movimientosMes = movimientos.filter((m) => !m.anulado && new Date(m.fecha) >= inicioMes);
  const ingresosMes = movimientosMes
    .filter((m) => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + (m.monto || 0), 0);
  const egresosMes = movimientosMes
    .filter((m) => m.tipo === 'egreso')
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  return {
    saldoTotal: cuentas.reduce((acc, c) => acc + (c.saldoActual ?? c.saldoInicial ?? 0), 0),
    ingresosMes,
    egresosMes,
    balanceMes: ingresosMes - egresosMes,
    cuentasActivas: cuentas.filter((c) => c.activa !== false).length,
  };
}

export function filterMovimientosTesoreria(movimientos, { searchTerm, cuentaId, tipo, conciliacion }) {
  const term = searchTerm.toLowerCase();
  return movimientos
    .filter((m) => !cuentaId || m.cuentaId === cuentaId)
    .filter((m) => !tipo || m.tipo === tipo)
    .filter((m) => {
      if (!conciliacion) return true;
      if (conciliacion === 'conciliados') return m.conciliado && !m.anulado;
      if (conciliacion === 'pendientes') return !m.conciliado && !m.anulado;
      if (conciliacion === 'anulados') return Boolean(m.anulado);
      return true;
    })
    .filter((m) => (m.concepto || '').toLowerCase().includes(term))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function getFacturasPendientesTesoreria(facturas, clientes) {
  return facturas
    .filter((f) => !f.esNotaCredito && (f.saldoPendiente || 0) > 0)
    .map((factura) => ({
      ...factura,
      entidadNombre: clientes.find((c) => c.id === factura.clienteId)?.nombre || 'Cliente eliminado',
    }))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

export function getComprobantesProveedorPendientesTesoreria(comprobantes, proveedores) {
  return comprobantes
    .filter((c) => c.estado !== 'anulado' && (c.saldoPendiente || 0) > 0)
    .map((comprobante) => ({
      ...comprobante,
      entidadNombre:
        proveedores.find((p) => p.id === comprobante.proveedorId)?.nombre || 'Proveedor eliminado',
    }))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}
