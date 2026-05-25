export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function pushItemMovements({ movimientos, documento, tipo, signo, concepto, referencia }) {
  documento.items?.forEach((item) => {
    movimientos.push({
      id: `${tipo}-${documento.id}-${item.productoId}-${documento.fecha}`,
      productoId: item.productoId,
      fecha: documento.fecha,
      tipo,
      concepto,
      referencia,
      entrada: signo > 0 ? item.cantidad || 0 : 0,
      salida: signo < 0 ? item.cantidad || 0 : 0,
      cantidad: (item.cantidad || 0) * signo,
      costoUnitario: item.precioUnitario || item.costo || 0,
    });
  });
}

export function buildKardexMovimientos({
  productos,
  ventas,
  remitos,
  ordenesCompra,
  movimientos,
}) {
  const result = [];

  ventas
    .filter((venta) => venta.estado === 'completada')
    .forEach((venta) => {
      pushItemMovements({
        movimientos: result,
        documento: venta,
        tipo: 'venta',
        signo: -1,
        concepto: `Venta ${venta.numero}`,
        referencia: venta.numero,
      });
    });

  remitos
    .filter((remito) => remito.estado === 'emitido')
    .forEach((remito) => {
      pushItemMovements({
        movimientos: result,
        documento: remito,
        tipo: 'remito',
        signo: -1,
        concepto: `Remito ${remito.numero}`,
        referencia: remito.numero,
      });
    });

  ordenesCompra.forEach((orden) => {
    orden.recepciones?.filter((recepcion) => recepcion.estado !== 'anulado').forEach((recepcion) => {
      recepcion.lineas?.forEach((linea) => {
        const item = orden.items?.find((i) => i.productoId === linea.productoId);
        result.push({
          id: `recepcion-${orden.id}-${recepcion.numero}-${linea.productoId}`,
          productoId: linea.productoId,
          fecha: recepcion.fecha,
          tipo: 'recepcion_compra',
          concepto: `Recepción ${recepcion.numero} - ${orden.numero}`,
          referencia: `${orden.numero}/${recepcion.numero}`,
          entrada: linea.cantidad || 0,
          salida: 0,
          cantidad: linea.cantidad || 0,
          costoUnitario: item?.precioUnitario || 0,
        });
      });
    });
  });

  movimientos
    .filter((mov) => mov.tipo === 'ajuste_stock' && mov.productoId)
    .forEach((mov) => {
      const cantidad = mov.cantidad || 0;
      result.push({
        id: `ajuste-${mov.id}`,
        productoId: mov.productoId,
        fecha: mov.fecha,
        tipo: 'ajuste_stock',
        concepto: mov.descripcion || 'Ajuste manual',
        referencia: mov.referencia || mov.id,
        entrada: cantidad > 0 ? cantidad : 0,
        salida: cantidad < 0 ? Math.abs(cantidad) : 0,
        cantidad,
        costoUnitario: productos.find((p) => p.id === mov.productoId)?.costo || 0,
      });
    });

  return result.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

export function getKardexProducto(movimientos, productoId) {
  let saldo = 0;
  return movimientos
    .filter((mov) => !productoId || mov.productoId === productoId)
    .map((mov) => {
      saldo += mov.cantidad;
      return { ...mov, saldo };
    });
}

export function getStockStats(productos) {
  const valorizadoCosto = productos.reduce(
    (acc, p) => acc + (p.stock || 0) * (p.costo || 0),
    0
  );
  const valorizadoVenta = productos.reduce(
    (acc, p) => acc + (p.stock || 0) * (p.precio || 0),
    0
  );
  const stockBajo = productos.filter((p) => (p.stock || 0) <= (p.stockMinimo || 0));
  const sinStock = productos.filter((p) => (p.stock || 0) <= 0);

  return {
    valorizadoCosto,
    valorizadoVenta,
    stockBajo: stockBajo.length,
    sinStock: sinStock.length,
    productos: productos.length,
  };
}

export function getReposicionSugerida(productos) {
  return productos
    .filter((p) => (p.stock || 0) <= (p.stockMinimo || 0))
    .map((p) => ({
      ...p,
      sugerido: Math.max(0, (p.stockMinimo || 0) - (p.stock || 0)),
      valorReposicion: Math.max(0, (p.stockMinimo || 0) - (p.stock || 0)) * (p.costo || 0),
    }))
    .sort((a, b) => b.sugerido - a.sugerido);
}
