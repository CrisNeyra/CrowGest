import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, CreditCard, Download, Printer, Unlink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import DesvincularRemitoModal from './DesvincularRemitoModal';
import { etiquetaComprobante } from '../../utils/comprobantesFiscales';
import { loadExportTools } from '../../utils/exportTools';

export default function FacturasHistorialPanel({ onGoFiscal }) {
  const { facturas, clientes, productos, remitos, addPago, desvincularFacturaDeRemito } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showDesvincularModal, setShowDesvincularModal] = useState(false);
  const [desvincularTarget, setDesvincularTarget] = useState(null);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [pagoMonto, setPagoMonto] = useState('');

  const filteredFacturas = facturas
    .filter((factura) => {
      const cliente = clientes.find((c) => c.id === factura.clienteId);
      const matchSearch =
        factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = !filterEstado || factura.estado === filterEstado;
      return matchSearch && matchEstado;
    })
    .reverse();

  const handleDesvincular = async (opciones) => {
    if (!desvincularTarget) return;
    try {
      await desvincularFacturaDeRemito(desvincularTarget.factura.id, opciones);
      toast.success('Desvinculación registrada correctamente');
      setShowDesvincularModal(false);
      setDesvincularTarget(null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo desvincular');
      throw error;
    }
  };

  const handlePago = async () => {
    if (!selectedFactura || !pagoMonto) return;
    const monto = parseFloat(pagoMonto);
    if (monto <= 0 || monto > selectedFactura.saldoPendiente) return;
    try {
      await addPago({
        tipo: 'cliente',
        facturaId: selectedFactura.id,
        clienteId: selectedFactura.clienteId,
        monto,
        metodoPago: 'efectivo',
      });
      toast.success('Pago registrado correctamente');
      setShowPagoModal(false);
      setSelectedFactura(null);
      setPagoMonto('');
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al registrar el pago');
    }
  };

  const generateInvoicePDF = async (factura) => {
    const { jsPDF } = await loadExportTools();
    const cliente = clientes.find((c) => c.id === factura.clienteId);
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('FACTURA', 14, 22);
    doc.setFontSize(10);
    doc.text(`Nº: ${factura.numero}`, 14, 30);
    doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString()}`, 14, 35);
    doc.text(`Cliente: ${cliente?.nombre || 'Consumidor Final'}`, 14, 42);
    const tableData = factura.items.map((item) => [
      item.nombre || 'Producto',
      item.cantidad.toString(),
      `$${item.precioUnitario.toLocaleString()}`,
      `$${item.subtotal.toLocaleString()}`,
    ]);
    doc.autoTable({
      startY: 50,
      head: [['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
      body: tableData,
    });
    const finalY = doc.lastAutoTable.finalY || 50;
    doc.text(`Total: $${factura.total.toLocaleString()}`, 140, finalY + 15);
    doc.save(`Factura_${factura.numero}.pdf`);
    toast.success(`Factura ${factura.numero} descargada`);
  };

  const exportToPDF = async () => {
    const { jsPDF } = await loadExportTools();
    const doc = new jsPDF();
    doc.text('Reporte de Facturas - Gest Crow', 14, 15);
    const tableData = filteredFacturas.map((factura) => {
      const cliente = clientes.find((c) => c.id === factura.clienteId);
      return [
        factura.numero,
        cliente?.nombre || 'Desconocido',
        new Date(factura.fecha).toLocaleDateString(),
        `$${factura.total.toLocaleString()}`,
        factura.estado,
      ];
    });
    doc.autoTable({ head: [['Número', 'Cliente', 'Fecha', 'Total', 'Estado']], body: tableData, startY: 25 });
    doc.save('facturas_gestcrow.pdf');
    toast.success('Reporte PDF exportado');
  };

  const exportToExcel = async () => {
    const { XLSX } = await loadExportTools();
    const dataToExport = filteredFacturas.map((factura) => {
      const cliente = clientes.find((c) => c.id === factura.clienteId);
      return {
        Número: factura.numero,
        Cliente: cliente?.nombre || 'Desconocido',
        Fecha: new Date(factura.fecha).toLocaleDateString(),
        Total: factura.total,
        Estado: factura.estado,
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, 'facturas_gestcrow.xlsx');
    toast.success('Excel exportado');
  };

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted" size={20} />
            <input
              type="text"
              placeholder="Buscar facturas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="select-field w-auto"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
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
                <th className="p-4 text-left">Número</th>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Fecha</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-right">Saldo</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFacturas.map((factura, index) => {
                const cliente = clientes.find((c) => c.id === factura.clienteId);
                return (
                  <motion.tr
                    key={factura.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="table-row"
                  >
                    <td className="p-4">
                      <span className="font-mono text-amber-600 dark:text-amber-400">{factura.numero}</span>
                      {factura.cae && (
                        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                          {etiquetaComprobante(factura)}
                        </p>
                      )}
                    </td>
                    <td className="p-4">{cliente?.nombre || '-'}</td>
                    <td className="p-4 text-pastel-muted">
                      {new Date(factura.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td className="p-4 text-right font-medium">${factura.total.toLocaleString()}</td>
                    <td className="p-4 text-right">${factura.saldoPendiente.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className={
                        factura.estado === 'pagada' ? 'badge-success' :
                        factura.estado === 'parcial' ? 'badge-info' : 'badge-warning'
                      }>
                        {factura.estado}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => generateInvoicePDF(factura)} className="p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-indigo-900/30" title="PDF">
                          <Printer size={16} />
                        </button>
                        {!factura.cae && onGoFiscal && (
                          <button type="button" onClick={() => onGoFiscal(factura)} className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30" title="Emitir CAE">
                            <ShieldCheck size={16} />
                          </button>
                        )}
                        {factura.remitoId && !factura.bloqueado && (
                          <button
                            type="button"
                            onClick={() => {
                              const remito = remitos.find((r) => r.id === factura.remitoId);
                              setDesvincularTarget({ factura, remito });
                              setShowDesvincularModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30"
                            title="Desvincular remito"
                          >
                            <Unlink size={16} />
                          </button>
                        )}
                        {factura.estado !== 'pagada' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFactura(factura);
                              setPagoMonto(String(factura.saldoPendiente));
                              setShowPagoModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                            title="Registrar pago"
                          >
                            <CreditCard size={16} />
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
        {filteredFacturas.length === 0 && (
          <p className="py-12 text-center text-pastel-muted">No hay facturas registradas</p>
        )}
      </div>

      <AnimatePresence>
        {showPagoModal && selectedFactura && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowPagoModal(false)}>
            <motion.div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-xl font-bold">Registrar Pago — {selectedFactura.numero}</h2>
              <input type="number" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className="input-field mb-4" min="0.01" max={selectedFactura.saldoPendiente} step="0.01" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPagoModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="button" onClick={handlePago} className="btn-success flex-1">Confirmar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DesvincularRemitoModal
        isOpen={showDesvincularModal}
        onClose={() => { setShowDesvincularModal(false); setDesvincularTarget(null); }}
        factura={desvincularTarget?.factura}
        remito={desvincularTarget?.remito}
        onConfirm={handleDesvincular}
        puedeRevertirStock={
          desvincularTarget
            ? (desvincularTarget.remito?.facturaIds?.length || 0) <= 1 && !desvincularTarget.remito?.stockRevertido
            : false
        }
      />
    </>
  );
}
