import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageCheck, X } from 'lucide-react';

export default function RecepcionModal({ isOpen, onClose, orden, onSubmit }) {
  const [lineas, setLineas] = useState([]);
  const [numeroRemitoProveedor, setNumeroRemitoProveedor] = useState('');
  const [fechaRemitoProveedor, setFechaRemitoProveedor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !orden) {
      setLineas([]);
      setNumeroRemitoProveedor('');
      setFechaRemitoProveedor('');
      setObservaciones('');
      setSaving(false);
      return;
    }
    setNumeroRemitoProveedor('');
    setFechaRemitoProveedor(new Date().toISOString().slice(0, 10));
    setLineas(
      orden.items.map((item) => {
        const pendiente = item.cantidad - (item.cantidadRecibida || 0);
        return {
          productoId: item.productoId,
          nombre: item.nombre,
          pendiente,
          cantidad: pendiente > 0 ? pendiente : 0,
        };
      })
    );
  }, [isOpen, orden]);

  const totalARecibir = lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0);

  const handleSubmit = async () => {
    if (totalARecibir <= 0) return;
    setSaving(true);
    try {
      await onSubmit(
        lineas
          .filter((l) => Number(l.cantidad) > 0)
          .map((l) => ({
            productoId: l.productoId,
            cantidad: Number(l.cantidad),
          })),
        {
          numeroRemitoProveedor: numeroRemitoProveedor.trim(),
          fechaRemitoProveedor,
          observaciones: observaciones.trim(),
        }
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && orden && (
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
            className="modal-content max-h-[90vh] max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <PackageCheck size={22} className="text-sky-700 dark:text-indigo-400" />
                Recepción — {orden.numero}
              </h2>
              <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-pastel-mist dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 space-y-3">
              {lineas.map((linea) => (
                <div
                  key={linea.productoId}
                  className="rounded-xl border border-edge-light p-3 dark:border-slate-700"
                >
                  <p className="mb-2 text-sm font-medium">{linea.nombre}</p>
                  <p className="mb-2 text-xs text-pastel-muted">
                    Pendiente: {linea.pendiente} unidades
                  </p>
                  <input
                    type="number"
                    min="0"
                    max={linea.pendiente}
                    value={linea.cantidad}
                    disabled={linea.pendiente <= 0}
                    onChange={(e) =>
                      setLineas(
                        lineas.map((l) =>
                          l.productoId === linea.productoId
                            ? { ...l, cantidad: Math.min(linea.pendiente, Number(e.target.value) || 0) }
                            : l
                        )
                      )
                    }
                    className="input-field w-full"
                  />
                </div>
              ))}
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">N° remito proveedor</label>
                <input
                  type="text"
                  value={numeroRemitoProveedor}
                  onChange={(e) => setNumeroRemitoProveedor(e.target.value)}
                  className="input-field"
                  placeholder="Ej: 0001-00001234"
                />
              </div>
              <div>
                <label className="label">Fecha remito</label>
                <input
                  type="date"
                  value={fechaRemitoProveedor}
                  onChange={(e) => setFechaRemitoProveedor(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                className="input-field resize-none"
                placeholder="Remito del proveedor, diferencias..."
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={totalARecibir <= 0 || saving}
              className="btn-primary w-full"
            >
              {saving ? 'Registrando...' : `Confirmar recepción (${totalARecibir} u.)`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
