import { differenceInCalendarDays, parseISO } from 'date-fns';
import { etiquetaComprobante } from './comprobantesFiscales';
import { sumMoney, subMoney, addMoney } from './money';

export const DIAS_PLAZO_DEFAULT = 30;

function parseFecha(iso) {
  if (!iso) return null;
  try {
    return parseISO(iso);
  } catch {
    return new Date(iso);
  }
}

export function etiquetaFacturaCtaCte(factura) {
  if (factura?.esNotaCredito) {
    return `NC ${etiquetaComprobante(factura)}`;
  }
  return etiquetaComprobante(factura);
}

/** Facturas con saldo a cobrar (incluye sin CAE aún). */
export function getFacturasPendientesCobro(facturas, clienteId = null) {
  return facturas
    .filter((f) => {
      if (f.esNotaCredito) return false;
      if (f.estadoFiscal === 'anulado') return false;
      if ((f.saldoPendiente || 0) <= 0) return false;
      if (clienteId && f.clienteId !== clienteId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/** Facturas que ya impactaron cuenta corriente y tienen saldo. */
export function getFacturasEnCtaCte(facturas, clienteId = null) {
  return getFacturasPendientesCobro(facturas, clienteId).filter((f) => f.ctaCteImpactada);
}

export function diasDesdeEmision(factura) {
  const ref = factura.fechaEmisionFiscal || factura.fecha;
  const fecha = parseFecha(ref);
  if (!fecha) return 0;
  return differenceInCalendarDays(new Date(), fecha);
}

export function esFacturaMorosa(factura, diasPlazo = DIAS_PLAZO_DEFAULT) {
  if (!factura.ctaCteImpactada) return false;
  if ((factura.saldoPendiente || 0) <= 0) return false;
  if (factura.estadoFiscal === 'anulado') return false;
  return diasDesdeEmision(factura) > diasPlazo;
}

export function getFacturasMorosas(facturas, diasPlazo = DIAS_PLAZO_DEFAULT) {
  return getFacturasEnCtaCte(facturas)
    .filter((f) => esFacturaMorosa(f, diasPlazo))
    .sort((a, b) => diasDesdeEmision(b) - diasDesdeEmision(a));
}

export function getTotalesCtaCte(clientes, facturas, diasPlazo = DIAS_PLAZO_DEFAULT) {
  const saldoTotalClientes = sumMoney(
    clientes.map((c) => c.saldo || 0).filter((s) => s > 0)
  );

  const clientesConDeuda = clientes.filter((c) => (c.saldo || 0) > 0).length;

  const pendientes = getFacturasPendientesCobro(facturas);
  const totalSaldoFacturas = sumMoney(pendientes.map((f) => f.saldoPendiente || 0));

  const morosas = getFacturasMorosas(facturas, diasPlazo);
  const totalMoroso = sumMoney(morosas.map((f) => f.saldoPendiente || 0));

  const sinEmitirFiscal = pendientes.filter((f) => !f.cae).length;

  return {
    saldoTotalClientes,
    clientesConDeuda,
    totalSaldoFacturas,
    cantFacturasPendientes: pendientes.length,
    cantMorosas: morosas.length,
    totalMoroso,
    sinEmitirFiscal,
  };
}

export function buildResumenClientes(clientes, facturas) {
  return clientes
    .map((cliente) => {
      const pendientes = getFacturasPendientesCobro(facturas, cliente.id);
      const enCtaCte = pendientes.filter((f) => f.ctaCteImpactada);
      const morosas = enCtaCte.filter((f) => esFacturaMorosa(f));

      return {
        clienteId: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono,
        saldo: cliente.saldo || 0,
        saldoFacturas: sumMoney(pendientes.map((f) => f.saldoPendiente || 0)),
        cantPendientes: pendientes.length,
        cantMorosas: morosas.length,
        montoMoroso: sumMoney(morosas.map((f) => f.saldoPendiente || 0)),
      };
    })
    .sort((a, b) => b.saldo - a.saldo);
}

/**
 * Libro de movimientos del cliente (debe/haber) reconstruido desde facturas y pagos.
 */
export function buildMovimientosCliente(clienteId, facturas, pagos) {
  const lineas = [];

  facturas
    .filter((f) => f.clienteId === clienteId)
    .forEach((factura) => {
      if (factura.esNotaCredito) {
        lineas.push({
          id: `nc-${factura.id}`,
          fecha: factura.fecha,
          tipo: 'nota_credito',
          concepto: `Nota de crédito ${etiquetaFacturaCtaCte(factura)}`,
          referencia: factura.facturaOrigenNumero || factura.facturaOrigenId,
          debe: 0,
          haber: factura.total || 0,
          facturaId: factura.id,
        });
        return;
      }

      if (factura.ctaCteImpactada && factura.fechaEmisionFiscal) {
        const monto = factura.total || 0;
        lineas.push({
          id: `comp-${factura.id}`,
          fecha: factura.fechaEmisionFiscal,
          tipo: 'comprobante',
          concepto: `Comprobante ${etiquetaFacturaCtaCte(factura)}`,
          referencia: factura.numero,
          debe: monto,
          haber: 0,
          facturaId: factura.id,
        });
      }
    });

  pagos
    .filter((p) => p.estado !== 'anulado' && p.tipo === 'cliente' && p.clienteId === clienteId)
    .forEach((pago) => {
      const factura = pago.facturaId ? facturas.find((f) => f.id === pago.facturaId) : null;
      lineas.push({
        id: `pago-${pago.id}`,
        fecha: pago.fecha,
        tipo: 'cobro',
        concepto: `Cobro ${pago.numero}`,
        referencia: factura ? etiquetaFacturaCtaCte(factura) : 'Sin imputar',
        debe: 0,
        haber: pago.monto || 0,
        facturaId: pago.facturaId || null,
        pagoId: pago.id,
      });
    });

  lineas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let saldoAcum = 0;
  return lineas.map((linea) => {
    saldoAcum = subMoney(addMoney(saldoAcum, linea.debe), linea.haber);
    return { ...linea, saldo: saldoAcum };
  });
}
