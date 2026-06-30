import { roundMoney } from './money';

export { roundMoney };

export const TIPOS_COMPROBANTE = [
  { value: 'FA', label: 'Factura A', letra: 'A' },
  { value: 'FB', label: 'Factura B', letra: 'B' },
  { value: 'FC', label: 'Factura C', letra: 'C' },
  { value: 'FM', label: 'Factura M', letra: 'M' },
  { value: 'NC', label: 'Nota de Crédito', letra: 'A' },
  { value: 'ND', label: 'Nota de Débito', letra: 'A' },
];

export const PUNTOS_VENTA_DEFAULT = 1;

export const FORMAS_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

export const SUCURSALES_DEFAULT = ['Central', 'Depósito Norte', 'Depósito Sur'];

export function calcularIva21(total) {
  const neto = roundMoney(total / 1.21);
  const iva = roundMoney(total - neto);
  return { neto, iva, alicuota: 21 };
}

export function calcularIva105(total) {
  const neto = roundMoney(total / 1.105);
  const iva = roundMoney(total - neto);
  return { neto, iva, alicuota: 10.5 };
}

export function calcularIvaDesdeNeto(neto, alicuota = 21) {
  const base = roundMoney(neto);
  const iva = roundMoney(base * (alicuota / 100));
  return { neto: base, iva, total: roundMoney(base + iva), alicuota };
}

export function calcularLineaFactura(linea) {
  const cantidad = Number(linea.cantidad) || 0;
  const netoUnitario = Number(linea.netoUnitario ?? linea.precioUnitario) || 0;
  const descuentoPct = Number(linea.descuentoPct) || 0;
  const alicuotaIva = Number(linea.alicuotaIva) || 21;

  const netoBruto = roundMoney(cantidad * netoUnitario);
  const descuento = roundMoney(netoBruto * (descuentoPct / 100));
  const neto = roundMoney(netoBruto - descuento);
  const { iva, total } = calcularIvaDesdeNeto(neto, alicuotaIva);

  return {
    ...linea,
    cantidad,
    netoUnitario,
    descuentoPct,
    alicuotaIva,
    neto,
    descuento,
    iva105: alicuotaIva === 10.5 ? iva : 0,
    iva21: alicuotaIva === 21 ? iva : 0,
    iva,
    subtotal: neto,
    totalLinea: total,
    precioUnitario: netoUnitario,
    subtotalLegacy: total,
  };
}

export function calcularTotalesFactura(lineas, options = {}) {
  const iibbPct = Number(options.iibbPct) || 0;
  const descuentoGlobalPct = Number(options.descuentoGlobalPct) || 0;

  const lineasCalc = (lineas || []).map(calcularLineaFactura);
  const netoGravado = roundMoney(lineasCalc.reduce((acc, l) => acc + l.neto, 0));
  const iva105 = roundMoney(lineasCalc.reduce((acc, l) => acc + l.iva105, 0));
  const iva21 = roundMoney(lineasCalc.reduce((acc, l) => acc + l.iva21, 0));
  const descuentoLineas = roundMoney(lineasCalc.reduce((acc, l) => acc + l.descuento, 0));

  const subtotalConIva = roundMoney(netoGravado + iva105 + iva21);
  const descuentoGlobal = roundMoney(subtotalConIva * (descuentoGlobalPct / 100));
  const baseIibb = roundMoney(subtotalConIva - descuentoGlobal);
  const iibb = roundMoney(baseIibb * (iibbPct / 100));
  const total = roundMoney(baseIibb + iibb);

  return {
    lineas: lineasCalc,
    netoGravado,
    iva105,
    iva21,
    descuentoLineas,
    descuentoGlobal,
    descuentoGlobalPct,
    iibb,
    iibbPct,
    total,
  };
}

export function lineaVacia() {
  return {
    productoId: '',
    codigo: '',
    descripcion: '',
    cantidad: 1,
    netoUnitario: 0,
    alicuotaIva: 21,
    descuentoPct: 0,
  };
}

export function itemsPedidoALineas(items, productos = []) {
  return (items || []).map((item) => {
    const prod = productos.find((p) => p.id === item.productoId);
    const alicuotaIva = prod?.alicuotaIva ?? 21;
    const netoUnitario = item.precioUnitario
      ? roundMoney(item.precioUnitario / (1 + alicuotaIva / 100))
      : 0;
    return {
      productoId: item.productoId || '',
      codigo: prod?.codigo || item.codigo || '',
      descripcion: item.nombre || prod?.nombre || '',
      cantidad: item.cantidad || 1,
      netoUnitario,
      alicuotaIva,
      descuentoPct: 0,
    };
  });
}

export function formatNumeroFiscal(puntoVenta, numeroSecuencial) {
  const pv = String(puntoVenta).padStart(4, '0');
  const num = String(numeroSecuencial).padStart(8, '0');
  return `${pv}-${num}`;
}

export function validarCae(cae) {
  const limpio = String(cae || '').replace(/\s/g, '');
  return /^\d{14}$/.test(limpio);
}

export function generarCaeSimulado() {
  const base = Date.now().toString().slice(-10);
  return `${base}${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
}

export function etiquetaComprobante(factura) {
  if (!factura?.cae) return factura?.numero || '-';
  const letra = factura.letra || 'B';
  const pv = factura.puntoVenta ?? PUNTOS_VENTA_DEFAULT;
  const num = factura.numeroFiscal || factura.numero;
  return `${letra} ${String(pv).padStart(4, '0')}-${num}`;
}
