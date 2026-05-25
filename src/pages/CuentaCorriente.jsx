import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  AlertTriangle,
  FileText,
  Download,
  Wallet,
  Clock,
  ChevronRight,
  CreditCard,
  X,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import {
  buildMovimientosCliente,
  buildResumenClientes,
  DIAS_PLAZO_DEFAULT,
  diasDesdeEmision,
  etiquetaFacturaCtaCte,
  getFacturasMorosas,
  getFacturasPendientesCobro,
  getTotalesCtaCte,
} from '../utils/ctaCte';

const TABS = [
  { id: 'saldos', label: 'Saldos por cliente' },
  { id: 'pendientes', label: 'Comprobantes pendientes' },
  { id: 'morosidad', label: 'Morosidad' },
  { id: 'extracto', label: 'Extracto' },
];

export default function CuentaCorriente() {
  const { clientes, facturas, pagos, addPago } = useData();
  const [tab, setTab] = useState('saldos');
  const [searchTerm, setSearchTerm] = useState('');
  const [soloConDeuda, setSoloConDeuda] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [facturaCobro, setFacturaCobro] = useState(null);
  const [pagoMonto, setPagoMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('transferencia');

  const totales = useMemo(
    () => getTotalesCtaCte(clientes, facturas, DIAS_PLAZO_DEFAULT),
    [clientes, facturas]
  );

  const resumenClientes = useMemo(
    () => buildResumenClientes(clientes, facturas),
    [clientes, facturas]
  );

  const pendientes = useMemo(() => getFacturasPendientesCobro(facturas), [facturas]);

  const morosas = useMemo(
    () => getFacturasMorosas(facturas, DIAS_PLAZO_DEFAULT),
    [facturas]
  );

  const clienteActivo = useMemo(
    () => clientes.find((c) => c.id === clienteSeleccionado) || null,
    [clientes, clienteSeleccionado]
  );

  const movimientosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return buildMovimientosCliente(clienteSeleccionado, facturas, pagos);
  }, [clienteSeleccionado, facturas, pagos]);

  const pendientesCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return getFacturasPendientesCobro(facturas, clienteSeleccionado);
  }, [clienteSeleccionado, facturas]);

  const filteredResumen = useMemo(() => {
    return resumenClientes.filter((row) => {
      const matchSearch = row.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDeuda = !soloConDeuda || row.saldo > 0 || row.cantPendientes > 0;
      return matchSearch && matchDeuda;
    });
  }, [resumenClientes, searchTerm, soloConDeuda]);

  const filteredPendientes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return pendientes.filter((f) => {
      const cliente = clientes.find((c) => c.id === f.clienteId);
      return (
        f.numero.toLowerCase().includes(term) ||
        cliente?.nombre.toLowerCase().includes(term) ||
        etiquetaFacturaCtaCte(f).toLowerCase().includes(term)
      );
    });
  }, [pendientes, clientes, searchTerm]);

  const filteredMorosas = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return morosas.filter((f) => {
      const cliente = clientes.find((c) => c.id === f.clienteId);
      return (
        f.numero.toLowerCase().includes(term) ||
        cliente?.nombre.toLowerCase().includes(term)
      );
    });
  }, [morosas, clientes, searchTerm]);

  const abrirExtracto = (clienteId) => {
    setClienteSeleccionado(clienteId);
    setTab('extracto');
  };

  const abrirCobro = (factura) => {
    setFacturaCobro(factura);
    setPagoMonto(String(factura.saldoPendiente || ''));
    setMetodoPago('transferencia');
    setShowCobroModal(true);
  };

  const handleCobro = async () => {
    if (!facturaCobro || !pagoMonto) return;
    const monto = parseFloat(pagoMonto);
    if (monto <= 0 || monto > facturaCobro.saldoPendiente) {
      toast.error('Monto inválido');
      return;
    }
    try {
      await addPago({
        tipo: 'cliente',
        facturaId: facturaCobro.id,
        clienteId: facturaCobro.clienteId,
        monto,
        metodoPago,
      });
      toast.success('Cobro registrado');
      setShowCobroModal(false);
      setFacturaCobro(null);
      setPagoMonto('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo registrar el cobro');
    }
  };

  const exportResumenExcel = () => {
    const rows = filteredResumen.map((r) => ({
      Cliente: r.nombre,
      'Saldo Cta Cte': r.saldo,
      'Saldo en facturas': r.saldoFacturas,
      'Fact. pendientes': r.cantPendientes,
      Morosas: r.cantMorosas,
      'Monto moroso': r.montoMoroso,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos');
    XLSX.writeFile(wb, 'cta_cte_saldos.xlsx');
    toast.success('Excel exportado');
  };

  const exportResumenPDF = () => {
    const doc = new jsPDF();
    doc.text('Cuenta Corriente — Saldos', 14, 15);
    doc.autoTable({
      head: [['Cliente', 'Saldo', 'Pend. facturas', 'Morosas']],
      body: filteredResumen.map((r) => [
        r.nombre,
        `$${r.saldo.toLocaleString()}`,
        r.cantPendientes,
        r.cantMorosas,
      ]),
      startY: 22,
    });
    doc.save('cta_cte_saldos.pdf');
    toast.success('PDF exportado');
  };

  return (
    <Layout>
      <Header
        title="Cuenta Corriente"
        subtitle="Saldos, comprobantes pendientes, morosidad y extracto por cliente"
      />

      <div className="p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-amber-200/60 bg-gradient-to-br from-amber-500/5 to-amber-600/10 dark:border-amber-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Saldo total clientes</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${totales.saldoTotalClientes.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              {totales.clientesConDeuda} clientes con deuda
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card border-sky-200/60 bg-gradient-to-br from-sky-500/5 to-sky-600/10 dark:border-sky-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Saldo en facturas</p>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">
              ${totales.totalSaldoFacturas.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              {totales.cantFacturasPendientes} comprobantes pendientes
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card border-rose-200/60 bg-gradient-to-br from-rose-500/5 to-rose-600/10 dark:border-rose-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Morosidad (+{DIAS_PLAZO_DEFAULT} días)</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ${totales.totalMoroso.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              {totales.cantMorosas} comprobantes vencidos
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card border-violet-200/60 bg-gradient-to-br from-violet-500/5 to-violet-600/10 dark:border-violet-900/40"
          >
            <p className="text-sm text-pastel-muted dark:text-slate-400">Sin emisión fiscal</p>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
              {totales.sinEmitirFiscal}
            </p>
            <p className="mt-1 text-xs text-pastel-muted dark:text-slate-500">
              <Link to="/comprobantes" className="text-sky-700 hover:underline dark:text-indigo-400">
                Ir a comprobantes →
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
                    <th className="p-4 text-left">Cliente</th>
                    <th className="p-4 text-right">Saldo cta. cte.</th>
                    <th className="p-4 text-right">En facturas</th>
                    <th className="p-4 text-center">Pendientes</th>
                    <th className="p-4 text-center">Morosas</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResumen.map((row, index) => (
                    <motion.tr
                      key={row.clienteId}
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
                      <td className="p-4 text-right">
                        <span
                          className={`font-bold ${
                            row.saldo > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : row.saldo < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-pastel-muted'
                          }`}
                        >
                          ${Math.abs(row.saldo).toLocaleString()}
                          {row.saldo > 0 ? ' (debe)' : row.saldo < 0 ? ' (a favor)' : ''}
                        </span>
                      </td>
                      <td className="p-4 text-right text-pastel-muted dark:text-slate-400">
                        ${row.saldoFacturas.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {row.cantPendientes > 0 ? (
                          <span className="badge-warning">{row.cantPendientes}</span>
                        ) : (
                          <span className="text-pastel-muted">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.cantMorosas > 0 ? (
                          <span className="badge-danger">{row.cantMorosas}</span>
                        ) : (
                          <span className="text-pastel-muted">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => abrirExtracto(row.clienteId)}
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
                <Users size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
                <p className="text-pastel-muted dark:text-slate-500">No hay clientes que coincidan con el filtro</p>
              </div>
            )}
          </div>
        )}

        {tab === 'pendientes' && (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Cliente</th>
                    <th className="p-4 text-left">Comprobante</th>
                    <th className="p-4 text-left">Fiscal</th>
                    <th className="p-4 text-left">Fecha</th>
                    <th className="p-4 text-right">Saldo</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPendientes.map((factura, index) => {
                    const cliente = clientes.find((c) => c.id === factura.clienteId);
                    return (
                      <motion.tr
                        key={factura.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="table-row"
                      >
                        <td className="p-4">{cliente?.nombre || '—'}</td>
                        <td className="p-4 font-mono text-sm text-sky-700 dark:text-indigo-400">
                          {etiquetaFacturaCtaCte(factura)}
                        </td>
                        <td className="p-4">
                          {factura.cae ? (
                            <span className="badge-success inline-flex items-center gap-1">
                              <ShieldCheck size={12} /> CAE
                            </span>
                          ) : (
                            <span className="badge-warning">Sin CAE</span>
                          )}
                        </td>
                        <td className="p-4 text-pastel-muted dark:text-slate-400">
                          {new Date(factura.fecha).toLocaleDateString('es-AR')}
                        </td>
                        <td className="p-4 text-right font-bold text-amber-600 dark:text-amber-400">
                          ${(factura.saldoPendiente || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          {factura.cae ? (
                            <button
                              type="button"
                              onClick={() => abrirCobro(factura)}
                              className="btn-primary py-1.5 text-xs"
                            >
                              Cobrar
                            </button>
                          ) : (
                            <Link to="/comprobantes" className="text-sm text-sky-700 dark:text-indigo-400">
                              Emitir CAE
                            </Link>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredPendientes.length === 0 && (
              <div className="py-12 text-center">
                <FileText size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
                <p className="text-pastel-muted dark:text-slate-500">No hay comprobantes pendientes de cobro</p>
              </div>
            )}
          </div>
        )}

        {tab === 'morosidad' && (
          <>
            <p className="mb-4 text-sm text-pastel-muted dark:text-slate-400">
              Comprobantes con CAE emitido, saldo pendiente y más de {DIAS_PLAZO_DEFAULT} días desde la
              emisión fiscal.
            </p>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="p-4 text-left">Cliente</th>
                      <th className="p-4 text-left">Comprobante</th>
                      <th className="p-4 text-center">Días</th>
                      <th className="p-4 text-right">Saldo</th>
                      <th className="p-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMorosas.map((factura, index) => {
                      const cliente = clientes.find((c) => c.id === factura.clienteId);
                      const dias = diasDesdeEmision(factura);
                      return (
                        <motion.tr
                          key={factura.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="table-row bg-rose-50/30 dark:bg-rose-950/20"
                        >
                          <td className="p-4">{cliente?.nombre || '—'}</td>
                          <td className="p-4 font-mono text-sm">{etiquetaFacturaCtaCte(factura)}</td>
                          <td className="p-4 text-center">
                            <span className="badge-danger inline-flex items-center gap-1">
                              <Clock size={12} /> {dias} días
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400">
                            ${(factura.saldoPendiente || 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => abrirCobro(factura)}
                              className="btn-primary py-1.5 text-xs"
                            >
                              Cobrar
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredMorosas.length === 0 && (
                <div className="py-12 text-center">
                  <AlertTriangle size={48} className="mx-auto mb-4 text-emerald-500/40" />
                  <p className="text-pastel-muted dark:text-slate-500">
                    No hay comprobantes en mora según el plazo de {DIAS_PLAZO_DEFAULT} días
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'extracto' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-pastel-muted dark:text-slate-400">
                  Cliente
                </label>
                <select
                  value={clienteSeleccionado || ''}
                  onChange={(e) => setClienteSeleccionado(e.target.value || null)}
                  className="select-field w-full max-w-md"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} — saldo ${(c.saldo || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              {clienteActivo && (
                <div className="card flex items-center gap-4 border-amber-200/50 py-3 dark:border-amber-900/30">
                  <Wallet className="text-amber-600 dark:text-amber-400" size={28} />
                  <div>
                    <p className="text-sm text-pastel-muted dark:text-slate-400">Saldo actual</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      ${Math.abs(clienteActivo.saldo || 0).toLocaleString()}
                      {(clienteActivo.saldo || 0) > 0
                        ? ' (debe)'
                        : (clienteActivo.saldo || 0) < 0
                          ? ' (a favor)'
                          : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {clienteActivo && pendientesCliente.length > 0 && (
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold text-pastel-ink dark:text-slate-100">
                  Pendientes de cobro
                </h3>
                <div className="flex flex-wrap gap-2">
                  {pendientesCliente.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => abrirCobro(f)}
                      disabled={!f.cae}
                      className="rounded-lg border border-edge-light px-3 py-2 text-left text-sm transition hover:bg-white/80 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <span className="font-mono text-sky-700 dark:text-indigo-400">
                        {etiquetaFacturaCtaCte(f)}
                      </span>
                      <span className="ml-2 font-bold text-amber-600">
                        ${(f.saldoPendiente || 0).toLocaleString()}
                      </span>
                      {!f.cae && (
                        <span className="ml-2 text-xs text-pastel-muted">(sin CAE)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {clienteActivo ? (
              <div className="card overflow-hidden p-0">
                <h3 className="border-b border-edge-light p-4 text-sm font-semibold dark:border-slate-800">
                  Movimientos — {clienteActivo.nombre}
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
                      {movimientosCliente.map((mov, index) => (
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
                          <td className="p-4 capitalize text-pastel-ink dark:text-slate-100">
                            {mov.concepto}
                          </td>
                          <td className="p-4 text-sm text-pastel-muted">{mov.referencia}</td>
                          <td className="p-4 text-right text-rose-600 dark:text-rose-400">
                            {mov.debe > 0 ? `$${mov.debe.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">
                            {mov.haber > 0 ? `$${mov.haber.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-4 text-right font-medium">
                            ${mov.saldo.toLocaleString()}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {movimientosCliente.length === 0 && (
                  <p className="p-8 text-center text-pastel-muted dark:text-slate-500">
                    Sin movimientos en cuenta corriente. Los débitos se registran al emitir el comprobante
                    fiscal con CAE.
                  </p>
                )}
              </div>
            ) : (
              <div className="card py-12 text-center">
                <Users size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
                <p className="text-pastel-muted dark:text-slate-500">
                  Elegí un cliente para ver el extracto de movimientos
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCobroModal && facturaCobro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowCobroModal(false)}
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
                  Registrar cobro
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCobroModal(false)}
                  className="rounded-lg p-1 hover:bg-pastel-mist dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="mb-4 text-sm text-pastel-muted dark:text-slate-400">
                {etiquetaFacturaCtaCte(facturaCobro)} — saldo $
                {(facturaCobro.saldoPendiente || 0).toLocaleString()}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Monto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={facturaCobro.saldoPendiente}
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
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCobro}
                  disabled={
                    !pagoMonto ||
                    parseFloat(pagoMonto) <= 0 ||
                    parseFloat(pagoMonto) > facturaCobro.saldoPendiente
                  }
                  className="btn-primary flex w-full items-center justify-center gap-2"
                >
                  <CreditCard size={18} />
                  Confirmar cobro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
