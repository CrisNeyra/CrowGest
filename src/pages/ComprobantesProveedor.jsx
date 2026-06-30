import { Fragment, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Download, Edit, FileText, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '../components/ui/PageShell';
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

const TIPOS_COMPROBANTE_PROVEEDOR = [
  { id: 'factura_a', label: 'Factura A' },
  { id: 'factura_b', label: 'Factura B' },
  { id: 'factura_c', label: 'Factura C' },
  { id: 'nota_credito', label: 'Nota de crédito' },
  { id: 'nota_debito', label: 'Nota de débito' },
  { id: 'remito_compra', label: 'Remito de compra' },
  { id: 'otro', label: 'Otro' },
];

const ESTADO_BADGE = {
  pendiente: 'badge-warning',
  parcial: 'badge-info',
  pagado: 'badge-success',
  aplicada: 'badge-success',
  anulado: 'badge-danger',
};

const emptyForm = {
  proveedorId: '',
  tipo: 'factura_a',
  numeroProveedor: '',
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: '',
  total: '',
  comprobanteOrigenId: '',
  imputaciones: [],
  observaciones: '',
};

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-AR');
};

const tipoLabel = (tipo) =>
  TIPOS_COMPROBANTE_PROVEEDOR.find((t) => t.id === tipo)?.label || tipo || 'Comprobante';

export default function ComprobantesProveedor() {
  const {
    comprobantesProveedor,
    proveedores,
    addComprobanteProveedor,
    updateComprobanteProveedor,
    anularComprobanteProveedor,
  } = useData();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingComprobante, setEditingComprobante] = useState(null);
  const [anulacionTarget, setAnulacionTarget] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedComprobanteId, setExpandedComprobanteId] = useState(null);

  const canManage = can('purchases:create');

  const comprobantesFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return comprobantesProveedor
      .filter((comprobante) => {
        const proveedor = proveedores.find((p) => p.id === comprobante.proveedorId);
        const matchProveedor = proveedorFiltro === 'todos' || comprobante.proveedorId === proveedorFiltro;
        const matchEstado = estadoFiltro === 'todos' || comprobante.estado === estadoFiltro;
        const matchSearch =
          !term ||
          comprobante.numero?.toLowerCase().includes(term) ||
          comprobante.numeroProveedor?.toLowerCase().includes(term) ||
          comprobante.ordenCompraNumero?.toLowerCase().includes(term) ||
          comprobante.remitoCompraNumero?.toLowerCase().includes(term) ||
          proveedor?.nombre?.toLowerCase().includes(term);

        return matchProveedor && matchEstado && matchSearch;
      })
      .sort((a, b) => new Date(b.fecha || b.fechaEmision) - new Date(a.fecha || a.fechaEmision));
  }, [comprobantesProveedor, estadoFiltro, proveedorFiltro, proveedores, searchTerm]);

  const pendientes = comprobantesProveedor.filter(
    (comprobante) => comprobante.estado !== 'anulado' && (Number(comprobante.saldoPendiente) || 0) > 0
  );
  const totalPendiente = pendientes.reduce((acc, comprobante) => acc + (Number(comprobante.saldoPendiente) || 0), 0);
  const totalAnulado = comprobantesProveedor
    .filter((comprobante) => comprobante.estado === 'anulado')
    .reduce((acc, comprobante) => acc + (Number(comprobante.total) || 0), 0);

  const comprobantesOrigen = useMemo(() => {
    if (!form.proveedorId) return [];
    return comprobantesProveedor
      .filter(
        (comprobante) =>
          comprobante.proveedorId === form.proveedorId &&
          comprobante.estado !== 'anulado' &&
          comprobante.tipo !== 'nota_credito' &&
          (Number(comprobante.saldoPendiente) || 0) > 0
      )
      .sort((a, b) => new Date(a.fecha || a.fechaEmision) - new Date(b.fecha || b.fechaEmision));
  }, [comprobantesProveedor, form.proveedorId]);
  const totalNotaCreditoForm = form.imputaciones.reduce((acc, imp) => acc + (Number(imp.monto) || 0), 0);

  const buildRows = () =>
    comprobantesFiltrados.map((comprobante) => {
      const proveedor = proveedores.find((p) => p.id === comprobante.proveedorId);
      return {
        Número: comprobante.numero,
        'N° proveedor': comprobante.numeroProveedor || '-',
        Tipo: tipoLabel(comprobante.tipo),
        Proveedor: proveedor?.nombre || comprobante.proveedorNombre || '-',
        Fecha: formatDate(comprobante.fechaEmision || comprobante.fecha),
        Vencimiento: formatDate(comprobante.fechaVencimiento),
        Estado: comprobante.estado || '-',
        Total: Number(comprobante.total) || 0,
        Pendiente: Number(comprobante.saldoPendiente) || 0,
      };
    });

  const openCreate = () => {
    setEditingComprobante(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (comprobante) => {
    setEditingComprobante(comprobante);
    setForm({
      proveedorId: comprobante.proveedorId || '',
      tipo: comprobante.tipo || 'factura_a',
      numeroProveedor: comprobante.numeroProveedor || '',
      fechaEmision: (comprobante.fechaEmision || comprobante.fecha || '').slice(0, 10),
      fechaVencimiento: (comprobante.fechaVencimiento || '').slice(0, 10),
      total: String(comprobante.total || ''),
      comprobanteOrigenId: comprobante.comprobanteOrigenId || '',
      imputaciones: comprobante.imputaciones || [],
      observaciones: comprobante.observaciones || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingComprobante(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingComprobante) {
        await updateComprobanteProveedor(editingComprobante.id, form);
        toast.success('Comprobante actualizado');
      } else {
        if (form.tipo === 'nota_credito' && !form.imputaciones?.length) {
          toast.error('Imputá la nota de crédito al menos a un comprobante');
          return;
        }
        const totalNc = form.tipo === 'nota_credito' ? totalNotaCreditoForm : Number(form.total);
        await addComprobanteProveedor({
          ...form,
          fecha: form.fechaEmision ? new Date(`${form.fechaEmision}T00:00:00`).toISOString() : new Date().toISOString(),
          total: totalNc,
        });
        toast.success('Comprobante proveedor registrado');
      }
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo guardar el comprobante');
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!anulacionTarget) return;
    setSaving(true);
    try {
      await anularComprobanteProveedor(anulacionTarget.id, motivoAnulacion);
      toast.success('Comprobante anulado');
      setAnulacionTarget(null);
      setMotivoAnulacion('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo anular');
    } finally {
      setSaving(false);
    }
  };

  const exportToPDF = async () => {
    const { jsPDF, autoTable } = await loadExportTools();
    const doc = new jsPDF();
    doc.text('Comprobantes de Proveedor - CrowGest', 14, 15);
    autoTable(doc, {
      head: [['Número', 'Proveedor', 'Tipo', 'Fecha', 'Estado', 'Total', 'Pendiente']],
      body: buildRows().map((row) => [
        row.Número,
        row.Proveedor,
        row.Tipo,
        row.Fecha,
        row.Estado,
        formatCurrency(row.Total),
        formatCurrency(row.Pendiente),
      ]),
      startY: 25,
    });
    doc.save('comprobantes_proveedor_crowgest.pdf');
    toast.success('PDF exportado');
  };

  const exportToExcel = async () => {
    const { XLSX } = await loadExportTools();
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comprobantes proveedor');
    XLSX.writeFile(wb, 'comprobantes_proveedor_crowgest.xlsx');
    toast.success('Excel exportado');
  };

  return (
    <PageShell title="Comprobantes proveedor">
      <div className="mx-6 mt-4 rounded-xl border border-sky-200/60 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
        Los comprobantes creados desde una recepción pueden completarse con datos fiscales. Para anular uno que viene
        de remito, usá <strong>Rem. Compra</strong> para revertir stock correctamente.
      </div>

      <div className="mx-6 mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Comprobantes</p>
          <p className="text-2xl font-bold">{comprobantesProveedor.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Pendiente de pago</p>
          <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalPendiente)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Anulado</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalAnulado)}</p>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
              <input
                type="text"
                placeholder="Buscar por número, proveedor, OC o remito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select value={proveedorFiltro} onChange={(e) => setProveedorFiltro(e.target.value)} className="select-field max-w-[220px]">
              <option value="todos">Todos los proveedores</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="select-field max-w-[190px]">
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
              <option value="aplicada">Aplicada</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button type="button" onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
            {canManage && (
              <button type="button" onClick={openCreate} className="btn-primary">
                <Plus size={18} /> Nuevo
              </button>
            )}
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Número</th>
                  <th className="p-4 text-left">Proveedor</th>
                  <th className="p-4 text-left">Tipo</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Pendiente</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {comprobantesFiltrados.map((comprobante, index) => {
                  const proveedor = proveedores.find((p) => p.id === comprobante.proveedorId);
                  const imputaciones = comprobante.imputaciones || [];
                  const canAnular =
                    canManage &&
                    comprobante.estado !== 'anulado' &&
                    !comprobante.remitoCompraId &&
                    !(comprobante.pagos || []).length;

                  return (
                    <Fragment key={comprobante.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <p className="font-mono text-sky-700 dark:text-indigo-400">{comprobante.numero}</p>
                        <p className="text-xs text-pastel-muted">Prov. {comprobante.numeroProveedor || '-'}</p>
                        {imputaciones.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedComprobanteId(
                                expandedComprobanteId === comprobante.id ? null : comprobante.id
                              )
                            }
                            className="mt-1 text-xs font-medium text-sky-700 hover:underline dark:text-indigo-400"
                          >
                            {expandedComprobanteId === comprobante.id ? 'Ocultar' : 'Ver'} imputaciones
                          </button>
                        )}
                      </td>
                      <td className="p-4">{proveedor?.nombre || comprobante.proveedorNombre || '-'}</td>
                      <td className="p-4">{tipoLabel(comprobante.tipo)}</td>
                      <td className="p-4 text-pastel-muted">{formatDate(comprobante.fechaEmision || comprobante.fecha)}</td>
                      <td className="p-4 text-center">
                        <span className={ESTADO_BADGE[comprobante.estado] || 'badge-neutral'}>
                          {comprobante.estado || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(comprobante.total)}</td>
                      <td className="p-4 text-right">{formatCurrency(comprobante.saldoPendiente)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {canManage && comprobante.estado !== 'anulado' && (
                            <button
                              type="button"
                              onClick={() => openEdit(comprobante)}
                              className="rounded-lg p-2 text-sky-700 hover:bg-sky-50 dark:hover:bg-indigo-900/30"
                              title="Completar datos"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {canAnular && (
                            <button
                              type="button"
                              onClick={() => {
                                setAnulacionTarget(comprobante);
                                setMotivoAnulacion('');
                              }}
                              className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                              title="Anular comprobante"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                    {expandedComprobanteId === comprobante.id && imputaciones.length > 0 && (
                      <tr className="bg-pastel-mist/50 dark:bg-slate-900/60">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="rounded-xl border border-edge-light bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800">
                            <p className="mb-2 text-sm font-semibold text-pastel-ink dark:text-slate-100">
                              Imputaciones aplicadas
                            </p>
                            <div className="space-y-2">
                              {imputaciones.map((imputacion) => {
                                const origen = comprobantesProveedor.find(
                                  (c) => c.id === imputacion.comprobanteProveedorId
                                );
                                return (
                                  <div
                                    key={`${comprobante.id}-${imputacion.comprobanteProveedorId}`}
                                    className="flex justify-between gap-4 text-sm"
                                  >
                                    <span className="text-pastel-muted dark:text-slate-400">
                                      {origen?.numeroProveedor || origen?.numero || imputacion.numeroComprobante}
                                    </span>
                                    <span className="font-semibold text-pastel-ink dark:text-slate-100">
                                      {formatCurrency(imputacion.monto)}
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

          {comprobantesFiltrados.length === 0 && (
            <div className="py-12 text-center">
              <FileText size={48} className="mx-auto mb-4 text-pastel-muted/40" />
              <p className="text-pastel-muted">No hay comprobantes que coincidan con los filtros</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
            <motion.div
              className="modal-content max-h-[90vh] max-w-2xl overflow-y-auto p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingComprobante ? 'Completar comprobante' : 'Nuevo comprobante proveedor'}
                </h2>
                <button type="button" onClick={closeModal} className="rounded-lg p-1 hover:bg-pastel-mist dark:hover:bg-slate-800">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Proveedor</label>
                    <select
                      value={form.proveedorId}
                      onChange={(e) => setForm({ ...form, proveedorId: e.target.value, comprobanteOrigenId: '', imputaciones: [] })}
                      className="select-field"
                      disabled={Boolean(editingComprobante)}
                      required
                    >
                      <option value="">Seleccionar proveedor</option>
                      {proveedores.map((proveedor) => (
                        <option key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value, comprobanteOrigenId: '', imputaciones: [] })}
                      className="select-field"
                    >
                      {TIPOS_COMPROBANTE_PROVEEDOR.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.tipo === 'nota_credito' && !editingComprobante && (
                  <div>
                    <label className="label">Imputaciones de la nota de crédito</label>
                    <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border border-edge-light p-3 dark:border-slate-700">
                      {comprobantesOrigen.map((comprobante) => {
                        const imputacion = form.imputaciones.find(
                          (imp) => imp.comprobanteProveedorId === comprobante.id
                        );
                        const monto = imputacion?.monto || '';
                        return (
                          <div key={comprobante.id} className="grid gap-2 rounded-lg bg-pastel-mist/60 p-3 dark:bg-slate-800 sm:grid-cols-[1fr_140px_auto] sm:items-center">
                            <div>
                              <p className="font-mono text-sm text-sky-700 dark:text-indigo-400">
                                {comprobante.numeroProveedor || comprobante.numero}
                              </p>
                              <p className="text-xs text-pastel-muted">
                                Saldo {formatCurrency(comprobante.saldoPendiente)}
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
                                setForm((prev) => {
                                  const next = prev.imputaciones.filter(
                                    (imp) => imp.comprobanteProveedorId !== comprobante.id
                                  );
                                  return {
                                    ...prev,
                                    imputaciones:
                                      value > 0
                                        ? [...next, { comprobanteProveedorId: comprobante.id, monto: value }]
                                        : next,
                                  };
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
                                setForm((prev) => ({
                                  ...prev,
                            total: String(
                              [
                                ...prev.imputaciones.filter(
                                  (imp) => imp.comprobanteProveedorId !== comprobante.id
                                ),
                                {
                                  comprobanteProveedorId: comprobante.id,
                                  monto: Number(comprobante.saldoPendiente) || 0,
                                },
                              ].reduce((acc, imp) => acc + (Number(imp.monto) || 0), 0)
                            ),
                                  imputaciones: [
                                    ...prev.imputaciones.filter(
                                      (imp) => imp.comprobanteProveedorId !== comprobante.id
                                    ),
                                    {
                                      comprobanteProveedorId: comprobante.id,
                                      monto: Number(comprobante.saldoPendiente) || 0,
                                    },
                                  ],
                                }))
                              }
                              className="btn-secondary py-2 text-xs"
                            >
                              Saldo
                            </button>
                          </div>
                        );
                      })}
                      {!comprobantesOrigen.length && (
                        <p className="py-6 text-center text-sm text-pastel-muted">
                          No hay comprobantes pendientes para este proveedor.
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-emerald-600">
                      Total NC: {formatCurrency(totalNotaCreditoForm)}
                    </p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="label">N° proveedor</label>
                    <input
                      type="text"
                      value={form.numeroProveedor}
                      onChange={(e) => setForm({ ...form, numeroProveedor: e.target.value })}
                      className="input-field"
                      placeholder="0001-00001234"
                    />
                  </div>
                  <div>
                    <label className="label">Fecha emisión</label>
                    <input
                      type="date"
                      value={form.fechaEmision}
                      onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Fecha vencimiento</label>
                    <input
                      type="date"
                      value={form.fechaVencimiento}
                      onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Total</label>
                  <input
                    type="number"
                    value={form.tipo === 'nota_credito' ? totalNotaCreditoForm : form.total}
                    onChange={(e) => setForm({ ...form, total: e.target.value })}
                    className="input-field"
                    min="0.01"
                    step="0.01"
                    disabled={Boolean(editingComprobante) || form.tipo === 'nota_credito'}
                    required
                  />
                  {form.tipo === 'nota_credito' && (
                    <p className="mt-1 text-xs text-pastel-muted">
                      El total se calcula desde las imputaciones seleccionadas.
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Observaciones</label>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeModal} disabled={saving} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Guardando...' : editingComprobante ? 'Guardar cambios' : 'Registrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {anulacionTarget && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAnulacionTarget(null)}
          >
            <motion.div
              className="modal-content max-w-lg p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle size={22} className="text-amber-600" />
                <h2 className="text-lg font-bold">Anular comprobante</h2>
              </div>
              <p className="mb-4 text-sm text-pastel-muted">
                Se descontará el saldo pendiente del proveedor. No se puede anular si tiene pagos aplicados.
              </p>
              <label className="label">Motivo</label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                className="input-field mb-5 resize-none"
                placeholder="Motivo de anulación"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setAnulacionTarget(null)} disabled={saving} className="btn-secondary">
                  Cancelar
                </button>
                <button type="button" onClick={handleAnular} disabled={saving} className="btn-danger">
                  {saving ? 'Anulando...' : 'Anular'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
