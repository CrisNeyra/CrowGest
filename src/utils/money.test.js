import { describe, it, expect } from 'vitest';
import {
  toCents,
  fromCents,
  roundMoney,
  sumMoney,
  addMoney,
  subMoney,
  mulMoney,
  pctOf,
  formatARS,
} from './money';

describe('money - conversiones', () => {
  it('toCents redondea a centavos enteros', () => {
    expect(toCents(10.555)).toBe(1056);
    expect(toCents(0.1)).toBe(10);
    expect(toCents('abc')).toBe(0);
  });

  it('fromCents vuelve a pesos', () => {
    expect(fromCents(1056)).toBe(10.56);
    expect(fromCents(0)).toBe(0);
  });
});

describe('money - operaciones sin error de float', () => {
  it('0.1 + 0.2 da 0.3 exacto', () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it('sumMoney evita acumulación de error', () => {
    const valores = Array.from({ length: 10 }, () => 0.1);
    expect(sumMoney(valores)).toBe(1);
  });

  it('subMoney resta correctamente', () => {
    expect(subMoney(1000.5, 0.5)).toBe(1000);
  });

  it('mulMoney multiplica por cantidad', () => {
    expect(mulMoney(99.99, 3)).toBe(299.97);
  });

  it('roundMoney redondea half-up', () => {
    expect(roundMoney(2.345)).toBe(2.35);
    expect(roundMoney(2.344)).toBe(2.34);
  });
});

describe('money - porcentajes', () => {
  it('pctOf calcula IVA 21%', () => {
    expect(pctOf(1000, 21)).toBe(210);
  });

  it('pctOf calcula IVA 10.5%', () => {
    expect(pctOf(1000, 10.5)).toBe(105);
  });

  it('pctOf con 0 devuelve 0', () => {
    expect(pctOf(1000, 0)).toBe(0);
  });
});

describe('money - formato', () => {
  it('formatARS agrega símbolo y 2 decimales', () => {
    expect(formatARS(1234.5)).toContain('$');
    expect(formatARS(1234.5)).toContain('1.234,5');
  });

  it('formatARS sin símbolo', () => {
    expect(formatARS(1000, { withSymbol: false })).not.toContain('$');
  });
});
