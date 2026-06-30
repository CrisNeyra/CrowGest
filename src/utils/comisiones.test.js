import { describe, it, expect } from 'vitest';
import { calcularComisionesPorVendedor } from './comisiones';

const vendedores = [
  { id: 'v1', nombre: 'Ana', comisionPorcentaje: 10 },
  { id: 'v2', nombre: 'Beto', comisionPorcentaje: 5 },
];

const facturas = [
  {
    id: 'f1',
    vendedorId: 'v1',
    vendedorNombre: 'Ana',
    total: 1000,
    fecha: '2026-06-01T10:00:00.000Z',
    items: [{ productoId: 'p1', subtotal: 1000, cantidad: 1 }],
  },
  {
    id: 'f2',
    vendedorId: 'v2',
    vendedorNombre: 'Beto',
    total: 2000,
    fecha: '2026-06-02T10:00:00.000Z',
    items: [{ productoId: 'p2', subtotal: 2000, cantidad: 2 }],
  },
];

const pagos = [
  { id: 'pago1', tipo: 'cliente', facturaId: 'f1', monto: 500, fecha: '2026-06-05T10:00:00.000Z' },
];

const movimientos = [
  { pagoId: 'pago1', conciliado: true, anulado: false },
];

describe('calcularComisionesPorVendedor', () => {
  it('modo facturado aplica % sobre total facturado', () => {
    const res = calcularComisionesPorVendedor({
      vendedores,
      facturas,
      pagos: [],
      movimientosTesoreria: [],
      modo: 'facturado',
    });
    const ana = res.find((r) => r.vendedorId === 'v1');
    const beto = res.find((r) => r.vendedorId === 'v2');
    expect(ana.comision).toBe(100); // 10% de 1000
    expect(beto.comision).toBe(100); // 5% de 2000
  });

  it('modo cobrado aplica % sobre lo cobrado', () => {
    const res = calcularComisionesPorVendedor({
      vendedores,
      facturas,
      pagos,
      movimientosTesoreria: movimientos,
      modo: 'cobrado',
    });
    const ana = res.find((r) => r.vendedorId === 'v1');
    expect(ana.baseCobrada).toBe(500);
    expect(ana.comision).toBe(50); // 10% de 500
  });

  it('modo acreditado solo cuenta pagos conciliados', () => {
    const res = calcularComisionesPorVendedor({
      vendedores,
      facturas,
      pagos,
      movimientosTesoreria: movimientos,
      modo: 'acreditado',
    });
    const ana = res.find((r) => r.vendedorId === 'v1');
    expect(ana.baseAcreditada).toBe(500);
    expect(ana.comision).toBe(50);
  });

  it('modo sin_acreditar excluye pagos conciliados', () => {
    const res = calcularComisionesPorVendedor({
      vendedores,
      facturas,
      pagos,
      movimientosTesoreria: movimientos,
      modo: 'sin_acreditar',
    });
    const ana = res.find((r) => r.vendedorId === 'v1');
    expect(ana?.baseSinAcreditar || 0).toBe(0);
  });
});
