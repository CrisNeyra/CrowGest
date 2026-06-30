import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Truck,
  Ban,
  PackageOpen,
  FileText,
  Download,
  X,
  Link2,
  Unlink,
  List,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PageShell from '../components/ui/PageShell';
import { useData } from '../context/DataContext';
import DesvincularRemitoModal from '../components/ventas/DesvincularRemitoModal';

const estadoBadge = {
  emitido: 'badge-success',
  anulado: 'badge-danger',
};

export default function Remitos() {
  const {
    remitos,
    pedidos,
    facturas,
    clientes,
    productos,
    emitirRemito,
    anularRemito,
    vincularFacturaARemito,
    desvincularFacturaDeRemito,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroLista, setFiltroLista] = useState('emitidos');
  const [processingId, setProcessingId] = useState(null);
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [selectedRemito, setSelectedRemito] = useState(null);
  const [selectedFacturaId, setSelectedFacturaId] = useState('');
  const [showVinculosModal, setShowVinculosModal] = useState(false);
  const [showDesvincularModal, setShowDesvincularModal] = useState(false);
  const [desvincularTarget, setDesvincularTarget] = useState(null);

  const pedidosSinRemito = useMemo(
    () =>
      pedidos
        .filter(
          (p) =>
            ['authorized', 'invoiced'].includes(p.estado) &&
            !p.remitoId &&
            !remitos.some((r) => r.pedidoId === p.id && r.estado === 'emitido')
        )
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
    [pedidos, remitos]
  );

  const remitosFiltrados = useMemo(() => {
    return remitos
      .filter((r) => {
        const cliente = clientes.find((c) => c.id === r.clienteId);
        const matchSearch =
          r.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.pedidoNumero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchEstado =
          filtroLista === 'todos' ||
          (filtroLista === 'emitidos' && r.estado === 'emitido') ||
          (filtroLista === 'anulados' && r.estado === 'anulado');
        return matchSearch && matchEstado;
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [remitos, clientes, searchTerm, filtroLista]);

  const handleEmitirDesdeModal = async () => {
    if (!selectedPedido) return;
    setProcessingId(selectedPedido);
    try {
      const result = await emitirRemito(selectedPedido, observaciones);
      toast.success(`Remito ${result.numero} emitido — stock descontado`);
      setShowEmitModal(false);
      setSelectedPedido('');
      setObservaciones('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo emitir el remito');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEmitirRapido = async (pedidoId) => {
    if (!confirm('¿Emitir remito y descontar stock?')) return;
    setProcessingId(pedidoId);
    try {
      const result = await emitirRemito(pedidoId);
      toast.success(`Remito ${result.numero} emitido`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo emitir el remito');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAnular = async (remitoId, numero) => {
    if (!confirm(`¿Anular el remito ${numero}? Se revertirá el stock.`)) return;
    setProcessingId(remitoId);
    try {
      await anularRemito(remitoId);
      toast.success('Remito anulado y stock restaurado');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo anular');
    } finally {
      setProcessingId(null);
    }
  };

  const facturasVinculables = useMemo(() => {
    if (!selectedRemito) return [];
    return facturas.filter(
      (f) =>
        f.clienteId === selectedRemito.clienteId &&
        f.remitoId !== selectedRemito.id &&
        f.estado !== 'pagada'
    );
  }, [selectedRemito, facturas]);

  const facturasDelRemito = useMemo(() => {
    if (!selectedRemito) return [];
    return facturas.filter((f) => selectedRemito.facturaIds?.includes(f.id));
  }, [selectedRemito, facturas]);

  const handleDesvincular = async (opciones) => {
    if (!desvincularTarget) return;
    try {
      await desvincularFacturaDeRemito(desvincularTarget.factura.id, opciones);
      toast.success('Desvinculación registrada');
      setShowDesvincularModal(false);
      setDesvincularTarget(null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo desvincular');
      throw error;
    }
  };

  const handleVincular = async () => {
    if (!selectedRemito || !selectedFacturaId) return;
    try {
      await vincularFacturaARemito(selectedFacturaId, selectedRemito.id);
      toast.success('Factura vinculada al remito');
      setShowVincularModal(false);
      setSelectedRemito(null);
      setSelectedFacturaId('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo vincular');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Remitos - CrowGest', 14, 15);
    const tableData = remitosFiltrados.map((r) => {
      const cliente = clientes.find((c) => c.id === r.clienteId);
      return [
        r.numero,
        r.pedidoNumero,
        cliente?.nombre || '-',
        new Date(r.fecha).toLocaleDateString('es-AR'),
        r.estado,
        `$${r.total.toLocaleString()}`,
      ];
    });
    doc.autoTable({
      head: [['Remito', 'Pedido', 'Cliente', 'Fecha', 'Estado', 'Total']],
      body: tableData,
      startY: 25,
    });
    doc.save('remitos_crowgest.pdf');
    toast.success('PDF exportado');
  };

  const exportToExcel = () => {
    const rows = remitosFiltrados.map((r) => {
      const cliente = clientes.find((c) => c.id === r.clienteId);
      return {
        Remito: r.numero,
        Pedido: r.pedidoNumero,
        Cliente: cliente?.nombre || '-',
        Fecha: new Date(r.fecha).toLocaleDateString('es-AR'),
        Estado: r.estado,
        Total: r.total,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remitos');
    XLSX.writeFile(wb, 'remitos_crowgest.xlsx');
    toast.success('Excel exportado');
  };

  const generarRemitoPDF = (remito) => {
    const cliente = clientes.find((c) => c.id === remito.clienteId);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('REMITO', 14, 20);
    doc.setFontSize(10);
    doc.text(`Nº: ${remito.numero}`, 14, 28);
    doc.text(`Pedido: ${remito.pedidoNumero}`, 14, 34);
    doc.text(`Fecha: ${new Date(remito.fecha).toLocaleDateString('es-AR')}`, 14, 40);
    doc.text(`Cliente: ${cliente?.nombre || '-'}`, 14, 46);

    const tableData = remito.items.map((item) => {
      const prod = productos.find((p) => p.id === item.productoId);
      return [
        prod?.nombre || 'Producto',
        item.cantidad.toString(),
        `$${item.precioUnitario.toLocaleString()}`,
        `$${item.subtotal.toLocaleString()}`,
      ];
    });
    doc.autoTable({
      head: [['Producto', 'Cant.', 'P. unit.', 'Subtotal']],
      body: tableData,
      startY: 54,
      headStyles: { fillColor: [2, 132, 199] },
    });
    doc.save(`Remito_${remito.numero}.pdf`);
    toast.success(`Remito ${remito.numero} descargado`);
  };

  return (
    <PageShell title="Remitos">
      <div className="space-y-8">
        <section>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">
                Pedidos pendientes de remito
              </h2>
              <p className="text-sm text-pastel-muted dark:text-slate-400">
                Pedidos autorizados o facturados sin entrega registrada ({pedidosSinRemito.length})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEmitModal(true)}
              disabled={pedidosSinRemito.length === 0}
              className="btn-primary"
            >
              <PackageOpen size={18} />
              Emitir remito
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Pedido</th>
                    <th className="p-4 text-left">Cliente</th>
                    <th className="p-4 text-left">Estado pedido</th>
                    <th className="p-4 text-center">Ítems</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosSinRemito.slice(0, 10).map((pedido) => {
                    const cliente = clientes.find((c) => c.id === pedido.clienteId);
                    const isProcessing = processingId === pedido.id;
                    return (
                      <tr key={pedido.id} className="table-row">
                        <td className="p-4 font-mono text-sky-700 dark:text-indigo-400">{pedido.numero}</td>
                        <td className="p-4 text-pastel-ink dark:text-slate-100">{cliente?.nombre || '-'}</td>
                        <td className="p-4">
                          <span className="badge-info capitalize">{pedido.estado}</span>
                        </td>
                        <td className="p-4 text-center text-pastel-muted">{pedido.items?.length || 0}</td>
                        <td className="p-4 text-right font-semibold">${pedido.total.toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleEmitirRapido(pedido.id)}
                            disabled={isProcessing}
                            className="btn-primary inline-flex items-center gap-2 py-2 text-sm"
                          >
                            {isProcessing ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                              <Truck size={16} />
                            )}
                            Emitir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pedidosSinRemito.length === 0 && (
              <p className="py-8 text-center text-sm text-pastel-muted dark:text-slate-500">
                No hay pedidos pendientes de remito.{' '}
                <Link to="/pedidos" className="text-sky-700 dark:text-indigo-400">
                  Ver pedidos
                </Link>
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
                <input
                  type="text"
                  placeholder="Buscar remitos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <select
                value={filtroLista}
                onChange={(e) => setFiltroLista(e.target.value)}
                className="select-field max-w-[160px]"
              >
                <option value="emitidos">Emitidos</option>
                <option value="anulados">Anulados</option>
                <option value="todos">Todos</option>
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
                    <th className="p-4 text-left">Pedido</th>
                    <th className="p-4 text-left">Cliente</th>
                    <th className="p-4 text-left">Fecha</th>
                    <th className="p-4 text-center">Facturas</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {remitosFiltrados.map((remito, index) => {
                    const cliente = clientes.find((c) => c.id === remito.clienteId);
                    const cantFacturas = remito.facturaIds?.length || 0;
                    const isProcessing = processingId === remito.id;
                    return (
                      <motion.tr
                        key={remito.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="table-row"
                      >
                        <td className="p-4 font-mono text-sky-700 dark:text-indigo-400">{remito.numero}</td>
                        <td className="p-4 font-mono text-sm text-pastel-muted">{remito.pedidoNumero}</td>
                        <td className="p-4 text-pastel-ink dark:text-slate-100">{cliente?.nombre || '-'}</td>
                        <td className="p-4 text-pastel-muted">
                          {new Date(remito.fecha).toLocaleDateString('es-AR')}
                        </td>
                        <td className="p-4 text-center text-pastel-muted">{cantFacturas}</td>
                        <td className="p-4 text-right font-semibold">${remito.total.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className={estadoBadge[remito.estado] || 'badge-neutral'}>
                            {remito.estado}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => generarRemitoPDF(remito)}
                              className="rounded-lg p-2 text-pastel-muted hover:bg-pastel-mist dark:hover:bg-slate-800"
                              title="Imprimir PDF"
                            >
                              <FileText size={18} />
                            </button>
                            {remito.estado === 'emitido' && (
                              <>
                                {(remito.facturaIds?.length || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRemito(remito);
                                      setShowVinculosModal(true);
                                    }}
                                    className="rounded-lg p-2 text-pastel-muted hover:bg-pastel-mist dark:hover:bg-slate-800"
                                    title="Ver vínculos"
                                  >
                                    <List size={18} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRemito(remito);
                                    setShowVincularModal(true);
                                  }}
                                  className="rounded-lg p-2 text-sky-700 hover:bg-sky-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                                  title="Vincular factura"
                                >
                                  <Link2 size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnular(remito.id, remito.numero)}
                                  disabled={isProcessing}
                                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                  title="Anular remito"
                                >
                                  <Ban size={18} />
                                </button>
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
            {remitosFiltrados.length === 0 && (
              <p className="py-12 text-center text-pastel-muted dark:text-slate-500">
                No hay remitos en esta vista
              </p>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showEmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowEmitModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">Emitir remito</h2>
                <button type="button" onClick={() => setShowEmitModal(false)} className="p-2 text-pastel-muted">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Pedido</label>
                  <select
                    value={selectedPedido}
                    onChange={(e) => setSelectedPedido(e.target.value)}
                    className="select-field"
                  >
                    <option value="">Seleccionar pedido</option>
                    {pedidosSinRemito.map((p) => {
                      const cliente = clientes.find((c) => c.id === p.clienteId);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.numero} — {cliente?.nombre} (${p.total.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="label">Observaciones (opcional)</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Transporte, bultos, etc."
                  />
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Al confirmar se descontará el stock de todos los ítems del pedido.
                </p>
                <button
                  type="button"
                  onClick={handleEmitirDesdeModal}
                  disabled={!selectedPedido || processingId}
                  className="btn-primary w-full"
                >
                  Confirmar emisión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showVinculosModal && selectedRemito && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowVinculosModal(false)}
          >
            <motion.div
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Vínculos — {selectedRemito.numero}</h2>
                <button type="button" onClick={() => setShowVinculosModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <ul className="space-y-2">
                {facturasDelRemito.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-edge-light p-3 dark:border-slate-700"
                  >
                    <div>
                      <p className="font-mono text-sm">{f.numero}</p>
                      <p className="text-xs text-pastel-muted">${f.total.toLocaleString()}</p>
                    </div>
                    {!f.bloqueado && (
                      <button
                        type="button"
                        onClick={() => {
                          setDesvincularTarget({ factura: f, remito: selectedRemito });
                          setShowVinculosModal(false);
                          setShowDesvincularModal(true);
                        }}
                        className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                        title="Desvincular"
                      >
                        <Unlink size={18} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {facturasDelRemito.length === 0 && (
                <p className="text-sm text-pastel-muted">Sin facturas vinculadas</p>
              )}
            </motion.div>
          </motion.div>
        )}

        {showVincularModal && selectedRemito && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowVincularModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">
                  Vincular factura a {selectedRemito.numero}
                </h2>
                <button type="button" onClick={() => setShowVincularModal(false)} className="p-2">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Factura</label>
                  <select
                    value={selectedFacturaId}
                    onChange={(e) => setSelectedFacturaId(e.target.value)}
                    className="select-field"
                  >
                    <option value="">Seleccionar factura</option>
                    {facturasVinculables.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.numero} — ${f.total.toLocaleString()} ({f.estado})
                      </option>
                    ))}
                  </select>
                </div>
                {facturasVinculables.length === 0 && (
                  <p className="text-sm text-pastel-muted">
                    No hay facturas del mismo cliente sin vincular. Creá una en{' '}
                    <Link to="/pedidos-a-facturar" className="text-sky-700 dark:text-indigo-400">
                      A Facturar
                    </Link>
                    .
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleVincular}
                  disabled={!selectedFacturaId}
                  className="btn-primary w-full"
                >
                  Vincular
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DesvincularRemitoModal
        isOpen={showDesvincularModal}
        onClose={() => {
          setShowDesvincularModal(false);
          setDesvincularTarget(null);
        }}
        factura={desvincularTarget?.factura}
        remito={desvincularTarget?.remito}
        onConfirm={handleDesvincular}
        puedeRevertirStock={
          desvincularTarget
            ? (desvincularTarget.remito.facturaIds?.length || 0) <= 1 &&
              !desvincularTarget.remito.stockRevertido
            : false
        }
      />
    </PageShell>
  );
}
