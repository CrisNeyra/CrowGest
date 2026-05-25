import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Download, FileText, PackageCheck, RotateCcw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';

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

export default function RemitosCompra() {
  const { remitosCompra, proveedores, ordenesCompra, comprobantesProveedor, anularRemitoCompra } = useData();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('todos');
  const [anulacionTarget, setAnulacionTarget] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [savingAnulacion, setSavingAnulacion] = useState(false);

  const canReturn = can('purchases:return');

  const remitosFiltrados = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return remitosCompra
      .filter((remito) => {
        const proveedor = proveedores.find((p) => p.id === remito.proveedorId);
        const orden = ordenesCompra.find((o) => o.id === remito.ordenCompraId);
        const comprobante = comprobantesProveedor.find((c) => c.id === remito.comprobanteProveedorId);
        const matchProveedor = proveedorFiltro === 'todos' || remito.proveedorId === proveedorFiltro;
        const matchSearch =
          !normalizedSearch ||
          remito.numero?.toLowerCase().includes(normalizedSearch) ||
          remito.numeroProveedor?.toLowerCase().includes(normalizedSearch) ||
          proveedor?.nombre?.toLowerCase().includes(normalizedSearch) ||
          orden?.numero?.toLowerCase().includes(normalizedSearch) ||
          comprobante?.numero?.toLowerCase().includes(normalizedSearch);

        return matchProveedor && matchSearch;
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [comprobantesProveedor, ordenesCompra, proveedorFiltro, proveedores, remitosCompra, searchTerm]);

  const totalMonto = remitosFiltrados.reduce((acc, remito) => acc + (Number(remito.total) || 0), 0);
  const totalItems = remitosFiltrados.reduce(
    (acc, remito) => acc + (remito.items?.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0) || 0),
    0
  );

  const buildExportRows = () =>
    remitosFiltrados.map((remito) => {
      const proveedor = proveedores.find((p) => p.id === remito.proveedorId);
      const orden = ordenesCompra.find((o) => o.id === remito.ordenCompraId);
      const comprobante = comprobantesProveedor.find((c) => c.id === remito.comprobanteProveedorId);

      return {
        Remito: remito.numero,
        'Remito proveedor': remito.numeroProveedor || '-',
        Proveedor: proveedor?.nombre || remito.proveedorNombre || '-',
        Fecha: formatDate(remito.fechaProveedor || remito.fecha),
        OC: orden?.numero || remito.ordenCompraNumero || '-',
        Comprobante: comprobante?.numero || remito.comprobanteProveedorNumero || '-',
        Items: remito.items?.length || 0,
        Total: Number(remito.total) || 0,
      };
    });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Remitos de Compra - CrowGest', 14, 15);
    doc.autoTable({
      head: [['Remito', 'Proveedor', 'Fecha', 'OC', 'Comp.', 'Total']],
      body: buildExportRows().map((row) => [
        row.Remito,
        row.Proveedor,
        row.Fecha,
        row.OC,
        row.Comprobante,
        formatCurrency(row.Total),
      ]),
      startY: 25,
    });
    doc.save('remitos_compra_crowgest.pdf');
    toast.success('PDF exportado');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(buildExportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remitos compra');
    XLSX.writeFile(wb, 'remitos_compra_crowgest.xlsx');
    toast.success('Excel exportado');
  };

  const openAnulacion = (remito) => {
    setAnulacionTarget(remito);
    setMotivoAnulacion('');
  };

  const closeAnulacion = () => {
    if (savingAnulacion) return;
    setAnulacionTarget(null);
    setMotivoAnulacion('');
  };

  const handleAnular = async () => {
    if (!anulacionTarget) return;
    setSavingAnulacion(true);
    try {
      await anularRemitoCompra(anulacionTarget.id, motivoAnulacion);
      toast.success(`Remito ${anulacionTarget.numero} anulado y stock revertido`);
      setAnulacionTarget(null);
      setMotivoAnulacion('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo anular el remito de compra');
    } finally {
      setSavingAnulacion(false);
    }
  };

  return (
    <Layout>
      <Header title="Remitos de compra" subtitle="Recepciones de proveedores vinculadas a OC y comprobantes" />

      <div className="mx-6 mt-4 rounded-xl border border-sky-200/60 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
        Los remitos se generan al registrar una recepción desde <strong>Compras</strong>. Cada remito conserva el
        número interno, el número del proveedor y el comprobante proveedor asociado.
      </div>

      <div className="mx-6 mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Remitos registrados</p>
          <p className="text-2xl font-bold">{remitosCompra.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Unidades recibidas</p>
          <p className="text-2xl font-bold text-sky-700 dark:text-indigo-400">{totalItems}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Total filtrado</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalMonto)}</p>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
              <input
                type="text"
                placeholder="Buscar por remito, proveedor, OC o comprobante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={proveedorFiltro}
              onChange={(e) => setProveedorFiltro(e.target.value)}
              className="select-field max-w-[240px]"
            >
              <option value="todos">Todos los proveedores</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button type="button" onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Remito</th>
                  <th className="p-4 text-left">Proveedor</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">OC</th>
                  <th className="p-4 text-left">Comprobante</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Ítems</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {remitosFiltrados.map((remito, index) => {
                  const proveedor = proveedores.find((p) => p.id === remito.proveedorId);
                  const orden = ordenesCompra.find((o) => o.id === remito.ordenCompraId);
                  const comprobante = comprobantesProveedor.find((c) => c.id === remito.comprobanteProveedorId);

                  return (
                    <motion.tr
                      key={remito.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <p className="font-mono text-sky-700 dark:text-indigo-400">{remito.numero}</p>
                        <p className="text-xs text-pastel-muted">Prov. {remito.numeroProveedor || '-'}</p>
                      </td>
                      <td className="p-4">{proveedor?.nombre || remito.proveedorNombre || '-'}</td>
                      <td className="p-4 text-pastel-muted">
                        {formatDate(remito.fechaProveedor || remito.fecha)}
                      </td>
                      <td className="p-4 font-mono text-sm">{orden?.numero || remito.ordenCompraNumero || '-'}</td>
                      <td className="p-4">
                        <span className="font-mono text-sm">
                          {comprobante?.numero || remito.comprobanteProveedorNumero || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={remito.estado === 'anulado' ? 'badge-danger' : 'badge-success'}>
                          {remito.estado === 'anulado' ? 'Anulado' : 'Registrado'}
                        </span>
                      </td>
                      <td className="p-4 text-center">{remito.items?.length || 0}</td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(remito.total)}</td>
                      <td className="p-4">
                        <div className="flex justify-end">
                          {canReturn && remito.estado !== 'anulado' && (
                            <button
                              type="button"
                              onClick={() => openAnulacion(remito)}
                              className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                              title="Anular / devolver remito"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {remitosFiltrados.length === 0 && (
            <div className="py-12 text-center">
              <PackageCheck size={48} className="mx-auto mb-4 text-pastel-muted/40" />
              <p className="text-pastel-muted">
                {remitosCompra.length === 0
                  ? 'Todavía no hay remitos de compra registrados'
                  : 'No hay remitos que coincidan con los filtros'}
              </p>
              <p className="mt-2 text-sm text-pastel-muted">
                Registrá una recepción desde Compras para generar el remito.
              </p>
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
            onClick={closeAnulacion}
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
                  Anular remito {anulacionTarget.numero}
                </h2>
                <button type="button" onClick={closeAnulacion} className="rounded-lg p-1 hover:bg-pastel-mist dark:hover:bg-slate-800">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                Esta acción revierte el stock recibido, anula el comprobante proveedor asociado y descuenta la deuda
                del proveedor. Si el comprobante ya tiene pagos aplicados, la operación será bloqueada.
              </div>

              <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-pastel-muted">Proveedor</p>
                  <p className="font-medium">
                    {proveedores.find((p) => p.id === anulacionTarget.proveedorId)?.nombre ||
                      anulacionTarget.proveedorNombre ||
                      '-'}
                  </p>
                </div>
                <div>
                  <p className="text-pastel-muted">Total a revertir</p>
                  <p className="font-semibold">{formatCurrency(anulacionTarget.total)}</p>
                </div>
              </div>

              <div className="mb-5">
                <label className="label">Motivo</label>
                <textarea
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Ej: devolución al proveedor por mercadería mal cargada"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeAnulacion} disabled={savingAnulacion} className="btn-secondary">
                  Cancelar
                </button>
                <button type="button" onClick={handleAnular} disabled={savingAnulacion} className="btn-danger">
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
