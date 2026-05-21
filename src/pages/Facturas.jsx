import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileText, CreditCard, X, Download, Printer } from 'lucide-react';
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

  const ventasSinFactura = ventas.filter(v => !facturas.some(f => f.ventaId === v.id));

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

    doc.setFontSize(20);
    doc.setTextColor(12, 39, 66);
    doc.text('FACTURA', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(58, 83, 112);
    doc.text(`Nº: ${factura.numero}`, 14, 30);
    doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString()}`, 14, 35);
    doc.text(`Estado: ${factura.estado.toUpperCase()}`, 14, 40);

    doc.setFontSize(12);
    doc.setTextColor(12, 39, 66);
    doc.text('Datos del Cliente:', 14, 50);

    doc.setFontSize(10);
    doc.setTextColor(58, 83, 112);
    doc.text(`Nombre: ${cliente?.nombre || 'Consumidor Final'}`, 14, 57);
    doc.text(`Email: ${cliente?.email || 'N/A'}`, 14, 62);
    doc.text(`Teléfono: ${cliente?.telefono || 'N/A'}`, 14, 67);
    doc.text(`Dirección: ${cliente?.direccion || 'N/A'}`, 14, 72);

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
      headStyles: { fillColor: [2, 132, 199] }
    });

    const finalY = doc.lastAutoTable.finalY || 80;
    doc.setFontSize(12);
    doc.setTextColor(12, 39, 66);
    doc.text(`Total: $${factura.total.toLocaleString()}`, 140, finalY + 15);
    doc.text(`Saldo Pendiente: $${factura.saldoPendiente.toLocaleString()}`, 140, finalY + 22);

    doc.save(`Factura_${factura.numero}.pdf`);
    toast.success(`Factura ${factura.numero} descargada`);
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
    toast.success('Reporte PDF exportado correctamente');
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
    <Layout>
      <Header title="Facturas" subtitle="Gestión de facturación" />

      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
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
            <button onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              disabled={ventasSinFactura.length === 0}
              className="btn-warning"
            >
              <Plus size={18} /> Nueva Factura
            </button>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
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
                        <span className="font-mono text-amber-600 dark:text-amber-400">{factura.numero}</span>
                      </td>
                      <td className="p-4 text-pastel-ink dark:text-slate-100">{cliente?.nombre || 'Cliente eliminado'}</td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {new Date(factura.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-right font-medium text-pastel-ink dark:text-slate-100">
                        ${factura.total.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <span className={factura.saldoPendiente > 0
                          ? 'text-amber-600 dark:text-amber-400 font-semibold'
                          : 'text-emerald-600 dark:text-emerald-400'
                        }>
                          ${factura.saldoPendiente.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={
                          factura.estado === 'pagada' ? 'badge-success' :
                          factura.estado === 'parcial' ? 'badge-info' :
                          'badge-warning'
                        }>
                          {factura.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => generateInvoicePDF(factura)}
                            className="p-2 rounded-lg text-pastel-muted hover:bg-sky-50 hover:text-sky-600 transition-colors dark:text-slate-400 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
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
                              className="p-2 rounded-lg text-pastel-muted hover:bg-emerald-50 hover:text-emerald-600 transition-colors dark:text-slate-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
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
              <FileText size={48} className="mx-auto text-pastel-muted/40 mb-4 dark:text-slate-700" />
              <p className="text-pastel-muted dark:text-slate-500">No hay facturas registradas</p>
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
              className="modal-overlay"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="modal-content max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">Nueva Factura</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg text-pastel-muted hover:bg-pastel-mist hover:text-pastel-ink transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
                    <div className="bg-pastel-mist border border-edge-light rounded-xl p-4 dark:bg-slate-800 dark:border-slate-700">
                      {(() => {
                        const venta = ventas.find(v => v.id === selectedVenta);
                        const cliente = clientes.find(c => c.id === venta?.clienteId);
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-pastel-muted dark:text-slate-400">Venta:</span>
                              <span className="text-pastel-ink dark:text-slate-100">{venta?.numero}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-pastel-muted dark:text-slate-400">Cliente:</span>
                              <span className="text-pastel-ink dark:text-slate-100">{cliente?.nombre}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-pastel-muted dark:text-slate-400">Items:</span>
                              <span className="text-pastel-ink dark:text-slate-100">{venta?.items.length} producto(s)</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-edge-light dark:border-slate-700">
                              <span className="font-medium text-pastel-muted dark:text-slate-400">Total:</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">${venta?.total.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button onClick={handleCrearFactura} disabled={!selectedVenta} className="btn-warning flex-1">
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
              className="modal-overlay"
              onClick={() => setShowPagoModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="modal-content max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">Registrar Pago</h2>
                  <button
                    onClick={() => setShowPagoModal(false)}
                    className="p-2 rounded-lg text-pastel-muted hover:bg-pastel-mist hover:text-pastel-ink transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-pastel-mist border border-edge-light rounded-xl p-4 dark:bg-slate-800 dark:border-slate-700">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-pastel-muted dark:text-slate-400">Factura:</span>
                        <span className="text-amber-600 dark:text-amber-400">{selectedFactura.numero}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pastel-muted dark:text-slate-400">Total:</span>
                        <span className="text-pastel-ink dark:text-slate-100">${selectedFactura.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-edge-light dark:border-slate-700">
                        <span className="font-medium text-pastel-muted dark:text-slate-400">Saldo Pendiente:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">${selectedFactura.saldoPendiente.toLocaleString()}</span>
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
                    <button onClick={() => setShowPagoModal(false)} className="btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button
                      onClick={handlePago}
                      disabled={!pagoMonto || parseFloat(pagoMonto) <= 0 || parseFloat(pagoMonto) > selectedFactura.saldoPendiente}
                      className="btn-success flex-1"
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
