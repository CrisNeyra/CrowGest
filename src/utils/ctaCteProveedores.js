import { differenceInCalendarDays, parseISO } from 'date-fns';
import { DIAS_PLAZO_DEFAULT } from './ctaCte';
import { sumMoney, subMoney, addMoney } from './money';

function parseFecha(iso) {
  if (!iso) return null;
  try {
    return parseISO(iso);
  } catch {
    return new Date(iso);
  }
}

export function getComprobantesProveedorPendientes(comprobantes, proveedorId = null) {
  return comprobantes
    .filter((c) => {
      if (c.estado === 'anulado') return false;
      if ((c.saldoPendiente || 0) <= 0) return false;
      if (proveedorId && c.proveedorId !== proveedorId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function diasDesdeComprobanteProveedor(comprobante) {
  const fecha = parseFecha(comprobante.fecha);
  if (!fecha) return 0;
  return differenceInCalendarDays(new Date(), fecha);
}

export function esComprobanteProveedorMoroso(
  comprobante,
  diasPlazo = DIAS_PLAZO_DEFAULT
) {
  if ((comprobante.saldoPendiente || 0) <= 0) return false;
  return diasDesdeComprobanteProveedor(comprobante) > diasPlazo;
}

export function getComprobantesProveedorMorosos(
  comprobantes,
  diasPlazo = DIAS_PLAZO_DEFAULT
) {
  return getComprobantesProveedorPendientes(comprobantes)
    .filter((c) => esComprobanteProveedorMoroso(c, diasPlazo))
    .sort((a, b) => diasDesdeComprobanteProveedor(b) - diasDesdeComprobanteProveedor(a));
}

export function getTotalesCtaCteProveedores(
  proveedores,
  comprobantes,
  diasPlazo = DIAS_PLAZO_DEFAULT
) {
  const deudaTotal = sumMoney(
    proveedores.map((p) => Math.max(0, p.saldoPendiente || 0))
  );
  const proveedoresConDeuda = proveedores.filter((p) => (p.saldoPendiente || 0) > 0).length;
  const pendientes = getComprobantesProveedorPendientes(comprobantes);
  const totalPendiente = sumMoney(pendientes.map((c) => c.saldoPendiente || 0));
  const morosos = getComprobantesProveedorMorosos(comprobantes, diasPlazo);

  return {
    deudaTotal,
    proveedoresConDeuda,
    totalPendiente,
    cantPendientes: pendientes.length,
    cantMorosos: morosos.length,
    totalMoroso: sumMoney(morosos.map((c) => c.saldoPendiente || 0)),
  };
}

export function buildResumenProveedores(proveedores, comprobantes) {
  return proveedores
    .map((proveedor) => {
      const pendientes = getComprobantesProveedorPendientes(comprobantes, proveedor.id);
      const morosos = pendientes.filter((c) => esComprobanteProveedorMoroso(c));

      return {
        proveedorId: proveedor.id,
        nombre: proveedor.nombre,
        contacto: proveedor.contacto,
        email: proveedor.email,
        saldo: proveedor.saldoPendiente || 0,
        saldoComprobantes: sumMoney(pendientes.map((c) => c.saldoPendiente || 0)),
        cantPendientes: pendientes.length,
        cantMorosos: morosos.length,
        montoMoroso: sumMoney(morosos.map((c) => c.saldoPendiente || 0)),
      };
    })
    .sort((a, b) => b.saldo - a.saldo);
}

export function buildMovimientosProveedor(proveedorId, comprobantes, pagos) {
  const lineas = [];

  comprobantes
    .filter((c) => c.proveedorId === proveedorId && c.estado !== 'anulado')
    .forEach((comprobante) => {
      const esCredito = comprobante.tipo === 'nota_credito' || comprobante.esNotaCredito;
      lineas.push({
        id: `comp-prov-${comprobante.id}`,
        fecha: comprobante.fecha,
        tipo: 'comprobante_proveedor',
        concepto: `Comprobante proveedor ${comprobante.numero}`,
        referencia: comprobante.ordenCompraNumero || comprobante.recepcionNumero || '-',
        debe: esCredito ? 0 : comprobante.total || 0,
        haber: esCredito ? comprobante.total || 0 : 0,
        comprobanteProveedorId: comprobante.id,
      });
    });

  pagos
    .filter((p) => p.estado !== 'anulado' && p.tipo === 'proveedor' && p.proveedorId === proveedorId)
    .forEach((pago) => {
      const comprobante = pago.comprobanteProveedorId
        ? comprobantes.find((c) => c.id === pago.comprobanteProveedorId)
        : null;
      lineas.push({
        id: `pago-prov-${pago.id}`,
        fecha: pago.fecha,
        tipo: 'pago_proveedor',
        concepto: `Pago ${pago.numero}`,
        referencia: comprobante?.numero || 'Saldo general',
        debe: 0,
        haber: pago.monto || 0,
        pagoId: pago.id,
        comprobanteProveedorId: pago.comprobanteProveedorId || null,
      });
    });

  lineas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let saldoAcum = 0;
  return lineas.map((linea) => {
    saldoAcum = subMoney(addMoney(saldoAcum, linea.debe), linea.haber);
    return { ...linea, saldo: saldoAcum };
  });
}
