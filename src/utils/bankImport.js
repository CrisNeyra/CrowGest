const DATE_KEYS = ['fecha', 'date', 'fecha movimiento', 'fecha operacion', 'fecha operación'];
const DESCRIPTION_KEYS = ['descripcion', 'descripción', 'detalle', 'concepto', 'movimiento'];
const REFERENCE_KEYS = ['referencia', 'comprobante', 'numero', 'número', 'id'];
const DEBIT_KEYS = ['debito', 'débito', 'debe', 'egreso', 'retiro'];
const CREDIT_KEYS = ['credito', 'crédito', 'haber', 'ingreso', 'deposito', 'depósito'];
const AMOUNT_KEYS = ['importe', 'monto', 'amount', 'valor'];
const BALANCE_KEYS = ['saldo', 'balance'];

const normalizeKey = (key) =>
  String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const raw = String(value).replace(/\s/g, '').replace(/\$/g, '');
  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.');
  return Number(normalized) || 0;
};

const parseDate = (value) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch.toISOString();
  }
  const raw = String(value).trim();
  const parts = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (parts) {
    const [, d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`).toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const pick = (row, keys) => {
  const entries = Object.entries(row);
  const found = entries.find(([key]) => keys.map(normalizeKey).includes(normalizeKey(key)));
  return found?.[1] ?? '';
};

const makeRowHash = (row) =>
  btoa(
    unescape(
      encodeURIComponent(
        [row.fechaBanco, row.descripcionBanco, row.referenciaBanco, row.montoBanco].join('|')
      )
    )
  ).slice(0, 40);

export async function parseBankFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows
    .map((row, index) => {
      const debito = Math.abs(parseNumber(pick(row, DEBIT_KEYS)));
      const credito = Math.abs(parseNumber(pick(row, CREDIT_KEYS)));
      const importe = parseNumber(pick(row, AMOUNT_KEYS));
      const montoBanco = credito > 0 ? credito : debito > 0 ? -debito : importe;
      const normalized = {
        index,
        fechaBanco: parseDate(pick(row, DATE_KEYS)),
        descripcionBanco: String(pick(row, DESCRIPTION_KEYS) || '').trim(),
        referenciaBanco: String(pick(row, REFERENCE_KEYS) || '').trim(),
        montoBanco,
        tipo: montoBanco >= 0 ? 'ingreso' : 'egreso',
        monto: Math.abs(montoBanco),
        saldoBanco: parseNumber(pick(row, BALANCE_KEYS)),
        raw: row,
      };
      return { ...normalized, rowHash: makeRowHash(normalized) };
    })
    .filter((row) => row.fechaBanco && row.monto > 0);
}

export function suggestBankMatches(rows, movimientos, cuentaId) {
  const used = new Set();
  return rows.map((row) => {
    let best = null;

    movimientos
      .filter((mov) => mov.cuentaId === cuentaId && !mov.anulado && !mov.conciliado)
      .forEach((mov) => {
        if (used.has(mov.id)) return;
        const montoOk = Math.abs((Number(mov.monto) || 0) - row.monto) <= 0.01;
        const tipoOk = mov.tipo === row.tipo;
        if (!montoOk || !tipoOk) return;

        const days = Math.abs(
          Math.round((new Date(mov.fecha).getTime() - new Date(row.fechaBanco).getTime()) / 86400000)
        );
        const text = `${mov.concepto || ''} ${row.descripcionBanco} ${row.referenciaBanco}`.toLowerCase();
        let score = 60;
        if (days === 0) score += 25;
        else if (days <= 3) score += 15;
        if (text.includes(String(mov.pagoId || '').toLowerCase())) score += 5;
        if ((mov.concepto || '').toLowerCase().split(' ').some((word) => word.length > 4 && text.includes(word))) {
          score += 10;
        }

        if (!best || score > best.score) {
          best = { movimientoId: mov.id, score };
        }
      });

    if (best?.score >= 70) {
      used.add(best.movimientoId);
      return { ...row, suggestedMovimientoId: best.movimientoId, score: best.score, selected: true };
    }
    return { ...row, suggestedMovimientoId: '', score: 0, selected: false };
  });
}
