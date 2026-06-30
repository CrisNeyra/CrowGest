import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ShoppingCart, Trash2, X, Minus, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PageShell from '../components/ui/PageShell';
import { useData } from '../context/DataContext';

export default function Ventas() {
  const { ventas, clientes, productos, addVenta } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [productoSearch, setProductoSearch] = useState('');

  const filteredVentas = ventas.filter(venta => {
    const cliente = clientes.find(c => c.id === venta.clienteId);
    return venta.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase());
  }).reverse();

  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(productoSearch.toLowerCase()) ||
    p.codigo.toLowerCase().includes(productoSearch.toLowerCase())
  );

  const agregarAlCarrito = (producto) => {
    const existente = carrito.find(item => item.productoId === producto.id);
    if (existente) {
      if (existente.cantidad < producto.stock) {
        setCarrito(carrito.map(item =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        ));
      }
    } else if (producto.stock > 0) {
      setCarrito([...carrito, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        stockDisponible: producto.stock
      }]);
    }
  };

  const actualizarCantidad = (productoId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarrito(carrito.filter(item => item.productoId !== productoId));
    } else {
      setCarrito(carrito.map(item =>
        item.productoId === productoId
          ? { ...item, cantidad: Math.min(nuevaCantidad, item.stockDisponible) }
          : item
      ));
    }
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.productoId !== productoId));
  };

  const calcularTotal = () =>
    carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);

  const handleSubmit = async () => {
    if (!selectedCliente || carrito.length === 0) return;
    try {
      await addVenta({
        clienteId: selectedCliente,
        items: carrito.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          subtotal: item.precio * item.cantidad
        })),
        total: calcularTotal()
      });
      toast.success('Venta registrada correctamente');
      setShowModal(false);
      setSelectedCliente('');
      setCarrito([]);
      setProductoSearch('');
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al registrar la venta');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Reporte de Ventas - CrowGest', 14, 15);
    const tableData = filteredVentas.map(venta => {
      const cliente = clientes.find(c => c.id === venta.clienteId);
      return [
        venta.numero,
        cliente?.nombre || 'Desconocido',
        new Date(venta.fecha).toLocaleDateString(),
        venta.items.length.toString(),
        `$${venta.total.toLocaleString()}`,
        venta.estado
      ];
    });
    doc.autoTable({
      head: [['Número', 'Cliente', 'Fecha', 'Items', 'Total', 'Estado']],
      body: tableData,
      startY: 25,
    });
    doc.save('ventas_crowgest.pdf');
    toast.success('PDF exportado correctamente');
  };

  const exportToExcel = () => {
    const dataToExport = filteredVentas.map(venta => {
      const cliente = clientes.find(c => c.id === venta.clienteId);
      return {
        Número: venta.numero,
        Cliente: cliente?.nombre || 'Desconocido',
        Fecha: new Date(venta.fecha).toLocaleDateString(),
        Items: venta.items.length,
        Total: venta.total,
        Estado: venta.estado
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "ventas_crowgest.xlsx");
    toast.success('Excel exportado correctamente');
  };

  return (
    <PageShell title="Ventas">
      <div>
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Buscar ventas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={18} /> Nueva Venta
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
                  <th className="text-center p-4">Items</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-center p-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredVentas.map((venta, index) => {
                  const cliente = clientes.find(c => c.id === venta.clienteId);
                  return (
                    <motion.tr
                      key={venta.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="font-mono text-sky-700 dark:text-indigo-400">{venta.numero}</span>
                      </td>
                      <td className="p-4 text-pastel-ink dark:text-slate-100">{cliente?.nombre || 'Cliente eliminado'}</td>
                      <td className="p-4 text-pastel-muted dark:text-slate-400">
                        {new Date(venta.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 text-center text-pastel-muted dark:text-slate-400">
                        {venta.items.length} producto(s)
                      </td>
                      <td className="p-4 text-right font-semibold text-pastel-ink dark:text-slate-100">
                        ${venta.total.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="badge-success">{venta.estado}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredVentas.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-pastel-muted/40 mb-4 dark:text-slate-700" />
              <p className="text-pastel-muted dark:text-slate-500">No hay ventas registradas</p>
            </div>
          )}
        </div>

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
                className="modal-content max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-edge-light dark:border-slate-800">
                  <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">Nueva Venta</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg text-pastel-muted hover:bg-pastel-mist hover:text-pastel-ink transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                  <div className="flex-1 p-6 lg:border-r border-edge-light overflow-y-auto dark:border-slate-800">
                    <div className="mb-4">
                      <label className="label">Cliente</label>
                      <select
                        value={selectedCliente}
                        onChange={(e) => setSelectedCliente(e.target.value)}
                        className="select-field"
                      >
                        <option value="">Seleccionar cliente</option>
                        {clientes.map(cliente => (
                          <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="label">Buscar productos</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={18} />
                        <input
                          type="text"
                          value={productoSearch}
                          onChange={(e) => setProductoSearch(e.target.value)}
                          placeholder="Buscar por nombre o código..."
                          className="input-field pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {filteredProductos.map(producto => (
                        <div
                          key={producto.id}
                          onClick={() => agregarAlCarrito(producto)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            producto.stock === 0
                              ? 'border-edge-light bg-pastel-mist/40 opacity-50 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/30'
                              : 'border-edge-light bg-white/70 hover:border-sky-500/50 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-pastel-ink dark:text-slate-100">{producto.nombre}</p>
                              <p className="text-xs text-pastel-muted dark:text-slate-400">{producto.codigo}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-pastel-ink dark:text-slate-100">
                                ${producto.precio.toLocaleString()}
                              </p>
                              <p className={`text-xs ${
                                producto.stock <= producto.stockMinimo
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-pastel-muted dark:text-slate-500'
                              }`}>
                                Stock: {producto.stock}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full lg:w-96 p-6 flex flex-col bg-pastel-mist/40 dark:bg-slate-800/30">
                    <h3 className="text-lg font-semibold text-pastel-ink dark:text-slate-100 mb-4 flex items-center gap-2">
                      <ShoppingCart size={20} />
                      Carrito ({carrito.length})
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                      {carrito.length === 0 ? (
                        <p className="text-pastel-muted dark:text-slate-500 text-center py-8">
                          El carrito está vacío
                        </p>
                      ) : (
                        carrito.map(item => (
                          <div
                            key={item.productoId}
                            className="bg-white border border-edge-light rounded-xl p-3 dark:bg-slate-800 dark:border-slate-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-sm text-pastel-ink dark:text-slate-100">{item.nombre}</p>
                              <button
                                onClick={() => eliminarDelCarrito(item.productoId)}
                                className="text-pastel-muted hover:text-red-500 transition-colors dark:text-slate-400 dark:hover:text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                                  className="w-7 h-7 rounded bg-pastel-mist text-pastel-ink flex items-center justify-center hover:bg-edge-light transition-colors dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-pastel-ink dark:text-slate-100 w-8 text-center">{item.cantidad}</span>
                                <button
                                  onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                                  className="w-7 h-7 rounded bg-pastel-mist text-pastel-ink flex items-center justify-center hover:bg-edge-light transition-colors dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <p className="text-sky-700 font-semibold dark:text-indigo-400">
                                ${(item.precio * item.cantidad).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-edge-light pt-4 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-pastel-muted dark:text-slate-400">Total</span>
                        <span className="text-2xl font-bold text-pastel-ink dark:text-slate-100">
                          ${calcularTotal().toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={!selectedCliente || carrito.length === 0}
                        className="btn-primary w-full"
                      >
                        Confirmar Venta
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
