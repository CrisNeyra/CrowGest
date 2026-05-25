import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Search,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import { DIAS_PLAZO_DEFAULT } from '../utils/ctaCte';
import {
  buildMovimientosProveedor,
  buildResumenProveedores,
  diasDesdeComprobanteProveedor,
  getComprobantesProveedorMorosos,
  getComprobantesProveedorPendientes,
  getTotalesCtaCteProveedores,
} from '../utils/ctaCteProveedores';

const TABS = [
  { id: 'saldos', label: 'Saldos por proveedor' },
  { id: 'pendientes', label: 'Comprobantes pendientes' },
  { id: 'morosidad', label: 'Morosidad' },
  { id: 'extracto', label: 'Extracto' },
];

export default function CuentaCorrienteProveedores() {
  const { proveedores, comprobantesProveedor, pagos, addPago } = useData();
  const { can } = usePermissions();
  const [tab, setTab] = useState('saldos');
  const [searchTerm, setSearchTerm] = useState('');
  const [soloConDeuda, setSoloConDeuda] = useState(true);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [comprobantePago, setComprobantePago] = useState(null);
  const [pagoMonto, setPagoMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('transferencia');

  const canPay = can('payments:create');

  const totales = useMemo(
    () =>
      getTotalesCtaCteProveedores(
        proveedores,
        comprobantesProveedor,
        DIAS_PLAZO_DEFAULT
      ),
    [proveedores, comprobantesProveedor]
  );

  const resumen = useMemo(
    () => buildResumenProveedores(proveedores, comprobantesProveedor),
    [proveedores, comprobantesProveedor]
  );

  const pendientes = useMemo(
    () => getComprobantesProveedorPendientes(comprobantesProveedor),
    [comprobantesProveedor]
  );

  const morosos = useMemo(
    () => getComprobantesProveedorMorosos(comprobantesProveedor, DIAS_PLAZO_DEFAULT),
    [comprobantesProveedor]
  );

  const proveedorActivo = useMemo(
    () => proveedores.find((p) => p.id === proveedorSeleccionado) || null,
    [proveedores, proveedorSeleccionado]
  );

  const movimientosProveedor = useMemo(() => {
    if (!proveedorSeleccionado) return [];
    return buildMovimientosProveedor(proveedorSeleccionado, comprobantesProveedor, pagos);
  }, [proveedorSeleccionado, comprobantesProveedor, pagos]);

  const pendientesProveedor = useMemo(() => {
    if (!proveedorSeleccionado) return [];
    return getComprobantesProveedorPendientes(comprobantesProveedor, proveedorSeleccionado);
  }, [proveedorSeleccionado, comprobantesProveedor]);

  const filteredResumen = useMemo(() => {
    return resumen.filter((row) => {
      const matchSearch = row.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDeuda = !soloConDeuda || row.saldo > 0 || row.cantPendientes > 0;
      return matchSearch && matchDeuda;
    });
  }, [resumen, searchTerm, soloConDeuda]);

  const filteredPendientes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return pendientes.filter((c) => {
      const proveedor = proveedores.find((p) => p.id === c.proveedorId);
      return (
        c.numero.toLowerCase().includes(term) ||
        c.ordenCompraNumero?.toLowerCase().includes(term) ||
        proveedor?.nombre.toLowerCase().includes(term)
      );
    });
  }, [pendientes, proveedores, searchTerm]);

  const filteredMorosos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return morosos.filter((c) => {
      const proveedor = proveedores.find((p) => p.id === c.proveedorId);
      return c.numero.toLowerCase().includes(term) || proveedor?.nombre.toLowerCase().includes(term);
    });
  }, [morosos, proveedores, searchTerm]);

  const abrirExtracto = (proveedorId) => {
    setProveedorSeleccionado(proveedorId);
    setTab('extracto');
  };

  const abrirPago = (comprobante) => {
    setComprobantePago(comprobante);
    setPagoMonto(String(comprobante.saldoPendiente || ''));
    setMetodoPago('transferencia');
    setShowPagoModal(true);
  };

  const handlePago = async () => {
    if (!comprobantePago || !pagoMonto) return;
    const monto = parseFloat(pagoMonto);
    if (monto <= 0 || monto > (comprobantePago.saldoPendiente || 0)) {
      toast.error('Monto inválido');
      return;
    }

    try {
      await addPago({
        tipo: 'proveedor',
        proveedorId: comprobantePago.proveedorId,
        comprobanteProveedorId: comprobantePago.id,
        monto,
        metodoPago,
      });
      toast.success('Pago registrado');
      setShowPagoModal(false);
      setComprobantePago(null);
      setPagoMonto('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo registrar el pago');
    }
  };

  const exportResumenExcel = () => {
    const rows = filteredResumen.map((r) => ({
      Proveedor: r.nombre,
      'Saldo Cta Cte': r.saldo,
      'Saldo en comprobantes': r.saldoComprobantes,
      Pendientes: r.cantPendientes,
      Morosos: r.cantMorosos,
      'Monto moroso': r.montoMoroso,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos');
    XLSX.writeFile(wb, 'cta_cte_proveedores_saldos.xlsx');
    toast.success('Excel exportado');
  };

  const exportResumenPDF = () => {
    const doc = new jsPDF();
    doc.text('Cuenta Corriente Proveedores — Saldos', 14, 15);
    doc.autoTable({
      head: [['Proveedor', 'Saldo', 'Pendientes', 'Morosos']],
      body: filteredResumen.map((r) => [
        r.nombre,
        `$${r.saldo.toLocaleString()}`,
        r.cantPendientes,
        r.cantMorosos,
      ]),
      startY: 22,
    });
    doc.save('cta_cte_proveedores_saldos.pdf');
    toast.success('PDF exportado');
  };

  return (
    <Layout>
      <Header
        title="Cuenta Corriente Proveedores"
        subtitle="Deuda, comprobantes pendientes, morosidad y extracto por proveedor"
      />

      <div className="p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-rose-200/60 bg-gradient-to-br from-rose-500/5 to-rose-600/10 dark:border-rose-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Deuda total</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ${totales.deudaTotal.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              {totales.proveedoresConDeuda} proveedores con deuda
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card border-sky-200/60 bg-gradient-to-br from-sky-500/5 to-sky-600/10 dark:border-sky-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Comprobantes pendientes</p>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">
              ${totales.totalPendiente.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              {totales.cantPendientes} comprobantes abiertos
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card border-amber-200/60 bg-gradient-to-br from-amber-500/5 to-amber-600/10 dark:border-amber-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Morosidad (+{DIAS_PLAZO_DEFAULT} días)</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${totales.totalMoroso.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              {totales.cantMorosos} comprobantes vencidos
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card border-violet-200/60 bg-gradient-to-br from-violet-500/5 to-violet-600/10 dark:border-violet-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Origen de deuda</p>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
              {comprobantesProveedor.length}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              <Link to="/ordenes-compra" className="text-sky-700 hover:underline dark:text-indigo-400">
                Ver compras →
              </Link>
            </p>
          </motion.div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 border-b border-edge-light pb-2 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-sky-600 text-white dark:bg-indigo-600'
                  : 'text-pastel-muted hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {tab === 'saldos' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-pastel-muted dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={soloConDeuda}
                  onChange={(e) => setSoloConDeuda(e.target.checked)}
                  className="rounded border-edge-light dark:border-slate-600"
                />
                Solo con saldo o pendientes
              </label>
            )}
            {tab === 'saldos' && (
              <>
                <button type="button" onClick={exportResumenPDF} className="btn-secondary">
                  <FileText size={18} className="text-red-500" /> PDF
                </button>
                <button type="button" onClick={exportResumenExcel} className="btn-secondary">
                  <Download size={18} className="text-emerald-500" /> Excel
                </button>
              </>
            )}
          </div>
        </div>

        {tab === 'saldos' && (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Proveedor</th>
                    <th className="p-4 text-right">Saldo cta. cte.</th>
                    <th className="p-4 text-right">En comprobantes</th>
                    <th className="p-4 text-center">Pendientes</th>
                    <th className="p-4 text-center">Morosos</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResumen.map((row, index) => (
                    <motion.tr
                      key={row.proveedorId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <p className="font-medium text-pastel-ink dark:text-slate-100">{row.nombre}</p>
                        {row.email && (
                          <p className="text-xs text-pastel-muted dark:text-slate-500">{row.email}</p>
                        )}
                      </td>
                      <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        ${Math.max(0, row.saldo).toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-pastel-muted dark:text-slate-400">
                        ${row.saldoComprobantes.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {row.cantPendientes > 0 ? (
                          <span className="badge-warning">{row.cantPendientes}</span>
                        ) : (
                          <span className="text-pastel-muted">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.cantMorosos > 0 ? (
                          <span className="badge-danger">{row.cantMorosos}</span>
                        ) : (
                          <span className="text-pastel-muted">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => abrirExtracto(row.proveedorId)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900 dark:text-indigo-400"
                        >
                          Extracto <ChevronRight size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredResumen.length === 0 && (
              <div className="py-12 text-center">
                <Truck size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
                <p className="text-pastel-muted dark:text-slate-500">No hay proveedores que coincidan</p>
              </div>
            )}
          </div>
        )}

        {tab === 'pendientes' && (
          <ComprobantesTable
            comprobantes={filteredPendientes}
            proveedores={proveedores}
            canPay={canPay}
            onPay={abrirPago}
          />
        )}

        {tab === 'morosidad' && (
          <>
            <p className="mb-4 text-sm text-pastel-muted dark:text-slate-400">
              Comprobantes de proveedor con saldo pendiente y más de {DIAS_PLAZO_DEFAULT} días desde la recepción.
            </p>
            <ComprobantesTable
              comprobantes={filteredMorosos}
              proveedores={proveedores}
              canPay={canPay}
              onPay={abrirPago}
              showDays
            />
          </>
        )}

        {tab === 'extracto' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-pastel-muted dark:text-slate-400">
                  Proveedor
                </label>
                <select
                  value={proveedorSeleccionado || ''}
                  onChange={(e) => setProveedorSeleccionado(e.target.value || null)}
                  className="select-field w-full max-w-md"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — saldo ${(p.saldoPendiente || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              {proveedorActivo && (
                <div className="card flex items-center gap-4 border-rose-200/50 py-3 dark:border-rose-900/30">
                  <Wallet className="text-rose-600 dark:text-rose-400" size={28} />
                  <div>
                    <p className="text-sm text-pastel-muted dark:text-slate-400">Saldo actual</p>
                    <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                      ${(proveedorActivo.saldoPendiente || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {proveedorActivo && pendientesProveedor.length > 0 && (
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold text-pastel-ink dark:text-slate-100">
                  Pendientes de pago
                </h3>
                <div className="flex flex-wrap gap-2">
                  {pendientesProveedor.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => abrirPago(c)}
                      disabled={!canPay}
                      className="rounded-lg border border-edge-light px-3 py-2 text-left text-sm transition hover:bg-white/80 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <span className="font-mono text-sky-700 dark:text-indigo-400">{c.numero}</span>
                      <span className="ml-2 font-bold text-rose-600">
                        ${(c.saldoPendiente || 0).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {proveedorActivo ? (
              <div className="card overflow-hidden p-0">
                <h3 className="border-b border-edge-light p-4 text-sm font-semibold dark:border-slate-800">
                  Movimientos — {proveedorActivo.nombre}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="p-4 text-left">Fecha</th>
                        <th className="p-4 text-left">Concepto</th>
                        <th className="p-4 text-left">Referencia</th>
                        <th className="p-4 text-right">Debe</th>
                        <th className="p-4 text-right">Haber</th>
                        <th className="p-4 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosProveedor.map((mov, index) => (
                        <motion.tr
                          key={mov.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="table-row"
                        >
                          <td className="p-4 text-pastel-muted dark:text-slate-400">
                            {new Date(mov.fecha).toLocaleDateString('es-AR')}
                          </td>
                          <td className="p-4 text-pastel-ink dark:text-slate-100">{mov.concepto}</td>
                          <td className="p-4 text-sm text-pastel-muted">{mov.referencia}</td>
                          <td className="p-4 text-right text-rose-600 dark:text-rose-400">
                            {mov.debe > 0 ? `$${mov.debe.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">
                            {mov.haber > 0 ? `$${mov.haber.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-4 text-right font-medium">${mov.saldo.toLocaleString()}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {movimientosProveedor.length === 0 && (
                  <p className="p-8 text-center text-pastel-muted dark:text-slate-500">
                    Sin movimientos. La deuda nace al registrar recepciones de compras.
                  </p>
                )}
              </div>
            ) : (
              <div className="card py-12 text-center">
                <Truck size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
                <p className="text-pastel-muted dark:text-slate-500">
                  Elegí un proveedor para ver el extracto
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPagoModal && comprobantePago && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowPagoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="card w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">
                  Registrar pago
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPagoModal(false)}
                  className="rounded-lg p-1 hover:bg-pastel-mist dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="mb-4 text-sm text-pastel-muted dark:text-slate-400">
                {comprobantePago.numero} — saldo ${(comprobantePago.saldoPendiente || 0).toLocaleString()}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Monto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={comprobantePago.saldoPendiente}
                    value={pagoMonto}
                    onChange={(e) => setPagoMonto(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Método de pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="select-field w-full"
                  >
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handlePago}
                  disabled={
                    !canPay ||
                    !pagoMonto ||
                    parseFloat(pagoMonto) <= 0 ||
                    parseFloat(pagoMonto) > comprobantePago.saldoPendiente
                  }
                  className="btn-primary flex w-full items-center justify-center gap-2"
                >
                  <CreditCard size={18} />
                  Confirmar pago
                </button>
                {!canPay && (
                  <p className="text-center text-xs text-pastel-muted">
                    Tu rol no tiene permiso para registrar pagos.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function ComprobantesTable({ comprobantes, proveedores, canPay, onPay, showDays = false }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="p-4 text-left">Proveedor</th>
              <th className="p-4 text-left">Comprobante</th>
              <th className="p-4 text-left">OC / Recepción</th>
              {showDays && <th className="p-4 text-center">Días</th>}
              <th className="p-4 text-left">Fecha</th>
              <th className="p-4 text-right">Saldo</th>
              <th className="p-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {comprobantes.map((comprobante, index) => {
              const proveedor = proveedores.find((p) => p.id === comprobante.proveedorId);
              return (
                <motion.tr
                  key={comprobante.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="table-row"
                >
                  <td className="p-4">{proveedor?.nombre || '-'}</td>
                  <td className="p-4 font-mono text-sm text-sky-700 dark:text-indigo-400">
                    {comprobante.numero}
                  </td>
                  <td className="p-4 text-sm text-pastel-muted">
                    {comprobante.ordenCompraNumero || '-'} / {comprobante.recepcionNumero || '-'}
                  </td>
                  {showDays && (
                    <td className="p-4 text-center">
                      <span className="badge-danger inline-flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {diasDesdeComprobanteProveedor(comprobante)} días
                      </span>
                    </td>
                  )}
                  <td className="p-4 text-pastel-muted dark:text-slate-400">
                    {new Date(comprobante.fecha).toLocaleDateString('es-AR')}
                  </td>
                  <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400">
                    ${(comprobante.saldoPendiente || 0).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    {canPay ? (
                      <button
                        type="button"
                        onClick={() => onPay(comprobante)}
                        className="btn-primary py-1.5 text-xs"
                      >
                        Pagar
                      </button>
                    ) : (
                      <span className="text-xs text-pastel-muted">Sin permiso</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {comprobantes.length === 0 && (
        <div className="py-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
          <p className="text-pastel-muted dark:text-slate-500">No hay comprobantes pendientes</p>
        </div>
      )}
    </div>
  );
}
