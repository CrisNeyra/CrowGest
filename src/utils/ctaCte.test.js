import { describe, it, expect } from 'vitest';
import { getTotalesCtaCte, buildMovimientosCliente } from './ctaCte';

const clientes = [
  { id: 'c1', nombre: 'Cliente 1', saldo: 1500.5 },
  { id: 'c2', nombre: 'Cliente 2', saldo: 0 },
];

const facturas = [
  {
    id: 'f1',
    clienteId: 'c1',
    total: 1500.5,
    saldoPendiente: 1500.5,
    estado: 'pendiente',
    ctaCteImpactada: true,
    fechaEmisionFiscal: '2026-06-01T10:00:00.000Z',
    numero: 'F-000001',
  },
];

const pagos = [
  {
    id: 'pago1',
    tipo: 'cliente',
    clienteId: 'c1',
    facturaId: 'f1',
    monto: 500.25,
    fecha: '2026-06-10T10:00:00.000Z',
    numero: 'REC-0001',
    estado: 'activo',
  },
];

describe('getTotalesCtaCte', () => {
  it('suma saldos de clientes y facturas sin error de float', () => {
    const totales = getTotalesCtaCte(clientes, facturas, 30);
    expect(totales.saldoTotalClientes).toBe(1500.5);
    expect(totales.clientesConDeuda).toBe(1);
    expect(totales.totalSaldoFacturas).toBe(1500.5);
  });
});

describe('buildMovimientosCliente', () => {
  it('reconstruye debe/haber y saldo acumulado', () => {
    const movs = buildMovimientosCliente('c1', facturas, pagos);
    expect(movs).toHaveLength(2);
    // primero el comprobante (debe), luego el cobro (haber)
    const comprobante = movs.find((m) => m.tipo === 'comprobante');
    const cobro = movs.find((m) => m.tipo === 'cobro');
    expect(comprobante.debe).toBe(1500.5);
    expect(cobro.haber).toBe(500.25);
    // saldo final = 1500.5 - 500.25 = 1000.25
    expect(movs[movs.length - 1].saldo).toBe(1000.25);
  });
});
