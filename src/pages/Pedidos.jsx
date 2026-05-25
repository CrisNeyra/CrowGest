import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, FileText, Download, Package, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import DocumentItemsModal from '../components/ventas/DocumentItemsModal';
import { useData } from '../context/DataContext';
import { usePermissions } from '../context/PermissionsContext';

const estadoBadge = {
  pending: 'badge-warning',
  authorized: 'badge-success',
  cancelled: 'badge-danger',
  invoiced: 'badge-info',
};

const estadoLabel = {
  pending: 'Pendiente',
  authorized: 'Autorizado',
  cancelled: 'Cancelado',
  invoiced: 'Facturado',
};

export default function Pedidos() {
  const {
    pedidos,
    clientes,
    productos,
    vendedores,
    condicionesVenta,
    bonificaciones,
    addPedido,
    autorizarPedido,
    cancelarPedido,
  } = useData();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showModal, setShowModal] = useState(false);

  const filtered = pedidos
    .filter((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId);
      const matchSearch =
        p.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.presupuestoNumero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
      return matchSearch && matchEstado;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const handleCreate = async (payload) => {
    try {
      await addPedido(payload);
      toast.success('Pedido creado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo crear el pedido');
      throw error;
    }
  };

  const handleAutorizar = async (id) => {
    if (!confirm('¿Autorizar este pedido?')) return;
    try {
      await autorizarPedido(id);
      toast.success('Pedido autorizado');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo autorizar');
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar este pedido?')) return;
    try {
      await cancelarPedido(id);
      toast.success('Pedido cancelado');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo cancelar');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Pedidos - CrowGest', 14, 15);
    const tableData = filtered.map((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId);
      return [
        p.numero,
        p.presupuestoNumero || '-',
        cliente?.nombre || '-',
        p.vendedorNombre || '-',
        p.condicionVentaNombre || '-',
        new Date(p.fecha).toLocaleDateString('es-AR'),
        p.items.length.toString(),
        `$${p.total.toLocaleString()}`,
        estadoLabel[p.estado] || p.estado,
      ];
    });
    doc.autoTable({
      head: [['Número', 'Presupuesto', 'Cliente', 'Vendedor', 'Condición', 'Fecha', 'Ítems', 'Total', 'Estado']],
      body: tableData,
      startY: 25,
    });
    doc.save('pedidos_crowgest.pdf');
    toast.success('PDF exportado');
  };

  const exportToExcel = () => {
    const rows = filtered.map((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId);
      return {
        Número: p.numero,
        Presupuesto: p.presupuestoNumero || '-',
        Cliente: cliente?.nombre || '-',
        Vendedor: p.vendedorNombre || '-',
        Condición: p.condicionVentaNombre || '-',
        Fecha: new Date(p.fecha).toLocaleDateString('es-AR'),
        Ítems: p.items.length,
        Total: p.total,
        Estado: estadoLabel[p.estado] || p.estado,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, 'pedidos_crowgest.xlsx');
    toast.success('Excel exportado');
  };

  return (
    <Layout>
      <Header
        title="Pedidos"
        subtitle="Órdenes de venta — autorización requerida antes de facturar"
      />

      {!can('orders:authorize') && (
        <p className="mx-6 mt-4 rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Tu rol no incluye autorización de pedidos. Contactá a un supervisor o administrador.
        </p>
      )}

      <div className="p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="select-field max-w-[180px]"
            >
              <option value="todos">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="authorized">Autorizado</option>
              <option value="cancelled">Cancelado</option>
              <option value="invoiced">Facturado</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button type="button" onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={18} /> Nuevo Pedido
            </button>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Número</th>
                  <th className="p-4 text-left">Presupuesto</th>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-left">Vendedor</th>
                  <th className="p-4 text-left">Condición</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Remito</th>
                  <th className="p-4 text-center">Ítems</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pedido, index) => {
                  const cliente = clientes.find((c) => c.id === pedido.clienteId);
                  return (
                    <motion.tr
                      key={pedido.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="font-mono text-sky-700 dark:text-indigo-400">{pedido.numero}</span>
                      </td>
                      <td className="p-4 font-mono text-sm text-pastel-muted dark:text-slate-400">
                        {pedido.presupuestoNumero || '-'}
                      </td>
                      <td className="p-4 text-pastel-ink dark:text-slate-100">{cliente?.nombre || '-'}</td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {pedido.vendedorNombre || '-'}
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {pedido.condicionVentaNombre || '-'}
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {new Date(pedido.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="p-4 font-mono text-xs text-pastel-muted dark:text-slate-400">
                        {pedido.remitoNumero || '-'}
                      </td>
                      <td className="p-4 text-center text-pastel-muted dark:text-slate-400">
                        {pedido.items?.length || 0}
                      </td>
                      <td className="p-4 text-right font-semibold text-pastel-ink dark:text-slate-100">
                        ${pedido.total.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className={estadoBadge[pedido.estado] || 'badge-neutral'}>
                          {estadoLabel[pedido.estado] || pedido.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {pedido.estado === 'pending' && (can('orders:authorize') || can('orders:cancel')) && (
                            <>
                              {can('orders:authorize') && (
                              <button
                                type="button"
                                onClick={() => handleAutorizar(pedido.id)}
                                className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                title="Autorizar pedido"
                              >
                                <CheckCircle size={18} />
                              </button>
                              )}
                              {can('orders:cancel') && (
                              <button
                                type="button"
                                onClick={() => handleCancelar(pedido.id)}
                                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                title="Cancelar"
                              >
                                <XCircle size={18} />
                              </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Package size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
              <p className="text-pastel-muted dark:text-slate-500">No hay pedidos registrados</p>
            </div>
          )}
        </div>
      </div>

      <DocumentItemsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nuevo Pedido"
        submitLabel="Guardar Pedido"
        clientes={clientes}
        productos={productos}
        vendedores={vendedores}
        condicionesVenta={condicionesVenta}
        bonificaciones={bonificaciones}
        onSubmit={handleCreate}
      />
    </Layout>
  );
}
