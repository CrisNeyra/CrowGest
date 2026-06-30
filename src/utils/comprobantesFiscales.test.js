import { describe, it, expect } from 'vitest';
import {
  calcularIva21,
  calcularIva105,
  calcularLineaFactura,
  calcularTotalesFactura,
} from './comprobantesFiscales';

describe('IVA desde total', () => {
  it('calcularIva21 descompone neto + iva', () => {
    const { neto, iva, alicuota } = calcularIva21(1210);
    expect(neto).toBe(1000);
    expect(iva).toBe(210);
    expect(alicuota).toBe(21);
  });

  it('calcularIva105 descompone neto + iva', () => {
    const { neto, iva, alicuota } = calcularIva105(1105);
    expect(neto).toBe(1000);
    expect(iva).toBe(105);
    expect(alicuota).toBe(10.5);
  });
});

describe('calcularLineaFactura', () => {
  it('calcula neto, iva 21 y total de una línea simple', () => {
    const linea = calcularLineaFactura({
      cantidad: 2,
      netoUnitario: 100,
      alicuotaIva: 21,
      descuentoPct: 0,
    });
    expect(linea.neto).toBe(200);
    expect(linea.iva21).toBe(42);
    expect(linea.iva105).toBe(0);
    expect(linea.totalLinea).toBe(242);
  });

  it('aplica descuento de línea antes del IVA', () => {
    const linea = calcularLineaFactura({
      cantidad: 1,
      netoUnitario: 1000,
      alicuotaIva: 21,
      descuentoPct: 10,
    });
    expect(linea.descuento).toBe(100);
    expect(linea.neto).toBe(900);
    expect(linea.iva21).toBe(189);
    expect(linea.totalLinea).toBe(1089);
  });

  it('separa IVA 10.5 en su columna', () => {
    const linea = calcularLineaFactura({
      cantidad: 1,
      netoUnitario: 1000,
      alicuotaIva: 10.5,
    });
    expect(linea.iva105).toBe(105);
    expect(linea.iva21).toBe(0);
  });
});

describe('calcularTotalesFactura', () => {
  it('agrega netos, ambos IVAs e IIBB', () => {
    const totales = calcularTotalesFactura(
      [
        { cantidad: 1, netoUnitario: 1000, alicuotaIva: 21 },
        { cantidad: 1, netoUnitario: 1000, alicuotaIva: 10.5 },
      ],
      { iibbPct: 3 }
    );
    expect(totales.netoGravado).toBe(2000);
    expect(totales.iva21).toBe(210);
    expect(totales.iva105).toBe(105);
    // subtotal con IVA = 2315; IIBB 3% = 69.45; total = 2384.45
    expect(totales.iibb).toBe(69.45);
    expect(totales.total).toBe(2384.45);
  });

  it('aplica descuento global sobre subtotal con IVA', () => {
    const totales = calcularTotalesFactura(
      [{ cantidad: 1, netoUnitario: 1000, alicuotaIva: 21 }],
      { iibbPct: 0, descuentoGlobalPct: 10 }
    );
    // subtotal con IVA = 1210; descuento 10% = 121; total = 1089
    expect(totales.descuentoGlobal).toBe(121);
    expect(totales.total).toBe(1089);
  });

  it('lista vacía da total 0', () => {
    const totales = calcularTotalesFactura([], { iibbPct: 3 });
    expect(totales.total).toBe(0);
    expect(totales.netoGravado).toBe(0);
  });
});
