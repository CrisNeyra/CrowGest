import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ShoppingCart, Trash2, X, Minus } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
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
          item.productoId === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        ));
      }
    } else {
      if (producto.stock > 0) {
        setCarrito([...carrito, {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1,
          stockDisponible: producto.stock
        }]);
      }
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

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  };

  const handleSubmit = () => {
    if (!selectedCliente || carrito.length === 0) return;

    addVenta({
      clienteId: selectedCliente,
      items: carrito.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        subtotal: item.precio * item.cantidad
      })),
      total: calcularTotal()
    });

    setShowModal(false);
    setSelectedCliente('');
    setCarrito([]);
    setProductoSearch('');
  };

  return (
    <Layout moduleClass="module-ventas">
      <Header title="Ventas" subtitle="Registro de ventas realizadas" />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Buscar ventas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus size={20} />
            Nueva Venta
          </button>
        </div>

        {/* Sales Table */}
        <div className="card overflow-hidden">
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
                        <span className="text-cyan-400 font-mono">{venta.numero}</span>
                      </td>
                      <td className="p-4">
                        <p className="text-white">{cliente?.nombre || 'Cliente eliminado'}</p>
                      </td>
                      <td className="p-4 text-zinc-400">
                        {new Date(venta.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 text-center text-zinc-400">
                        {venta.items.length} producto(s)
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-white font-semibold">
                          ${venta.total.toLocaleString()}
                        </span>
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
              <ShoppingCart size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500">No hay ventas registradas</p>
            </div>
          )}
        </div>

        {/* Modal Nueva Venta */}
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
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                  <h2 className="text-xl font-bold text-white">Nueva Venta</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                  {/* Left - Products */}
                  <div className="flex-1 p-6 border-r border-zinc-800 overflow-y-auto">
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
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
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            producto.stock === 0
                              ? 'border-zinc-800 bg-zinc-800/30 opacity-50 cursor-not-allowed'
                              : 'border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium">{producto.nombre}</p>
                              <p className="text-zinc-500 text-sm">{producto.codigo}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-semibold">${producto.precio.toLocaleString()}</p>
                              <p className={`text-sm ${producto.stock <= producto.stockMinimo ? 'text-amber-400' : 'text-zinc-500'}`}>
                                Stock: {producto.stock}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right - Cart */}
                  <div className="w-96 p-6 flex flex-col bg-zinc-800/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <ShoppingCart size={20} />
                      Carrito ({carrito.length})
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                      {carrito.length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">El carrito está vacío</p>
                      ) : (
                        carrito.map(item => (
                          <div key={item.productoId} className="bg-zinc-800 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-white font-medium text-sm">{item.nombre}</p>
                              <button
                                onClick={() => eliminarDelCarrito(item.productoId)}
                                className="text-zinc-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                                  className="w-7 h-7 rounded bg-zinc-700 text-white flex items-center justify-center hover:bg-zinc-600 transition-colors"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-white w-8 text-center">{item.cantidad}</span>
                                <button
                                  onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                                  className="w-7 h-7 rounded bg-zinc-700 text-white flex items-center justify-center hover:bg-zinc-600 transition-colors"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <p className="text-cyan-400 font-semibold">
                                ${(item.precio * item.cantidad).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t border-zinc-700 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-zinc-400">Total</span>
                        <span className="text-2xl font-bold text-white">
                          ${calcularTotal().toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={!selectedCliente || carrito.length === 0}
                        className="btn-success w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
    </Layout>
  );
}
