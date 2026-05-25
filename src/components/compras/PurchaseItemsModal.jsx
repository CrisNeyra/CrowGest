import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ShoppingCart, Trash2, X, Minus } from 'lucide-react';

export default function PurchaseItemsModal({
  isOpen,
  onClose,
  title,
  submitLabel,
  proveedores,
  productos,
  onSubmit,
  observacionesLabel = 'Observaciones',
}) {
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [productoSearch, setProductoSearch] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedProveedor('');
      setCarrito([]);
      setProductoSearch('');
      setObservaciones('');
      setSaving(false);
    }
  }, [isOpen]);

  const filteredProductos = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(productoSearch.toLowerCase()) ||
      p.codigo.toLowerCase().includes(productoSearch.toLowerCase())
  );

  const agregarAlCarrito = (producto) => {
    const existente = carrito.find((item) => item.productoId === producto.id);
    const precio = producto.costo ?? producto.precio ?? 0;
    if (existente) {
      setCarrito(
        carrito.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio,
          cantidad: 1,
        },
      ]);
    }
  };

  const actualizarCantidad = (productoId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarrito(carrito.filter((item) => item.productoId !== productoId));
    } else {
      setCarrito(
        carrito.map((item) =>
          item.productoId === productoId ? { ...item, cantidad: nuevaCantidad } : item
        )
      );
    }
  };

  const calcularTotal = () => carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);

  const handleSubmit = async () => {
    if (!selectedProveedor || carrito.length === 0) return;
    setSaving(true);
    try {
      await onSubmit({
        proveedorId: selectedProveedor,
        observaciones: observaciones.trim(),
        items: carrito.map((item) => ({
          productoId: item.productoId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          cantidadRecibida: 0,
          precioUnitario: item.precio,
          subtotal: item.precio * item.cantidad,
        })),
        total: calcularTotal(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal-content flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-edge-light p-6 dark:border-slate-800">
              <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-pastel-muted transition-colors hover:bg-pastel-mist dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              <div className="flex-1 overflow-y-auto border-edge-light p-6 lg:border-r dark:border-slate-800">
                <div className="mb-4">
                  <label className="label">Proveedor</label>
                  <select
                    value={selectedProveedor}
                    onChange={(e) => setSelectedProveedor(e.target.value)}
                    className="select-field"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="label">{observacionesLabel}</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Condiciones, plazo de entrega..."
                  />
                </div>

                <div className="mb-4">
                  <label className="label">Buscar productos</label>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500"
                      size={18}
                    />
                    <input
                      type="text"
                      value={productoSearch}
                      onChange={(e) => setProductoSearch(e.target.value)}
                      placeholder="Buscar por nombre o código..."
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {filteredProductos.map((producto) => (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => agregarAlCarrito(producto)}
                      className="w-full rounded-xl border border-edge-light bg-white/70 p-3 text-left transition hover:border-sky-500/50 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-pastel-ink dark:text-slate-100">{producto.nombre}</p>
                          <p className="text-xs text-pastel-muted">Costo ref.</p>
                        </div>
                        <p className="font-semibold">
                          ${(producto.costo ?? producto.precio ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex w-full flex-col bg-pastel-mist/40 p-6 dark:bg-slate-800/30 lg:w-96">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <ShoppingCart size={20} />
                  Ítems ({carrito.length})
                </h3>

                <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
                  {carrito.length === 0 ? (
                    <p className="py-8 text-center text-pastel-muted">Sin ítems</p>
                  ) : (
                    carrito.map((item) => (
                      <div
                        key={item.productoId}
                        className="rounded-xl border border-edge-light bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <p className="text-sm font-medium">{item.nombre}</p>
                          <button
                            type="button"
                            onClick={() =>
                              setCarrito(carrito.filter((i) => i.productoId !== item.productoId))
                            }
                            className="text-pastel-muted hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded bg-pastel-mist dark:bg-slate-700"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center">{item.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded bg-pastel-mist dark:bg-slate-700"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="font-semibold text-sky-700 dark:text-indigo-400">
                            ${(item.precio * item.cantidad).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-edge-light pt-4 dark:border-slate-700">
                  <div className="mb-4 flex justify-between">
                    <span className="text-pastel-muted">Total</span>
                    <span className="text-2xl font-bold">${calcularTotal().toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!selectedProveedor || carrito.length === 0 || saving}
                    className="btn-primary w-full"
                  >
                    {saving ? 'Guardando...' : submitLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
