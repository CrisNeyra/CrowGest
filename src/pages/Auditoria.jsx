import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Filter, Search, ShieldCheck, User } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

const ACTION_LABELS = {
  'orders.authorize': 'Pedido autorizado',
  'orders.cancel': 'Pedido cancelado',
  'remitos.emit': 'Remito emitido',
  'remitos.cancel': 'Remito anulado',
  'purchases.receive': 'Recepción de compra',
  'purchases.return': 'Remito compra anulado',
  'supplier_invoice.create': 'Comprobante proveedor creado',
  'supplier_invoice.cancel': 'Comprobante proveedor anulado',
  'supplier_credit_note.create': 'NC proveedor aplicada',
  'invoices.fiscal_emit': 'Comprobante fiscal emitido',
  'invoices.credit_note': 'Nota de crédito fiscal',
  'payments.receipt_create': 'Recibo registrado',
  'payments.supplier_payment_create': 'Orden de pago registrada',
  'payments.receipt_cancel': 'Recibo anulado',
  'payments.supplier_payment_cancel': 'Orden de pago anulada',
  'treasury.reconcile': 'Movimiento conciliado',
  'treasury.unreconcile': 'Movimiento desconciliado',
  'treasury.manual_movement': 'Movimiento manual',
  'bank_import.reconcile': 'Importación bancaria conciliada',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

const inDateRange = (fecha, desde, hasta) => {
  if (!fecha) return false;
  const d = new Date(fecha);
  if (desde && d < new Date(`${desde}T00:00:00`)) return false;
  if (hasta && d > new Date(`${hasta}T23:59:59`)) return false;
  return true;
};

export default function Auditoria() {
  const { auditLog } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const rows = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return auditLog
      .filter((entry) => !actionFilter || entry.action === actionFilter)
      .filter((entry) => inDateRange(entry.createdAt, dateFrom, dateTo))
      .filter((entry) =>
        [
          ACTION_LABELS[entry.action] || entry.action,
          entry.entity,
          entry.entityLabel,
          entry.userEmail,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [actionFilter, auditLog, dateFrom, dateTo, searchTerm]);

  const todayCount = auditLog.filter((entry) => {
    const d = new Date(entry.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const usersCount = new Set(auditLog.map((entry) => entry.userEmail).filter(Boolean)).size;

  return (
    <Layout>
      <Header title="Auditoría" subtitle="Trazabilidad de operaciones críticas del sistema" />

      <div className="space-y-6 p-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Kpi title="Eventos registrados" value={auditLog.length.toLocaleString('es-AR')} icon={ShieldCheck} />
          <Kpi title="Eventos de hoy" value={todayCount.toLocaleString('es-AR')} icon={Activity} />
          <Kpi title="Usuarios con actividad" value={usersCount.toLocaleString('es-AR')} icon={User} />
        </section>

        <section className="card">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar acción, entidad o usuario..."
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={18} />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="select-field pl-10"
              >
                <option value="">Todas las acciones</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
          </div>
        </section>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-edge-light p-4 dark:border-slate-800">
            <h3 className="font-semibold text-pastel-ink dark:text-slate-100">
              Eventos ({rows.length})
            </h3>
            <p className="text-sm text-pastel-muted">Registro cronológico de operaciones sensibles</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Acción</th>
                  <th className="p-4 text-left">Entidad</th>
                  <th className="p-4 text-left">Usuario</th>
                  <th className="p-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry, index) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className="table-row"
                  >
                    <td className="p-4 text-pastel-muted">{formatDate(entry.createdAt)}</td>
                    <td className="p-4">
                      <p className="font-medium text-pastel-ink dark:text-slate-100">
                        {ACTION_LABELS[entry.action] || entry.action}
                      </p>
                      <p className="text-xs text-pastel-muted">{entry.action}</p>
                    </td>
                    <td className="p-4">
                      <p>{entry.entityLabel || entry.entityId || '-'}</p>
                      <p className="text-xs text-pastel-muted">{entry.entity}</p>
                    </td>
                    <td className="p-4 text-pastel-muted">{entry.userEmail || 'Sistema'}</td>
                    <td className="p-4 text-right font-semibold">{entry.amount ? formatCurrency(entry.amount) : '-'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {!rows.length && (
            <div className="py-12 text-center text-pastel-muted">No hay eventos para los filtros seleccionados</div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Kpi({ title, value, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-pastel-muted dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-pastel-ink dark:text-slate-100">{value}</p>
        </div>
        <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
