export const TIPOS_COMPROBANTE = [
  { value: 'FA', label: 'Factura A', letra: 'A' },
  { value: 'FB', label: 'Factura B', letra: 'B' },
  { value: 'FC', label: 'Factura C', letra: 'C' },
  { value: 'FM', label: 'Factura M', letra: 'M' },
  { value: 'NC', label: 'Nota de Crédito', letra: 'A' },
  { value: 'ND', label: 'Nota de Débito', letra: 'A' },
];

export const PUNTOS_VENTA_DEFAULT = 1;

export function formatNumeroFiscal(puntoVenta, numeroSecuencial) {
  const pv = String(puntoVenta).padStart(4, '0');
  const num = String(numeroSecuencial).padStart(8, '0');
  return `${pv}-${num}`;
}

export function calcularIva21(total) {
  const neto = total / 1.21;
  const iva = total - neto;
  return { neto, iva, alicuota: 21 };
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
