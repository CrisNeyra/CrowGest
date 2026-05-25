import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Download,
  FileText,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import TesoreriaModal from '../components/tesoreria/TesoreriaModal';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';
import {
  filterMovimientosTesoreria,
  formatCurrency,
  getComprobantesProveedorPendientesTesoreria,
  getFacturasPendientesTesoreria,
  getMetodoPagoLabel,
  getTesoreriaStats,
  getTipoCuentaLabel,
  METODOS_PAGO,
  TIPOS_CUENTA_TESORERIA,
} from '../utils/tesoreria';
import { parseBankFile, suggestBankMatches } from '../utils/bankImport';

const loadExportTools = async () => {
  const [{ jsPDF }, autoTableModule, XLSX] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('xlsx'),
  ]);
  return { jsPDF, autoTable: autoTableModule.default || autoTableModule.autoTable, XLSX };
};

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'recibos', label: 'Recibos' },
  { id: 'ordenes_pago', label: 'Órdenes de pago' },
  { id: 'movimientos', label: 'Movimientos' },
];

const emptyCuentaForm = {
  nombre: '',
  tipo: 'caja',
  saldoInicial: '',
};

const emptyMovimientoForm = {
  cuentaId: '',
  tipo: 'ingreso',
  concepto: '',
  monto: '',
  metodoPago: 'transferencia',
  conciliado: false,
};

const emptyPagoForm = {
  cuentaTesoreriaId: '',
  monto: '',
  metodoPago: 'transferencia',
  observaciones: '',
  conciliado: false,
};

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';
}

export default function Tesoreria() {
  const {
    cuentasTesoreria,
    movimientosTesoreria,
    facturas,
    pagos,
    clientes,
    comprobantesProveedor,
    proveedores,
    addCuentaTesoreria,
    updateCuentaTesoreria,
    conciliarMovimientoTesoreria,
    registrarImportacionBancaria,
    addMovimientoTesoreria,
    registrarReciboCliente,
    registrarOrdenPagoProveedor,
    anularPago,
  } = useData();
  const { can } = usePermissions();
  const canManage = can('payments:create');

  const [tab, setTab] = useState('resumen');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCuenta, setFilterCuenta] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterConciliacion, setFilterConciliacion] = useState('');
  const [showBankImportModal, setShowBankImportModal] = useState(false);
  const [bankImportCuentaId, setBankImportCuentaId] = useState('');
  const [bankImportFileName, setBankImportFileName] = useState('');
  const [bankImportRows, setBankImportRows] = useState([]);
  const [bankImportLoading, setBankImportLoading] = useState(false);
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [cuentaForm, setCuentaForm] = useState(emptyCuentaForm);
  const [movimientoForm, setMovimientoForm] = useState(emptyMovimientoForm);
  const [reciboTarget, setReciboTarget] = useState(null);
  const [ordenPagoTarget, setOrdenPagoTarget] = useState(null);
  const [showOrdenPagoMultipleModal, setShowOrdenPagoMultipleModal] = useState(false);
  const [ordenPagoProveedorId, setOrdenPagoProveedorId] = useState('');
  const [ordenPagoImputaciones, setOrdenPagoImputaciones] = useState([]);
  const [pagoAnulacionTarget, setPagoAnulacionTarget] = useState(null);
  const [motivoAnulacionPago, setMotivoAnulacionPago] = useState('');
  const [savingAnulacionPago, setSavingAnulacionPago] = useState(false);
  const [pagoForm, setPagoForm] = useState(emptyPagoForm);

  const cuentasActivas = cuentasTesoreria.filter((c) => c.activa !== false);
  const defaultCuentaId = cuentasActivas[0]?.id || '';

  const stats = useMemo(
    () => getTesoreriaStats(cuentasTesoreria, movimientosTesoreria),
    [cuentasTesoreria, movimientosTesoreria]
  );

  const facturasPendientes = useMemo(
    () => getFacturasPendientesTesoreria(facturas, clientes),
    [facturas, clientes]
  );

  const comprobantesPendientes = useMemo(
    () =>
      getComprobantesProveedorPendientesTesoreria(
        comprobantesProveedor,
        proveedores
      ),
    [comprobantesProveedor, proveedores]
  );

  const proveedoresConPendientes = useMemo(() => {
    const ids = new Set(comprobantesPendientes.map((c) => c.proveedorId));
    return proveedores.filter((proveedor) => ids.has(proveedor.id));
  }, [comprobantesPendientes, proveedores]);

  const comprobantesOrdenPagoMultiple = useMemo(
    () =>
      comprobantesPendientes.filter(
        (comprobante) => !ordenPagoProveedorId || comprobante.proveedorId === ordenPagoProveedorId
      ),
    [comprobantesPendientes, ordenPagoProveedorId]
  );

  const totalOrdenPagoMultiple = ordenPagoImputaciones.reduce(
    (acc, imputacion) => acc + (Number(imputacion.monto) || 0),
    0
  );

  const movimientosFiltrados = useMemo(
    () =>
      filterMovimientosTesoreria(movimientosTesoreria, {
        searchTerm,
        cuentaId: filterCuenta,
        tipo: filterTipo,
        conciliacion: filterConciliacion,
      }),
    [movimientosTesoreria, searchTerm, filterCuenta, filterTipo, filterConciliacion]
  );

  const cuentaNombre = (id) =>
    cuentasTesoreria.find((c) => c.id === id)?.nombre || 'Cuenta eliminada';

  const openRecibo = (factura) => {
    setReciboTarget(factura);
    setPagoForm({
      ...emptyPagoForm,
      cuentaTesoreriaId: defaultCuentaId,
      monto: String(factura.saldoPendiente || ''),
    });
  };

  const openOrdenPago = (comprobante) => {
    setOrdenPagoTarget(comprobante);
    setPagoForm({
      ...emptyPagoForm,
      cuentaTesoreriaId: defaultCuentaId,
      monto: String(comprobante.saldoPendiente || ''),
    });
  };

  const openOrdenPagoMultiple = () => {
    const proveedorId = proveedoresConPendientes[0]?.id || '';
    setOrdenPagoProveedorId(proveedorId);
    setOrdenPagoImputaciones([]);
    setPagoForm({
      ...emptyPagoForm,
      cuentaTesoreriaId: defaultCuentaId,
    });
    setShowOrdenPagoMultipleModal(true);
  };

  const handleCuentaSubmit = async (event) => {
    event.preventDefault();
    try {
      await addCuentaTesoreria({
        ...cuentaForm,
        saldoInicial: Number(cuentaForm.saldoInicial) || 0,
      });
      toast.success('Cuenta creada');
      setShowCuentaModal(false);
      setCuentaForm(emptyCuentaForm);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo crear la cuenta');
    }
  };

  const handleMovimientoSubmit = async (event) => {
    event.preventDefault();
    try {
      await addMovimientoTesoreria({
        ...movimientoForm,
        monto: Number(movimientoForm.monto),
      });
      toast.success('Movimiento registrado');
      setShowMovimientoModal(false);
      setMovimientoForm(emptyMovimientoForm);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo registrar el movimiento');
    }
  };

  const handleRecibo = async () => {
    if (!reciboTarget) return;
    const monto = Number(pagoForm.monto);
    if (monto <= 0 || monto > (reciboTarget.saldoPendiente || 0)) {
      toast.error('Monto inválido');
      return;
    }
    try {
      await registrarReciboCliente({
        facturaId: reciboTarget.id,
        ...pagoForm,
        monto,
      });
      toast.success('Recibo registrado');
      setReciboTarget(null);
      setPagoForm(emptyPagoForm);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo registrar el recibo');
    }
  };

  const handleOrdenPago = async () => {
    if (!ordenPagoTarget) return;
    const monto = Number(pagoForm.monto);
    if (monto <= 0 || monto > (ordenPagoTarget.saldoPendiente || 0)) {
      toast.error('Monto inválido');
      return;
    }
    try {
      await registrarOrdenPagoProveedor({
        comprobanteProveedorId: ordenPagoTarget.id,
        ...pagoForm,
        monto,
      });
      toast.success('Orden de pago registrada');
      setOrdenPagoTarget(null);
      setPagoForm(emptyPagoForm);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo registrar la orden de pago');
    }
  };

  const handleOrdenPagoMultiple = async () => {
    if (!ordenPagoProveedorId) {
      toast.error('Seleccioná un proveedor');
      return;
    }
    if (totalOrdenPagoMultiple <= 0) {
      toast.error('Imputá al menos un comprobante');
      return;
    }

    try {
      await registrarOrdenPagoProveedor({
        proveedorId: ordenPagoProveedorId,
        imputaciones: ordenPagoImputaciones,
        cuentaTesoreriaId: pagoForm.cuentaTesoreriaId,
        metodoPago: pagoForm.metodoPago,
        observaciones: pagoForm.observaciones,
        conciliado: pagoForm.conciliado,
      });
      toast.success('Orden de pago múltiple registrada');
      setShowOrdenPagoMultipleModal(false);
      setOrdenPagoProveedorId('');
      setOrdenPagoImputaciones([]);
      setPagoForm(emptyPagoForm);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo registrar la orden de pago múltiple');
    }
  };

  const openAnulacionPagoDesdeMovimiento = (movimiento) => {
    const pago = pagos.find((p) => p.id === movimiento.pagoId);
    if (!pago || pago.estado === 'anulado') return;
    setPagoAnulacionTarget(pago);
    setMotivoAnulacionPago('');
  };

  const handleAnularPagoTesoreria = async () => {
    if (!pagoAnulacionTarget) return;
    setSavingAnulacionPago(true);
    try {
      await anularPago(pagoAnulacionTarget.id, motivoAnulacionPago);
      toast.success(`${pagoAnulacionTarget.tipo === 'cliente' ? 'Recibo' : 'Orden de pago'} anulada`);
      setPagoAnulacionTarget(null);
      setMotivoAnulacionPago('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo anular');
    } finally {
      setSavingAnulacionPago(false);
    }
  };

  const handleConciliacion = async (movimiento, conciliado) => {
    try {
      await conciliarMovimientoTesoreria(movimiento.id, conciliado);
      toast.success(conciliado ? 'Movimiento conciliado' : 'Movimiento desconciliado');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo actualizar la conciliación');
    }
  };

  const openBankImport = () => {
    setBankImportCuentaId(defaultCuentaId);
    setBankImportFileName('');
    setBankImportRows([]);
    setShowBankImportModal(true);
  };

  const handleBankFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !bankImportCuentaId) return;
    setBankImportLoading(true);
    try {
      const parsed = await parseBankFile(file);
      const suggested = suggestBankMatches(parsed, movimientosTesoreria, bankImportCuentaId);
      setBankImportFileName(file.name);
      setBankImportRows(suggested);
      toast.success(`${suggested.length} filas importadas`);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo leer el archivo bancario');
    } finally {
      setBankImportLoading(false);
      event.target.value = '';
    }
  };

  const handleConfirmBankImport = async () => {
    try {
      const result = await registrarImportacionBancaria({
        cuentaId: bankImportCuentaId,
        fileName: bankImportFileName,
        rows: bankImportRows,
      });
      toast.success(`${result.conciliadas} movimientos conciliados`);
      setShowBankImportModal(false);
      setBankImportRows([]);
      setBankImportFileName('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo confirmar la importación');
    }
  };

  const exportMovimientosPDF = async () => {
    const { jsPDF, autoTable } = await loadExportTools();
    const doc = new jsPDF();
    doc.text('Tesorería - Movimientos', 14, 15);
    autoTable(doc, {
      head: [['Fecha', 'Cuenta', 'Tipo', 'Concepto', 'Método', 'Monto', 'Conciliado', 'Estado']],
      body: movimientosFiltrados.map((m) => [
        formatDate(m.fecha),
        cuentaNombre(m.cuentaId),
        m.tipo,
        m.concepto,
        getMetodoPagoLabel(m.metodoPago),
        formatCurrency(m.monto),
        m.conciliado ? 'Sí' : 'No',
        m.anulado ? 'Anulado' : 'Vigente',
      ]),
      startY: 24,
    });
    doc.save('tesoreria_movimientos.pdf');
    toast.success('PDF exportado');
  };

  const exportMovimientosExcel = async () => {
    const { XLSX } = await loadExportTools();
    const ws = XLSX.utils.json_to_sheet(
      movimientosFiltrados.map((m) => ({
        Fecha: formatDate(m.fecha),
        Cuenta: cuentaNombre(m.cuentaId),
        Tipo: m.tipo,
        Concepto: m.concepto,
        Método: getMetodoPagoLabel(m.metodoPago),
        Monto: m.tipo === 'egreso' ? -m.monto : m.monto,
        Conciliado: m.conciliado ? 'Sí' : 'No',
        Estado: m.anulado ? 'Anulado' : 'Vigente',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, 'tesoreria_movimientos.xlsx');
    toast.success('Excel exportado');
  };

  return (
    <Layout>
      <Header
        title="Tesorería"
        subtitle="Caja, bancos, recibos, órdenes de pago y movimientos financieros"
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Saldo total" value={formatCurrency(stats.saldoTotal)} tone="neutral" />
          <KpiCard title="Ingresos del mes" value={formatCurrency(stats.ingresosMes)} tone="positive" />
          <KpiCard title="Egresos del mes" value={formatCurrency(stats.egresosMes)} tone="negative" />
          <KpiCard
            title="Balance del mes"
            value={formatCurrency(stats.balanceMes)}
            tone={stats.balanceMes >= 0 ? 'positive' : 'negative'}
          />
        </div>

        {!cuentasActivas.length && (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            No hay cuentas de tesorería activas. Creá una Caja Principal para poder registrar recibos y pagos.
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b border-edge-light pb-2 dark:border-slate-800">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? 'bg-sky-600 text-white dark:bg-indigo-600'
                  : 'text-pastel-muted hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">
                  Saldos por cuenta
                </h3>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowCuentaModal(true)}
                    className="btn-primary py-2 text-sm"
                  >
                    <Plus size={16} /> Cuenta
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {cuentasTesoreria.map((cuenta) => (
                  <CuentaRow key={cuenta.id} cuenta={cuenta} />
                ))}
                {!cuentasTesoreria.length && (
                  <p className="py-8 text-center text-pastel-muted">Sin cuentas registradas</p>
                )}
              </div>
            </section>

            <section className="card">
              <h3 className="mb-4 text-lg font-semibold text-pastel-ink dark:text-slate-100">
                Últimos movimientos
              </h3>
              <div className="space-y-3">
                {movimientosTesoreria
                  .slice()
                  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                  .slice(0, 8)
                  .map((mov) => (
                    <MovimientoRow key={mov.id} mov={mov} cuentaNombre={cuentaNombre(mov.cuentaId)} />
                  ))}
                {!movimientosTesoreria.length && (
                  <p className="py-8 text-center text-pastel-muted">Sin movimientos de tesorería</p>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'cuentas' && (
          <section className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-edge-light p-4 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-pastel-ink dark:text-slate-100">Cuentas</h3>
                <p className="text-sm text-pastel-muted">Cajas, bancos y billeteras</p>
              </div>
              {canManage && (
                <button type="button" onClick={() => setShowCuentaModal(true)} className="btn-primary">
                  <Plus size={18} /> Nueva cuenta
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Nombre</th>
                    <th className="p-4 text-left">Tipo</th>
                    <th className="p-4 text-right">Saldo inicial</th>
                    <th className="p-4 text-right">Saldo actual</th>
                    <th className="p-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasTesoreria.map((cuenta) => (
                    <tr key={cuenta.id} className="table-row">
                      <td className="p-4 font-medium">{cuenta.nombre}</td>
                      <td className="p-4 text-pastel-muted">{getTipoCuentaLabel(cuenta.tipo)}</td>
                      <td className="p-4 text-right">{formatCurrency(cuenta.saldoInicial)}</td>
                      <td className="p-4 text-right font-bold">{formatCurrency(cuenta.saldoActual)}</td>
                      <td className="p-4 text-center">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateCuentaTesoreria(cuenta.id, { activa: cuenta.activa === false })
                            }
                            className={cuenta.activa === false ? 'badge-danger' : 'badge-success'}
                          >
                            {cuenta.activa === false ? 'Inactiva' : 'Activa'}
                          </button>
                        ) : (
                          <span className={cuenta.activa === false ? 'badge-danger' : 'badge-success'}>
                            {cuenta.activa === false ? 'Inactiva' : 'Activa'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'recibos' && (
          <DocumentosPendientesTable
            title="Facturas pendientes de cobro"
            rows={facturasPendientes}
            entidadLabel="Cliente"
            canOperate={canManage && cuentasActivas.length > 0}
            actionLabel="Cobrar"
            onAction={openRecibo}
          />
        )}

        {tab === 'ordenes_pago' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              {canManage && cuentasActivas.length > 0 && (
                <button
                  type="button"
                  onClick={openOrdenPagoMultiple}
                  disabled={!comprobantesPendientes.length}
                  className="btn-primary"
                >
                  <CreditCard size={18} /> Orden múltiple
                </button>
              )}
            </div>
            <DocumentosPendientesTable
              title="Comprobantes de proveedor pendientes"
              rows={comprobantesPendientes}
              entidadLabel="Proveedor"
              canOperate={canManage && cuentasActivas.length > 0}
              actionLabel="Pagar"
              onAction={openOrdenPago}
            />
          </div>
        )}

        {tab === 'movimientos' && (
          <section className="card overflow-hidden p-0">
            <div className="border-b border-edge-light p-4 dark:border-slate-800">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold text-pastel-ink dark:text-slate-100">
                    Movimientos de tesorería
                  </h3>
                  <p className="text-sm text-pastel-muted">Ingresos, egresos y ajustes</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setMovimientoForm({ ...emptyMovimientoForm, cuentaId: defaultCuentaId });
                        setShowMovimientoModal(true);
                      }}
                      className="btn-primary"
                    >
                      <Plus size={18} /> Movimiento
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={openBankImport}
                      disabled={!cuentasActivas.length}
                      className="btn-secondary"
                    >
                      <Upload size={18} className="text-sky-700 dark:text-indigo-400" /> Importar banco
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={exportMovimientosPDF}
                    disabled={!movimientosFiltrados.length}
                    className="btn-secondary"
                  >
                    <FileText size={18} className="text-red-500" /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={exportMovimientosExcel}
                    disabled={!movimientosFiltrados.length}
                    className="btn-secondary"
                  >
                    <Download size={18} className="text-emerald-500" /> Excel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar concepto..."
                    className="input-field pl-10"
                  />
                </div>
                <select
                  value={filterCuenta}
                  onChange={(e) => setFilterCuenta(e.target.value)}
                  className="select-field"
                >
                  <option value="">Todas las cuentas</option>
                  {cuentasTesoreria.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={18} />
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="select-field pl-10"
                  >
                    <option value="">Todos los tipos</option>
                    <option value="ingreso">Ingresos</option>
                    <option value="egreso">Egresos</option>
                  </select>
                </div>
                <select
                  value={filterConciliacion}
                  onChange={(e) => setFilterConciliacion(e.target.value)}
                  className="select-field"
                >
                  <option value="">Todos los estados</option>
                  <option value="pendientes">Pendientes de conciliar</option>
                  <option value="conciliados">Conciliados</option>
                  <option value="anulados">Anulados</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Fecha</th>
                    <th className="p-4 text-left">Cuenta</th>
                    <th className="p-4 text-left">Concepto</th>
                    <th className="p-4 text-left">Método</th>
                    <th className="p-4 text-center">Conciliado</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map((mov) => {
                    const pago = mov.pagoId ? pagos.find((p) => p.id === mov.pagoId) : null;
                    const puedeAnularPago =
                      canManage && pago && pago.estado !== 'anulado' && !mov.conciliado && !mov.anulado;
                    return (
                      <tr key={mov.id} className="table-row">
                        <td className="p-4 text-pastel-muted">{formatDate(mov.fecha)}</td>
                        <td className="p-4">{cuentaNombre(mov.cuentaId)}</td>
                        <td className="p-4">
                          <p>{mov.concepto}</p>
                          {mov.anulado && <p className="text-xs text-amber-600">Movimiento anulado</p>}
                        </td>
                        <td className="p-4 text-pastel-muted">{getMetodoPagoLabel(mov.metodoPago)}</td>
                        <td className="p-4 text-center">
                          <span className={mov.conciliado ? 'badge-success' : 'badge-warning'}>
                            {mov.conciliado ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td
                          className={`p-4 text-right font-bold ${
                            mov.anulado
                              ? 'text-pastel-muted line-through dark:text-slate-500'
                              : mov.tipo === 'ingreso'
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                          }`}
                        >
                          {mov.tipo === 'ingreso' ? '+' : '-'}
                          {formatCurrency(mov.monto)}
                        </td>
                        <td className="p-4 text-right">
                          {canManage && !mov.anulado && (
                            <button
                              type="button"
                              onClick={() => handleConciliacion(mov, !mov.conciliado)}
                              className={`rounded-lg p-2 ${
                                mov.conciliado
                                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                              }`}
                              title={mov.conciliado ? 'Desconciliar' : 'Conciliar'}
                            >
                              {mov.conciliado ? <XCircle size={18} /> : <CheckCircle size={18} />}
                            </button>
                          )}
                          {puedeAnularPago && (
                            <button
                              type="button"
                              onClick={() => openAnulacionPagoDesdeMovimiento(mov)}
                              className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                              title="Anular recibo/orden de pago"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!movimientosFiltrados.length && (
              <div className="py-12 text-center text-pastel-muted">Sin movimientos para mostrar</div>
            )}
          </section>
        )}
      </div>

      <TesoreriaModal
        isOpen={showCuentaModal}
        onClose={() => setShowCuentaModal(false)}
        title="Nueva cuenta de tesorería"
      >
        <form onSubmit={handleCuentaSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              value={cuentaForm.nombre}
              onChange={(e) => setCuentaForm({ ...cuentaForm, nombre: e.target.value })}
              className="input-field"
              placeholder="Caja Principal"
              required
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select
              value={cuentaForm.tipo}
              onChange={(e) => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}
              className="select-field"
            >
              {TIPOS_CUENTA_TESORERIA.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Saldo inicial</label>
            <input
              type="number"
              value={cuentaForm.saldoInicial}
              onChange={(e) => setCuentaForm({ ...cuentaForm, saldoInicial: e.target.value })}
              className="input-field"
              step="0.01"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Crear cuenta
          </button>
        </form>
      </TesoreriaModal>

      <TesoreriaModal
        isOpen={showMovimientoModal}
        onClose={() => setShowMovimientoModal(false)}
        title="Movimiento manual"
      >
        <form onSubmit={handleMovimientoSubmit} className="space-y-4">
          <MovimientoForm
            form={movimientoForm}
            setForm={setMovimientoForm}
            cuentas={cuentasActivas}
          />
          <button type="submit" className="btn-primary w-full">
            Registrar movimiento
          </button>
        </form>
      </TesoreriaModal>

      <TesoreriaModal
        isOpen={showBankImportModal}
        onClose={() => setShowBankImportModal(false)}
        title="Importación bancaria"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Cuenta bancaria</label>
            <select
              value={bankImportCuentaId}
              onChange={(e) => {
                setBankImportCuentaId(e.target.value);
                setBankImportRows([]);
              }}
              className="select-field"
            >
              <option value="">Seleccionar cuenta</option>
              {cuentasActivas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Archivo CSV/XLSX</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleBankFile}
              disabled={!bankImportCuentaId || bankImportLoading}
              className="input-field"
            />
            {bankImportFileName && (
              <p className="mt-1 text-xs text-pastel-muted">Archivo: {bankImportFileName}</p>
            )}
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-edge-light p-3 dark:border-slate-700">
            {bankImportRows.map((row) => {
              const movimiento = movimientosTesoreria.find((mov) => mov.id === row.suggestedMovimientoId);
              return (
                <label
                  key={row.rowHash}
                  className="grid cursor-pointer gap-2 rounded-lg bg-pastel-mist/60 p-3 text-sm dark:bg-slate-800 lg:grid-cols-[auto_1fr_120px]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(row.selected)}
                    disabled={!row.suggestedMovimientoId}
                    onChange={(e) =>
                      setBankImportRows((prev) =>
                        prev.map((item) =>
                          item.rowHash === row.rowHash ? { ...item, selected: e.target.checked } : item
                        )
                      )
                    }
                  />
                  <div>
                    <p className="font-medium">{row.descripcionBanco || row.referenciaBanco || 'Movimiento banco'}</p>
                    <p className="text-xs text-pastel-muted">
                      {formatDate(row.fechaBanco)} - Match: {movimiento?.concepto || 'Sin sugerencia'} ({row.score || 0})
                    </p>
                  </div>
                  <p className={row.tipo === 'ingreso' ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                    {row.tipo === 'ingreso' ? '+' : '-'}
                    {formatCurrency(row.monto)}
                  </p>
                </label>
              );
            })}
            {!bankImportRows.length && (
              <p className="py-8 text-center text-sm text-pastel-muted">
                Seleccioná un archivo para previsualizar sugerencias.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirmBankImport}
            disabled={!bankImportRows.some((row) => row.selected && row.suggestedMovimientoId)}
            className="btn-primary w-full"
          >
            Confirmar conciliación seleccionada
          </button>
        </div>
      </TesoreriaModal>

      <PagoModal
        title="Registrar recibo"
        target={reciboTarget}
        targetLabel={reciboTarget ? `${reciboTarget.numero} - ${reciboTarget.entidadNombre}` : ''}
        cuentas={cuentasActivas}
        form={pagoForm}
        setForm={setPagoForm}
        onClose={() => setReciboTarget(null)}
        onConfirm={handleRecibo}
        confirmLabel="Confirmar recibo"
      />

      <PagoModal
        title="Registrar orden de pago"
        target={ordenPagoTarget}
        targetLabel={ordenPagoTarget ? `${ordenPagoTarget.numero} - ${ordenPagoTarget.entidadNombre}` : ''}
        cuentas={cuentasActivas}
        form={pagoForm}
        setForm={setPagoForm}
        onClose={() => setOrdenPagoTarget(null)}
        onConfirm={handleOrdenPago}
        confirmLabel="Confirmar orden de pago"
      />

      <TesoreriaModal
        isOpen={showOrdenPagoMultipleModal}
        onClose={() => setShowOrdenPagoMultipleModal(false)}
        title="Orden de pago múltiple"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Proveedor</label>
            <select
              value={ordenPagoProveedorId}
              onChange={(e) => {
                setOrdenPagoProveedorId(e.target.value);
                setOrdenPagoImputaciones([]);
              }}
              className="select-field"
            >
              <option value="">Seleccionar proveedor</option>
              {proveedoresConPendientes.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Cuenta origen</label>
            <select
              value={pagoForm.cuentaTesoreriaId}
              onChange={(e) => setPagoForm({ ...pagoForm, cuentaTesoreriaId: e.target.value })}
              className="select-field"
              required
            >
              <option value="">Seleccionar cuenta</option>
              {cuentasActivas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} - {formatCurrency(cuenta.saldoActual)}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-edge-light p-3 dark:border-slate-700">
            {comprobantesOrdenPagoMultiple.map((comprobante) => {
              const imputacion = ordenPagoImputaciones.find(
                (item) => item.comprobanteProveedorId === comprobante.id
              );
              const monto = imputacion?.monto || '';
              return (
                <div key={comprobante.id} className="grid gap-2 rounded-lg bg-pastel-mist/60 p-3 dark:bg-slate-800 sm:grid-cols-[1fr_140px_auto] sm:items-center">
                  <div>
                    <p className="font-mono text-sm text-sky-700 dark:text-indigo-400">{comprobante.numero}</p>
                    <p className="text-xs text-pastel-muted">
                      Saldo {formatCurrency(comprobante.saldoPendiente)} - {formatDate(comprobante.fecha)}
                    </p>
                  </div>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => {
                      const value = Math.min(
                        Number(comprobante.saldoPendiente) || 0,
                        Math.max(0, Number(e.target.value) || 0)
                      );
                      setOrdenPagoImputaciones((prev) => {
                        const next = prev.filter((item) => item.comprobanteProveedorId !== comprobante.id);
                        return value > 0
                          ? [...next, { comprobanteProveedorId: comprobante.id, monto: value }]
                          : next;
                      });
                    }}
                    min="0"
                    max={comprobante.saldoPendiente}
                    step="0.01"
                    className="input-field"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setOrdenPagoImputaciones((prev) => [
                        ...prev.filter((item) => item.comprobanteProveedorId !== comprobante.id),
                        {
                          comprobanteProveedorId: comprobante.id,
                          monto: Number(comprobante.saldoPendiente) || 0,
                        },
                      ])
                    }
                    className="btn-secondary py-2 text-xs"
                  >
                    Saldo
                  </button>
                </div>
              );
            })}
            {!comprobantesOrdenPagoMultiple.length && (
              <p className="py-6 text-center text-sm text-pastel-muted">Sin comprobantes pendientes para este proveedor</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Método</label>
              <select
                value={pagoForm.metodoPago}
                onChange={(e) => setPagoForm({ ...pagoForm, metodoPago: e.target.value })}
                className="select-field"
              >
                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Total imputado</label>
              <div className="rounded-lg border border-edge-light bg-pastel-mist px-3 py-2 font-bold text-rose-600 dark:border-slate-700 dark:bg-slate-800">
                {formatCurrency(totalOrdenPagoMultiple)}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Observaciones</label>
            <textarea
              value={pagoForm.observaciones}
              onChange={(e) => setPagoForm({ ...pagoForm, observaciones: e.target.value })}
              className="input-field resize-none"
              rows={2}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-pastel-muted">
            <input
              type="checkbox"
              checked={pagoForm.conciliado}
              onChange={(e) => setPagoForm({ ...pagoForm, conciliado: e.target.checked })}
            />
            Marcar conciliado
          </label>

          <button
            type="button"
            onClick={handleOrdenPagoMultiple}
            disabled={!pagoForm.cuentaTesoreriaId || totalOrdenPagoMultiple <= 0}
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            <CreditCard size={18} />
            Confirmar orden múltiple
          </button>
        </div>
      </TesoreriaModal>

      <TesoreriaModal
        isOpen={Boolean(pagoAnulacionTarget)}
        onClose={() => setPagoAnulacionTarget(null)}
        title="Anular movimiento"
      >
        {pagoAnulacionTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <p>
                Se anulará {pagoAnulacionTarget.tipo === 'cliente' ? 'el recibo' : 'la orden de pago'}{' '}
                <strong>{pagoAnulacionTarget.numero}</strong>, revirtiendo cuenta corriente y tesorería.
              </p>
            </div>
            <div>
              <label className="label">Motivo</label>
              <textarea
                value={motivoAnulacionPago}
                onChange={(e) => setMotivoAnulacionPago(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Motivo de anulación"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPagoAnulacionTarget(null)}
                disabled={savingAnulacionPago}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnularPagoTesoreria}
                disabled={savingAnulacionPago}
                className="btn-danger"
              >
                {savingAnulacionPago ? 'Anulando...' : 'Anular y revertir'}
              </button>
            </div>
          </div>
        )}
      </TesoreriaModal>
    </Layout>
  );
}

function KpiCard({ title, value, tone }) {
  const color =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-pastel-ink dark:text-slate-100';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
      <p className="text-sm text-pastel-muted dark:text-slate-400">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </motion.div>
  );
}

function CuentaRow({ cuenta }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-edge-light bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Wallet size={20} />
        </div>
        <div>
          <p className="font-medium text-pastel-ink dark:text-slate-100">{cuenta.nombre}</p>
          <p className="text-xs text-pastel-muted">{getTipoCuentaLabel(cuenta.tipo)}</p>
        </div>
      </div>
      <p className="font-bold text-pastel-ink dark:text-slate-100">
        {formatCurrency(cuenta.saldoActual)}
      </p>
    </div>
  );
}

function MovimientoRow({ mov, cuentaNombre }) {
  const isIngreso = mov.tipo === 'ingreso';
  const Icon = isIngreso ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="flex items-center justify-between rounded-xl bg-pastel-mist/60 p-3 dark:bg-slate-800/60">
      <div className="flex items-center gap-3">
        <div
          className={`rounded-xl p-2 ${
            isIngreso ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}
        >
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-pastel-ink dark:text-slate-100">{mov.concepto}</p>
          <p className="text-xs text-pastel-muted">
            {cuentaNombre} - {formatDate(mov.fecha)}
          </p>
        </div>
      </div>
      <p className={`font-bold ${isIngreso ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isIngreso ? '+' : '-'}
        {formatCurrency(mov.monto)}
      </p>
    </div>
  );
}

function DocumentosPendientesTable({ title, rows, entidadLabel, canOperate, actionLabel, onAction }) {
  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b border-edge-light p-4 dark:border-slate-800">
        <h3 className="font-semibold text-pastel-ink dark:text-slate-100">{title}</h3>
        <p className="text-sm text-pastel-muted">
          {canOperate ? 'Seleccioná un comprobante para operar' : 'Creá una cuenta activa o revisá permisos'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="p-4 text-left">Número</th>
              <th className="p-4 text-left">{entidadLabel}</th>
              <th className="p-4 text-left">Fecha</th>
              <th className="p-4 text-right">Saldo</th>
              <th className="p-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="p-4 font-mono text-sky-700 dark:text-indigo-400">{row.numero}</td>
                <td className="p-4">{row.entidadNombre}</td>
                <td className="p-4 text-pastel-muted">{formatDate(row.fecha)}</td>
                <td className="p-4 text-right font-bold text-amber-600">
                  {formatCurrency(row.saldoPendiente)}
                </td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => onAction(row)}
                    disabled={!canOperate}
                    className="btn-primary py-1.5 text-xs"
                  >
                    {actionLabel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="py-12 text-center text-pastel-muted">Sin pendientes</div>}
    </section>
  );
}

function MovimientoForm({ form, setForm, cuentas }) {
  return (
    <>
      <div>
        <label className="label">Cuenta</label>
        <select
          value={form.cuentaId}
          onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}
          className="select-field"
          required
        >
          <option value="">Seleccionar cuenta</option>
          {cuentas.map((cuenta) => (
            <option key={cuenta.id} value={cuenta.id}>
              {cuenta.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="select-field"
          >
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </div>
        <div>
          <label className="label">Método</label>
          <select
            value={form.metodoPago}
            onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
            className="select-field"
          >
            {METODOS_PAGO.map((metodo) => (
              <option key={metodo.value} value={metodo.value}>
                {metodo.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Concepto</label>
        <input
          type="text"
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          className="input-field"
          required
        />
      </div>
      <div>
        <label className="label">Monto</label>
        <input
          type="number"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
          className="input-field"
          min="0.01"
          step="0.01"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-pastel-muted">
        <input
          type="checkbox"
          checked={form.conciliado}
          onChange={(e) => setForm({ ...form, conciliado: e.target.checked })}
        />
        Marcar conciliado
      </label>
    </>
  );
}

function PagoModal({ title, target, targetLabel, cuentas, form, setForm, onClose, onConfirm, confirmLabel }) {
  return (
    <TesoreriaModal isOpen={Boolean(target)} onClose={onClose} title={title}>
      {target && (
        <div className="space-y-4">
          <div className="rounded-xl border border-edge-light bg-pastel-mist p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-pastel-muted">{targetLabel}</p>
            <p className="text-xl font-bold text-amber-600">
              Saldo {formatCurrency(target.saldoPendiente)}
            </p>
          </div>
          <div>
            <label className="label">Cuenta destino/origen</label>
            <select
              value={form.cuentaTesoreriaId}
              onChange={(e) => setForm({ ...form, cuentaTesoreriaId: e.target.value })}
              className="select-field"
              required
            >
              <option value="">Seleccionar cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} - {formatCurrency(cuenta.saldoActual)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Monto</label>
              <input
                type="number"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className="input-field"
                min="0.01"
                max={target.saldoPendiente}
                step="0.01"
              />
            </div>
            <div>
              <label className="label">Método</label>
              <select
                value={form.metodoPago}
                onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
                className="select-field"
              >
                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="input-field resize-none"
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-pastel-muted">
            <input
              type="checkbox"
              checked={form.conciliado}
              onChange={(e) => setForm({ ...form, conciliado: e.target.checked })}
            />
            Marcar conciliado
          </label>
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              !form.cuentaTesoreriaId ||
              !form.monto ||
              Number(form.monto) <= 0 ||
              Number(form.monto) > (target.saldoPendiente || 0)
            }
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            <CreditCard size={18} />
            {confirmLabel}
          </button>
        </div>
      )}
    </TesoreriaModal>
  );
}
