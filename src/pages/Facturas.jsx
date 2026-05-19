import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileText, Eye, CreditCard, X, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

  export default function Facturas() {
  const { facturas, clientes, ventas, productos, addFactura, addPago } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [selectedVenta, setSelectedVenta] = useState('');
  const [pagoMonto, setPagoMonto] = useState('');

  const ventasSinFactura = ventas.filter(v => 
    !facturas.some(f => f.ventaId === v.id)
  );

  const filteredFacturas = facturas.filter(factura => {
    const cliente = clientes.find(c => c.id === factura.clienteId);
    const matchSearch = factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = !filterEstado || factura.estado === filterEstado;
    return matchSearch && matchEstado;
  }).reverse();

  const handleCrearFactura = async () => {
    if (!selectedVenta) return;
    
    const venta = ventas.find(v => v.id === selectedVenta);
    if (!venta) return;

    try {
      await addFactura({
        ventaId: venta.id,
        clienteId: venta.clienteId,
        items: venta.items,
        total: venta.total
      });
      toast.success('Factura creada correctamente');
      setShowModal(false);
      setSelectedVenta('');
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al crear la factura');
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
        monto: monto,
        metodoPago: 'efectivo'
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

  const generateInvoicePDF = (factura) => {
    const cliente = clientes.find(c => c.id === factura.clienteId);
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(12, 39, 66); // pastel-ink
    doc.text('FACTURA', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(58, 83, 112); // pastel-muted
    doc.text(`Nº: ${factura.numero}`, 14, 30);
    doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString()}`, 14, 35);
    doc.text(`Estado: ${factura.estado.toUpperCase()}`, 14, 40);

    // Cliente info
    doc.setFontSize(12);
    doc.setTextColor(12, 39, 66);
    doc.text('Datos del Cliente:', 14, 50);
    
    doc.setFontSize(10);
    doc.setTextColor(58, 83, 112);
    doc.text(`Nombre: ${cliente?.nombre || 'Consumidor Final'}`, 14, 57);
    doc.text(`Email: ${cliente?.email || 'N/A'}`, 14, 62);
    doc.text(`Teléfono: ${cliente?.telefono || 'N/A'}`, 14, 67);
    doc.text(`Dirección: ${cliente?.direccion || 'N/A'}`, 14, 72);

    // Items table
    const tableData = factura.items.map(item => {
      const prod = productos?.find(p => p.id === item.productoId);
      return [
        prod?.nombre || 'Producto Eliminado',
        item.cantidad.toString(),
        `$${item.precioUnitario.toLocaleString()}`,
        `$${item.subtotal.toLocaleString()}`
      ];
    });

    doc.autoTable({
      startY: 80,
      head: [['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] } // sky-600
    });

    const finalY = doc.lastAutoTable.finalY || 80;
    
    doc.setFontSize(12);
    doc.setTextColor(12, 39, 66);
    doc.text(`Total: $${factura.total.toLocaleString()}`, 140, finalY + 15);
    doc.text(`Saldo Pendiente: $${factura.saldoPendiente.toLocaleString()}`, 140, finalY + 22);

    doc.save(`Factura_${factura.numero}.pdf`);
    toast.success(`Factura ${factura.numero} descargada`);
  };
    const doc = new jsPDF();
    doc.text('Reporte de Facturas - CrowGest', 14, 15);
    
    const tableData = filteredFacturas.map(factura => {
      const cliente = clientes.find(c => c.id === factura.clienteId);
      return [
        factura.numero,
        cliente?.nombre || 'Desconocido',
        new Date(factura.fecha).toLocaleDateString(),
        `$${factura.total.toLocaleString()}`,
        `$${factura.saldoPendiente.toLocaleString()}`,
        factura.estado
      ];
    });

    doc.autoTable({
      head: [['Número', 'Cliente', 'Fecha', 'Total', 'Saldo Pendiente', 'Estado']],
      body: tableData,
      startY: 25,
    });

    doc.save('facturas_crowgest.pdf');
    toast.success('PDF exportado correctamente');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Reporte de Facturas - CrowGest', 14, 15);
    
    const tableData = filteredFacturas.map(factura => {
      const cliente = clientes.find(c => c.id === factura.clienteId);
      return [
        factura.numero,
        cliente?.nombre || 'Desconocido',
        new Date(factura.fecha).toLocaleDateString(),
        `$${factura.total.toLocaleString()}`,
        `$${factura.saldoPendiente.toLocaleString()}`,
        factura.estado
      ];
    });

    doc.autoTable({
      head: [['Número', 'Cliente', 'Fecha', 'Total', 'Saldo Pendiente', 'Estado']],
      body: tableData,
      startY: 25,
    });

    doc.save('facturas_crowgest.pdf');
    toast.success('PDF exportado correctamente');
  };

  const exportToExcel = () => {
    const dataToExport = filteredFacturas.map(factura => {
      const cliente = clientes.find(c => c.id === factura.clienteId);
      return {
        Número: factura.numero,
        Cliente: cliente?.nombre || 'Desconocido',
        Fecha: new Date(factura.fecha).toLocaleDateString(),
        Total: factura.total,
        'Saldo Pendiente': factura.saldoPendiente,
        Estado: factura.estado
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");
    XLSX.writeFile(wb, "facturas_crowgest.xlsx");
    toast.success('Excel exportado correctamente');
  };

  return (
    <Layout moduleClass="module-facturas">
      <Header title="Facturas" subtitle="Gestión de facturación" />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
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
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 rounded-xl border border-edge-light bg-white/70 px-4 py-2 text-sm font-medium text-pastel-ink transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <FileText size={18} className="text-red-500" />
              PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 rounded-xl border border-edge-light bg-white/70 px-4 py-2 text-sm font-medium text-pastel-ink transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <Download size={18} className="text-emerald-500" />
              Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              disabled={ventasSinFactura.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Plus size={18} />
              Nueva Factura
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">Número</th>
                  <th className="text-left p-4">Cliente</th>
                  <th className="text-left p-4">Fecha</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-right p-4">Saldo Pendiente</th>
                  <th className="text-center p-4">Estado</th>
                  <th className="text-center p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacturas.map((factura, index) => {
                  const cliente = clientes.find(c => c.id === factura.clienteId);
                  return (
                    <motion.tr
                      key={factura.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="text-amber-400 font-mono">{factura.numero}</span>
                      </td>
                      <td className="p-4">
                        <p className="text-white">{cliente?.nombre || 'Cliente eliminado'}</p>
                      </td>
                      <td className="p-4 text-zinc-400">
                        {new Date(factura.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-right text-white font-medium">
                        ${factura.total.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <span className={factura.saldoPendiente > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                          ${factura.saldoPendiente.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`badge ${
                          factura.estado === 'pagada' ? 'badge-success' :
                          factura.estado === 'parcial' ? 'badge-info' : 'badge-warning'
                        }`}>
                          {factura.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => generateInvoicePDF(factura)}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-sky-400 transition-colors"
                            title="Descargar Factura PDF"
                          >
                            <Printer size={16} />
                          </button>
                          {factura.estado !== 'pagada' && (
                            <button
                              onClick={() => {
                                setSelectedFactura(factura);
                                setPagoMonto(factura.saldoPendiente.toString());
                                setShowPagoModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
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
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500">No hay facturas registradas</p>
            </div>
          )}
        </div>

        {/* Modal Nueva Factura */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Nueva Factura</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Seleccionar Venta</label>
                    <select
                      value={selectedVenta}
                      onChange={(e) => setSelectedVenta(e.target.value)}
                      className="select-field"
                    >
                      <option value="">Seleccionar venta sin facturar</option>
                      {ventasSinFactura.map(venta => {
                        const cliente = clientes.find(c => c.id === venta.clienteId);
                        return (
                          <option key={venta.id} value={venta.id}>
                            {venta.numero} - {cliente?.nombre} - ${venta.total.toLocaleString()}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedVenta && (
                    <div className="bg-zinc-800 rounded-lg p-4">
                      {(() => {
                        const venta = ventas.find(v => v.id === selectedVenta);
                        const cliente = clientes.find(c => c.id === venta?.clienteId);
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Venta:</span>
                              <span className="text-white">{venta?.numero}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Cliente:</span>
                              <span className="text-white">{cliente?.nombre}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Items:</span>
                              <span className="text-white">{venta?.items.length} producto(s)</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-zinc-700">
                              <span className="text-zinc-400 font-medium">Total:</span>
                              <span className="text-amber-400 font-bold">${venta?.total.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCrearFactura}
                      disabled={!selectedVenta}
                      className="btn-warning flex-1 disabled:opacity-50"
                    >
                      Crear Factura
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Registrar Pago */}
        <AnimatePresence>
          {showPagoModal && selectedFactura && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowPagoModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Registrar Pago</h2>
                  <button
                    onClick={() => setShowPagoModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Factura:</span>
                        <span className="text-amber-400">{selectedFactura.numero}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Total:</span>
                        <span className="text-white">${selectedFactura.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-zinc-700">
                        <span className="text-zinc-400 font-medium">Saldo Pendiente:</span>
                        <span className="text-amber-400 font-bold">${selectedFactura.saldoPendiente.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Monto a Pagar</label>
                    <input
                      type="number"
                      value={pagoMonto}
                      onChange={(e) => setPagoMonto(e.target.value)}
                      className="input-field"
                      min="0.01"
                      max={selectedFactura.saldoPendiente}
                      step="0.01"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowPagoModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePago}
                      disabled={!pagoMonto || parseFloat(pagoMonto) <= 0 || parseFloat(pagoMonto) > selectedFactura.saldoPendiente}
                      className="btn-success flex-1 disabled:opacity-50"
                    >
                      Confirmar Pago
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
