import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, CheckCircle, XCircle, Truck, Download, FileText, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import PurchaseItemsModal from '../components/compras/PurchaseItemsModal';
import RecepcionModal from '../components/compras/RecepcionModal';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';

const estadoBadge = {
  pending: 'badge-warning',
  authorized: 'badge-info',
  partial: 'badge-warning',
  received: 'badge-success',
  cancelled: 'badge-danger',
};

const estadoLabel = {
  pending: 'Pendiente',
  authorized: 'Autorizada',
  partial: 'Recepción parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
};

export default function OrdenesCompra() {
  const {
    ordenesCompra,
    remitosCompra,
    comprobantesProveedor,
    proveedores,
    productos,
    addOrdenCompra,
    autorizarOrdenCompra,
    cancelarOrdenCompra,
    registrarRecepcionCompra,
  } = useData();
  const { can } = usePermissions();

  const [tab, setTab] = useState('ordenes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [recepcionTarget, setRecepcionTarget] = useState(null);

  const canCreate = can('purchases:create');
  const canAuthorize = can('purchases:authorize');
  const canReceive = can('purchases:receive');

  const ordenesRecepcion = ordenesCompra.filter((o) =>
    ['authorized', 'partial'].includes(o.estado)
  );

  const filteredOrdenes = ordenesCompra
    .filter((o) => {
      const proveedor = proveedores.find((p) => p.id === o.proveedorId);
      const matchSearch =
        o.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || o.estado === filtroEstado;
      const matchTab =
        tab === 'ordenes' ||
        (tab === 'recepcion' && ['authorized', 'partial'].includes(o.estado));
      return matchSearch && matchEstado && matchTab;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const handleCreate = async (payload) => {
    try {
      await addOrdenCompra(payload);
      toast.success('Orden de compra creada');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo crear la orden');
      throw error;
    }
  };

  const handleAutorizar = async (id) => {
    if (!confirm('¿Autorizar esta orden de compra?')) return;
    try {
      await autorizarOrdenCompra(id);
      toast.success('Orden autorizada');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo autorizar');
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar esta orden?')) return;
    try {
      await cancelarOrdenCompra(id);
      toast.success('Orden cancelada');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo cancelar');
    }
  };

  const handleRecepcion = async (lineas, observaciones) => {
    if (!recepcionTarget) return;
    try {
      const result = await registrarRecepcionCompra(recepcionTarget.id, lineas, observaciones);
      toast.success(
        `Recepción ${result.numeroRecepcion} registrada — remito ${result.numeroRemitoCompra}`
      );
      setRecepcionTarget(null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo registrar la recepción');
      throw error;
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Órdenes de Compra - CrowGest', 14, 15);
    const tableData = filteredOrdenes.map((o) => {
      const proveedor = proveedores.find((p) => p.id === o.proveedorId);
      return [
        o.numero,
        proveedor?.nombre || '-',
        new Date(o.fecha).toLocaleDateString('es-AR'),
        o.items?.length || 0,
        `$${(o.total || 0).toLocaleString()}`,
        estadoLabel[o.estado] || o.estado,
      ];
    });
    doc.autoTable({
      head: [['Número', 'Proveedor', 'Fecha', 'Ítems', 'Total', 'Estado']],
      body: tableData,
      startY: 25,
    });
    doc.save('ordenes_compra_crowgest.pdf');
    toast.success('PDF exportado');
  };

  const exportToExcel = () => {
    const rows = filteredOrdenes.map((o) => {
      const proveedor = proveedores.find((p) => p.id === o.proveedorId);
      return {
        Número: o.numero,
        Proveedor: proveedor?.nombre || '-',
        Fecha: new Date(o.fecha).toLocaleDateString('es-AR'),
        Ítems: o.items?.length || 0,
        Total: o.total,
        Estado: estadoLabel[o.estado] || o.estado,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OC');
    XLSX.writeFile(wb, 'ordenes_compra_crowgest.xlsx');
    toast.success('Excel exportado');
  };

  return (
    <Layout>
      <Header title="Compras" subtitle="Órdenes de compra y recepción de mercadería" />

      <div className="mx-6 mt-4 rounded-xl border border-sky-200/60 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
        Flujo: <strong>Alta OC</strong> → <strong>Autorización</strong> (requiere permiso) →{' '}
        <strong>Recepción</strong> (suma stock).
      </div>

      <div className="mx-6 mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Órdenes totales</p>
          <p className="text-2xl font-bold">{ordenesCompra.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Pendientes de autorizar</p>
          <p className="text-2xl font-bold text-amber-600">
            {ordenesCompra.filter((o) => o.estado === 'pending').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-pastel-muted dark:text-slate-400">Listas para recepción</p>
          <p className="text-2xl font-bold text-sky-700 dark:text-indigo-400">{ordenesRecepcion.length}</p>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-edge-light pb-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('ordenes')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === 'ordenes' ? 'bg-sky-600 text-white dark:bg-indigo-600' : 'text-pastel-muted'
            }`}
          >
            Todas las órdenes
          </button>
          <button
            type="button"
            onClick={() => setTab('recepcion')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === 'recepcion' ? 'bg-sky-600 text-white dark:bg-indigo-600' : 'text-pastel-muted'
            }`}
          >
            Recepción ({ordenesRecepcion.length})
          </button>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
              <input
                type="text"
                placeholder="Buscar por número o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            {tab === 'ordenes' && (
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="select-field max-w-[200px]"
              >
                <option value="todos">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="authorized">Autorizada</option>
                <option value="partial">Parcial</option>
                <option value="received">Recibida</option>
                <option value="cancelled">Cancelada</option>
              </select>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button type="button" onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
            {canCreate && (
              <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
                <Package size={18} /> Nueva OC
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
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-center">Ítems</th>
                  <th className="p-4 text-center">Recibido</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-left">Remitos / Comp.</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrdenes.map((orden, index) => {
                  const proveedor = proveedores.find((p) => p.id === orden.proveedorId);
                  const totalPedido = orden.items?.reduce((acc, i) => acc + i.cantidad, 0) || 0;
                  const totalRecibido =
                    orden.items?.reduce((acc, i) => acc + (i.cantidadRecibida || 0), 0) || 0;
                  const comprobantesOrden = comprobantesProveedor.filter(
                    (c) => c.ordenCompraId === orden.id
                  );
                  const remitosOrden = remitosCompra.filter((r) => r.ordenCompraId === orden.id);

                  return (
                    <motion.tr
                      key={orden.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4 font-mono text-sky-700 dark:text-indigo-400">{orden.numero}</td>
                      <td className="p-4">{proveedor?.nombre || '-'}</td>
                      <td className="p-4 text-pastel-muted">
                        {new Date(orden.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="p-4 text-center">{orden.items?.length || 0}</td>
                      <td className="p-4 text-center">
                        <span
                          className={
                            totalRecibido >= totalPedido && totalPedido > 0
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }
                        >
                          {totalRecibido}/{totalPedido}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">${(orden.total || 0).toLocaleString()}</td>
                      <td className="p-4">
                        {remitosOrden.length > 0 || comprobantesOrden.length > 0 ? (
                          <div className="space-y-1">
                            {remitosOrden.map((r) => (
                              <div key={r.id} className="text-xs">
                                <span className="font-mono text-sky-700 dark:text-indigo-400">{r.numero}</span>
                                <span className="ml-2 text-pastel-muted">
                                  prov. {r.numeroProveedor || '-'}
                                </span>
                              </div>
                            ))}
                            {comprobantesOrden.length > 0 && (
                              <div className="text-xs text-pastel-muted">
                                CP: {comprobantesOrden.map((c) => c.numero).join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-pastel-muted">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={estadoBadge[orden.estado] || 'badge-neutral'}>
                          {estadoLabel[orden.estado] || orden.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {orden.estado === 'pending' && canAuthorize && (
                            <button
                              type="button"
                              onClick={() => handleAutorizar(orden.id)}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                              title="Autorizar"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {orden.estado === 'pending' && canCreate && (
                            <button
                              type="button"
                              onClick={() => handleCancelar(orden.id)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Cancelar"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                          {['authorized', 'partial'].includes(orden.estado) && canReceive && (
                            <button
                              type="button"
                              onClick={() => setRecepcionTarget(orden)}
                              className="rounded-lg p-2 text-sky-700 hover:bg-sky-50 dark:hover:bg-indigo-900/30"
                              title="Registrar recepción"
                            >
                              <PackageCheck size={18} />
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

          {filteredOrdenes.length === 0 && (
            <div className="py-12 text-center">
              <Truck size={48} className="mx-auto mb-4 text-pastel-muted/40" />
              <p className="text-pastel-muted">
                {tab === 'recepcion'
                  ? 'No hay órdenes pendientes de recepción'
                  : 'No hay órdenes de compra registradas'}
              </p>
            </div>
          )}
        </div>
      </div>

      <PurchaseItemsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva Orden de Compra"
        submitLabel="Guardar OC"
        proveedores={proveedores}
        productos={productos}
        onSubmit={handleCreate}
      />

      <RecepcionModal
        isOpen={Boolean(recepcionTarget)}
        onClose={() => setRecepcionTarget(null)}
        orden={recepcionTarget}
        onSubmit={handleRecepcion}
      />
    </Layout>
  );
}
