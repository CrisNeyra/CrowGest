import { Fragment, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CreditCard, ArrowUpRight, ArrowDownRight, Filter, FileText, Download, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';

const loadExportTools = async () => {
  const [{ jsPDF }, autoTableModule, XLSX] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('xlsx'),
  ]);
  return { jsPDF, autoTable: autoTableModule.default || autoTableModule.autoTable, XLSX };
};

export default function Pagos() {
  const { pagos, clientes, proveedores, facturas, comprobantesProveedor, anularPago } = useData();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [anulacionTarget, setAnulacionTarget] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [savingAnulacion, setSavingAnulacion] = useState(false);
  const [expandedPagoId, setExpandedPagoId] = useState(null);

  const canCancel = can('payments:create');

  const filteredPagos = pagos.filter(pago => {
    const matchSearch = pago.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !filterTipo || pago.tipo === filterTipo;
    return matchSearch && matchTipo;
  }).reverse();

  const totalCobrado = pagos
    .filter(p => p.estado !== 'anulado' && p.tipo === 'cliente')
    .reduce((total, p) => total + p.monto, 0);

  const totalPagado = pagos
    .filter(p => p.estado !== 'anulado' && p.tipo === 'proveedor')
    .reduce((total, p) => total + p.monto, 0);

  const handleAnularPago = async () => {
    if (!anulacionTarget) return;
    setSavingAnulacion(true);
    try {
      await anularPago(anulacionTarget.id, motivoAnulacion);
      toast.success(`${anulacionTarget.tipo === 'cliente' ? 'Recibo' : 'Orden de pago'} anulada`);
      setAnulacionTarget(null);
      setMotivoAnulacion('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo anular el pago');
    } finally {
      setSavingAnulacion(false);
    }
  };

  const exportToPDF = async () => {
    const { jsPDF, autoTable } = await loadExportTools();
    const doc = new jsPDF();
    doc.text('Reporte de Pagos - CrowGest', 14, 15);
    const tableData = filteredPagos.map(pago => {
      const esCliente = pago.tipo === 'cliente';
      const destinatario = esCliente
        ? clientes.find(c => c.id === pago.clienteId)
        : proveedores.find(p => p.id === pago.proveedorId);
      return [
        pago.numero,
        esCliente ? 'Cobro' : 'Pago',
        destinatario?.nombre || 'Eliminado',
        new Date(pago.fecha).toLocaleDateString(),
        `${esCliente ? '+' : '-'}$${pago.monto.toLocaleString()}`
      ];
    });
    autoTable(doc, {
      head: [['Número', 'Tipo', 'Destinatario', 'Fecha', 'Monto']],
      body: tableData,
      startY: 25,
    });
    doc.save('pagos_crowgest.pdf');
    toast.success('PDF exportado correctamente');
  };

  const exportToExcel = async () => {
    const { XLSX } = await loadExportTools();
    const dataToExport = filteredPagos.map(pago => {
      const esCliente = pago.tipo === 'cliente';
      const destinatario = esCliente
        ? clientes.find(c => c.id === pago.clienteId)
        : proveedores.find(p => p.id === pago.proveedorId);
      return {
        Número: pago.numero,
        Tipo: esCliente ? 'Cobro' : 'Pago',
        Destinatario: destinatario?.nombre || 'Eliminado',
        Fecha: new Date(pago.fecha).toLocaleDateString(),
        Monto: (esCliente ? 1 : -1) * pago.monto
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "pagos_crowgest.xlsx");
    toast.success('Excel exportado correctamente');
  };

  return (
    <Layout>
      <Header title="Pagos" subtitle="Historial de cobros y pagos" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-gradient-to-r from-emerald-500/5 to-emerald-600/10 border-emerald-200/60 dark:border-emerald-900/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-pastel-muted dark:text-slate-400">Total Cobrado (Clientes)</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${totalCobrado.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
                <ArrowDownRight size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card bg-gradient-to-r from-rose-500/5 to-rose-600/10 border-rose-200/60 dark:border-rose-900/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-pastel-muted dark:text-slate-400">Total Pagado (Proveedores)</p>
                <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                  ${totalPagado.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-rose-100 dark:bg-rose-500/20">
                <ArrowUpRight size={32} className="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Buscar pagos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="select-field pl-10 pr-8"
              >
                <option value="">Todos los tipos</option>
                <option value="cliente">Cobros (Clientes)</option>
                <option value="proveedor">Pagos (Proveedores)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">Número</th>
                  <th className="text-left p-4">Tipo</th>
                  <th className="text-left p-4">Destinatario</th>
                  <th className="text-left p-4">Referencia</th>
                  <th className="text-left p-4">Fecha</th>
                  <th className="text-center p-4">Estado</th>
                  <th className="text-right p-4">Monto</th>
                  <th className="text-right p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPagos.map((pago, index) => {
                  const esCliente = pago.tipo === 'cliente';
                  const destinatario = esCliente
                    ? clientes.find(c => c.id === pago.clienteId)
                    : proveedores.find(p => p.id === pago.proveedorId);
                  const factura = pago.facturaId ? facturas.find(f => f.id === pago.facturaId) : null;
                  const comprobanteProveedor = pago.comprobanteProveedorId
                    ? comprobantesProveedor.find(c => c.id === pago.comprobanteProveedorId)
                    : null;
                  const imputaciones = pago.imputaciones?.length
                    ? pago.imputaciones
                    : comprobanteProveedor
                      ? [{ comprobanteProveedorId: comprobanteProveedor.id, numeroComprobante: comprobanteProveedor.numero, monto: pago.monto }]
                      : factura
                        ? [{ facturaId: factura.id, numeroComprobante: factura.numero, monto: pago.monto }]
                        : [];

                  return (
                    <Fragment key={pago.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="font-mono text-sky-700 dark:text-indigo-400">{pago.numero}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {esCliente ? (
                            <>
                              <ArrowDownRight size={16} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="badge-success">Cobro</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={16} className="text-rose-600 dark:text-rose-400" />
                              <span className="badge-danger">Pago</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-pastel-ink dark:text-slate-100">{destinatario?.nombre || 'Eliminado'}</p>
                        <p className="text-xs text-pastel-muted dark:text-slate-400">
                          {esCliente ? 'Cliente' : 'Proveedor'}
                        </p>
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        <p>{factura ? factura.numero : comprobanteProveedor?.numero || '-'}</p>
                        {imputaciones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setExpandedPagoId(expandedPagoId === pago.id ? null : pago.id)}
                            className="mt-1 text-xs font-medium text-sky-700 hover:underline dark:text-indigo-400"
                          >
                            {expandedPagoId === pago.id ? 'Ocultar' : 'Ver'} {imputaciones.length} imputaciones
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {new Date(pago.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={pago.estado === 'anulado' ? 'badge-danger' : 'badge-success'}>
                          {pago.estado === 'anulado' ? 'Anulado' : 'Vigente'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-bold text-lg ${
                          pago.estado === 'anulado'
                            ? 'text-pastel-muted line-through dark:text-slate-500'
                            : esCliente
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {esCliente ? '+' : '-'}${pago.monto.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {canCancel && pago.estado !== 'anulado' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnulacionTarget(pago);
                              setMotivoAnulacion('');
                            }}
                            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                            title="Anular"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                    {expandedPagoId === pago.id && imputaciones.length > 0 && (
                      <tr className="bg-pastel-mist/50 dark:bg-slate-900/60">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="rounded-xl border border-edge-light bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800">
                            <p className="mb-2 text-sm font-semibold text-pastel-ink dark:text-slate-100">
                              Detalle de imputaciones
                            </p>
                            <div className="space-y-2">
                              {imputaciones.map((imputacion) => {
                                const comp = imputacion.comprobanteProveedorId
                                  ? comprobantesProveedor.find((c) => c.id === imputacion.comprobanteProveedorId)
                                  : null;
                                const fac = imputacion.facturaId
                                  ? facturas.find((f) => f.id === imputacion.facturaId)
                                  : null;
                                return (
                                  <div key={`${pago.id}-${imputacion.comprobanteProveedorId || imputacion.facturaId || imputacion.numeroComprobante}`} className="flex justify-between gap-4 text-sm">
                                    <span className="text-pastel-muted dark:text-slate-400">
                                      {comp?.numeroProveedor || comp?.numero || fac?.numero || imputacion.numeroComprobante || 'Comprobante'}
                                    </span>
                                    <span className="font-semibold text-pastel-ink dark:text-slate-100">
                                      ${(Number(imputacion.monto) || 0).toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPagos.length === 0 && (
            <div className="text-center py-12">
              <CreditCard size={48} className="mx-auto text-pastel-muted/40 mb-4 dark:text-slate-700" />
              <p className="text-pastel-muted dark:text-slate-500">No hay pagos registrados</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {anulacionTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setAnulacionTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <AlertTriangle size={22} className="text-amber-600" />
                  Anular {anulacionTarget.tipo === 'cliente' ? 'recibo' : 'orden de pago'} {anulacionTarget.numero}
                </h2>
                <button
                  type="button"
                  onClick={() => setAnulacionTarget(null)}
                  className="rounded-lg p-1 hover:bg-pastel-mist dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                La anulación revierte saldos del comprobante, cuenta corriente y tesorería. Si el movimiento de
                tesorería ya está conciliado, la operación será bloqueada.
              </div>

              <div className="mb-4">
                <label className="label">Motivo</label>
                <textarea
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Ej: carga duplicada o error de imputación"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAnulacionTarget(null)}
                  disabled={savingAnulacion}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAnularPago}
                  disabled={savingAnulacion}
                  className="btn-danger"
                >
                  {savingAnulacion ? 'Anulando...' : 'Anular y revertir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
