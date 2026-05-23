const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (date) => {
  const d = new Date(date);
  return MONTH_LABELS[d.getMonth()];
};

/** Genera los últimos N meses (incluyendo el actual) como buckets vacíos */
export function buildMonthBuckets(monthCount) {
  const buckets = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      month: monthLabel(d),
      monthIndex: d.getMonth() + 1,
      sales: 0,
      expenses: 0,
      newClients: 0,
    });
  }
  return buckets;
}

export function aggregateSalesVsExpenses(ventas, movimientos, monthCount) {
  const buckets = buildMonthBuckets(monthCount);
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, { ...b }]));

  ventas.forEach((venta) => {
    const key = monthKey(venta.fecha);
    if (byKey[key]) byKey[key].sales += venta.total || 0;
  });

  movimientos
    .filter((m) => m.tipo === 'pago_proveedor')
    .forEach((mov) => {
      const key = monthKey(mov.fecha);
      if (byKey[key]) byKey[key].expenses += mov.monto || 0;
    });

  return buckets.map((b) => byKey[b.key] ?? b);
}

export function countNewClientsInPeriod(clientes, monthCount) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthCount);
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);

  return clientes.filter((c) => {
    if (!c.createdAt) return false;
    return new Date(c.createdAt) >= cutoff;
  }).length;
}

export function aggregateTopProducts(ventas, productos, monthCount) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthCount);

  const unitsByProduct = {};

  ventas
    .filter((v) => new Date(v.fecha) >= cutoff)
    .forEach((venta) => {
      venta.items?.forEach((item) => {
        const prod = productos.find((p) => p.id === item.productoId);
        const name = prod?.nombre || 'Producto eliminado';
        if (!unitsByProduct[name]) unitsByProduct[name] = 0;
        unitsByProduct[name] += item.cantidad || 0;
      });
    });

  return Object.entries(unitsByProduct)
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);
}

export function aggregateCategorySales(ventas, productos) {
  const categoriesMap = {};

  ventas.forEach((venta) => {
    venta.items?.forEach((item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      const catName = producto?.categoria || 'Sin Categoría';
      categoriesMap[catName] = (categoriesMap[catName] || 0) + (item.subtotal || 0);
    });
  });

  return Object.entries(categoriesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function mapRecentSales(ventas, clientes, limit = 5) {
  return [...ventas]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, limit)
    .map((venta) => {
      const cliente = clientes.find((c) => c.id === venta.clienteId);
      return {
        id: venta.id,
        number: venta.numero,
        customer: cliente?.nombre || 'Cliente eliminado',
        date: new Date(venta.fecha).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        amount: venta.total,
      };
    });
}

export function mapPendingInvoices(facturas, clientes, limit = 5) {
  return facturas
    .filter((f) => f.estado !== 'pagada' && (f.saldoPendiente || 0) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(0, limit)
    .map((factura) => {
      const cliente = clientes.find((c) => c.id === factura.clienteId);
      const statusLabel =
        factura.estado === 'parcial' ? 'Parcial' :
        factura.estado === 'pendiente' ? 'Pendiente' : factura.estado;
      return {
        id: factura.id,
        number: factura.numero,
        customer: cliente?.nombre || 'Cliente eliminado',
        dueDate: new Date(factura.fecha).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        amount: factura.saldoPendiente,
        status: statusLabel,
        isPending: factura.estado === 'pendiente',
      };
    });
}
