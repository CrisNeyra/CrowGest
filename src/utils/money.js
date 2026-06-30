/**
 * Aritmética monetaria segura para Gest Crow.
 *
 * Regla del proyecto (AGENTS.md): nunca usar float crudo para dinero.
 * Operamos internamente en centavos (enteros) y exponemos helpers que
 * redondean a 2 decimales de forma consistente (half-up).
 */

/** Convierte un valor monetario (pesos) a centavos enteros. */
export function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Convierte centavos enteros a pesos con 2 decimales. */
export function fromCents(cents) {
  return Math.round(Number(cents) || 0) / 100;
}

/** Redondea un monto a 2 decimales (half-up), evitando errores de float. */
export function roundMoney(value) {
  return fromCents(toCents(value));
}

/** Suma una lista de montos sin acumular error de float. */
export function sumMoney(values) {
  const totalCents = (values || []).reduce((acc, v) => acc + toCents(v), 0);
  return fromCents(totalCents);
}

/** Suma dos montos. */
export function addMoney(a, b) {
  return fromCents(toCents(a) + toCents(b));
}

/** Resta b de a. */
export function subMoney(a, b) {
  return fromCents(toCents(a) - toCents(b));
}

/** Multiplica un monto por una cantidad/factor (cantidad puede ser entero o decimal). */
export function mulMoney(amount, factor) {
  const f = Number(factor);
  if (!Number.isFinite(f)) return 0;
  return fromCents(toCents(amount) * f);
}

/** Aplica un porcentaje a un monto (ej: pct=21 => 21%). */
export function pctOf(amount, pct) {
  const p = Number(pct) || 0;
  return fromCents((toCents(amount) * p) / 100);
}

/** Formatea en pesos argentinos. */
export function formatARS(value, { withSymbol = true, minimumFractionDigits = 2 } = {}) {
  const n = roundMoney(value);
  const formatted = n.toLocaleString('es-AR', {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `$${formatted}` : formatted;
}
