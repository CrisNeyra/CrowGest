import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, Download, ClipboardList, Ban, ArrowRightCircle } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PageShell from '../components/ui/PageShell';
import FilterBar from '../components/ui/FilterBar';
import DocumentItemsModal from '../components/ventas/DocumentItemsModal';
import { useData } from '../context/DataContext';

const estadoBadge = {
  vigente: 'badge-success',
  convertido: 'badge-info',
  anulado: 'badge-danger',
};

const estadoLabel = {
  vigente: 'Vigente',
  convertido: 'Convertido',
  anulado: 'Anulado',
};

export default function Presupuestos() {
  const {
    presupuestos,
    clientes,
    productos,
    vendedores,
    condicionesVenta,
    bonificaciones,
    addPresupuesto,
    anularPresupuesto,
    convertirPresupuestoAPedido,
  } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showModal, setShowModal] = useState(false);

  const filtered = presupuestos
    .filter((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId);
      const matchSearch =
        p.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
      return matchSearch && matchEstado;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const handleCreate = async (payload) => {
    try {
      await addPresupuesto(payload);
      toast.success('Presupuesto creado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo crear el presupuesto');
      throw error;
    }
  };

  const handleConvertir = async (id) => {
    if (!confirm('¿Convertir este presupuesto en pedido?')) return;
    try {
      await convertirPresupuestoAPedido(id);
      toast.success('Pedido generado desde el presupuesto');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo convertir el presupuesto');
    }
  };

  const handleAnular = async (id) => {
    if (!confirm('¿Anular este presupuesto?')) return;
    try {
      await anularPresupuesto(id);
      toast.success('Presupuesto anulado');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo anular');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Presupuestos - CrowGest', 14, 15);
    const tableData = filtered.map((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId);
      return [
        p.numero,
        cliente?.nombre || '-',
        p.vendedorNombre || '-',
        p.condicionVentaNombre || '-',
        new Date(p.fecha).toLocaleDateString('es-AR'),
        new Date(p.validezHasta).toLocaleDateString('es-AR'),
        p.items.length.toString(),
        `$${p.total.toLocaleString()}`,
        estadoLabel[p.estado] || p.estado,
      ];
    });
    doc.autoTable({
      head: [['Número', 'Cliente', 'Vendedor', 'Condición', 'Fecha', 'Válido hasta', 'Ítems', 'Total', 'Estado']],
      body: tableData,
      startY: 25,
    });
    doc.save('presupuestos_crowgest.pdf');
    toast.success('PDF exportado');
  };

  const exportToExcel = () => {
    const rows = filtered.map((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId);
      return {
        Número: p.numero,
        Cliente: cliente?.nombre || '-',
        Vendedor: p.vendedorNombre || '-',
        Condición: p.condicionVentaNombre || '-',
        Fecha: new Date(p.fecha).toLocaleDateString('es-AR'),
        'Válido hasta': new Date(p.validezHasta).toLocaleDateString('es-AR'),
        Ítems: p.items.length,
        Total: p.total,
        Estado: estadoLabel[p.estado] || p.estado,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuestos');
    XLSX.writeFile(wb, 'presupuestos_crowgest.xlsx');
    toast.success('Excel exportado');
  };

  return (
    <PageShell
      title="Presupuestos"
      actions={
        <>
          <button type="button" onClick={exportToPDF} className="btn-secondary">
            <FileText size={18} className="text-red-500" /> PDF
          </button>
          <button type="button" onClick={exportToExcel} className="btn-secondary">
            <Download size={18} className="text-emerald-500" /> Excel
          </button>
        </>
      }
    >
      <FilterBar onNew={() => setShowModal(true)} newLabel="Nuevo">
        <FilterBar.Group label="Buscar por" className="sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-muted" size={18} />
            <input
              type="text"
              placeholder="Número o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </FilterBar.Group>
        <FilterBar.Group label="Estado" className="sm:max-w-[200px]">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="select-field"
          >
            <option value="todos">Todos los estados</option>
            <option value="vigente">Vigente</option>
            <option value="convertido">Convertido</option>
            <option value="anulado">Anulado</option>
          </select>
        </FilterBar.Group>
      </FilterBar>

      <div>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Número</th>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-left">Vendedor</th>
                  <th className="p-4 text-left">Condición</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Válido hasta</th>
                  <th className="p-4 text-center">Ítems</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((presupuesto, index) => {
                  const cliente = clientes.find((c) => c.id === presupuesto.clienteId);
                  return (
                    <motion.tr
                      key={presupuesto.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="font-mono text-sky-700 dark:text-indigo-400">{presupuesto.numero}</span>
                      </td>
                      <td className="p-4 text-pastel-ink dark:text-slate-100">{cliente?.nombre || '-'}</td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {presupuesto.vendedorNombre || '-'}
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {presupuesto.condicionVentaNombre || '-'}
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {new Date(presupuesto.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {presupuesto.validezHasta
                          ? new Date(presupuesto.validezHasta).toLocaleDateString('es-AR')
                          : '-'}
                      </td>
                      <td className="p-4 text-center text-pastel-muted dark:text-slate-400">
                        {presupuesto.items?.length || 0}
                      </td>
                      <td className="p-4 text-right font-semibold text-pastel-ink dark:text-slate-100">
                        ${presupuesto.total.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className={estadoBadge[presupuesto.estado] || 'badge-neutral'}>
                          {estadoLabel[presupuesto.estado] || presupuesto.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {presupuesto.estado === 'vigente' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleConvertir(presupuesto.id)}
                                className="rounded-lg p-2 text-sky-700 transition-colors hover:bg-sky-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                                title="Convertir a pedido"
                              >
                                <ArrowRightCircle size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnular(presupuesto.id)}
                                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                title="Anular"
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

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <ClipboardList size={48} className="mx-auto mb-4 text-pastel-muted/40 dark:text-slate-700" />
              <p className="text-pastel-muted dark:text-slate-500">No hay presupuestos registrados</p>
            </div>
          )}
        </div>
      </div>

      <DocumentItemsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nuevo Presupuesto"
        submitLabel="Guardar Presupuesto"
        clientes={clientes}
        productos={productos}
        vendedores={vendedores}
        condicionesVenta={condicionesVenta}
        bonificaciones={bonificaciones}
        onSubmit={handleCreate}
      />
    </PageShell>
  );
}
