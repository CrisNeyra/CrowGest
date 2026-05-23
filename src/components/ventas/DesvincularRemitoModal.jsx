import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Unlink } from 'lucide-react';

export default function DesvincularRemitoModal({
  isOpen,
  onClose,
  factura,
  remito,
  onConfirm,
  puedeRevertirStock,
}) {
  const [motivo, setMotivo] = useState('');
  const [revertirStock, setRevertirStock] = useState(false);
  const [revertirCtaCte, setRevertirCtaCte] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setMotivo('');
    setRevertirStock(false);
    setRevertirCtaCte(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!motivo.trim()) return;
    setSaving(true);
    try {
      await onConfirm({
        motivo: motivo.trim(),
        revertirStock: puedeRevertirStock ? revertirStock : false,
        revertirCtaCte,
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  if (!factura || !remito) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal-content max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-pastel-ink dark:text-slate-100">
                <Unlink size={22} className="text-amber-600" />
                Desvincular remito
              </h2>
              <button type="button" onClick={handleClose} className="p-2 text-pastel-muted">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex gap-3">
                <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400" size={20} />
                <div className="text-sm text-amber-900 dark:text-amber-200">
                  <p>
                Se quitará el vínculo entre <strong>{factura.numero}</strong> y remito{' '}
                <strong>{remito.numero}</strong>.
              </p>
                  <p className="mt-2">
                    Las reversiones marcadas abajo se registran en el historial y en movimientos.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Motivo (obligatorio)</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Ej: error de imputación, cambio de comprobante..."
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-edge-light p-3 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={revertirCtaCte}
                  onChange={(e) => setRevertirCtaCte(e.target.checked)}
                  disabled={!factura.ctaCteImpactada}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-pastel-ink dark:text-slate-100">
                    Revertir impacto en cuenta corriente
                  </p>
                  <p className="text-xs text-pastel-muted dark:text-slate-400">
                    {factura.ctaCteImpactada
                      ? `Resta $${(factura.saldoPendiente || 0).toLocaleString()} del saldo del cliente.`
                      : 'Esta factura no impactó cta. cte. (sin comprobante fiscal emitido).'}
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border border-edge-light p-3 dark:border-slate-700 ${
                  puedeRevertirStock ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={revertirStock}
                  onChange={(e) => setRevertirStock(e.target.checked)}
                  disabled={!puedeRevertirStock}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-pastel-ink dark:text-slate-100">
                    Revertir stock del remito
                  </p>
                  <p className="text-xs text-pastel-muted dark:text-slate-400">
                    {puedeRevertirStock
                      ? 'Devuelve las unidades al depósito. Solo disponible si es la última factura vinculada al remito.'
                      : 'Hay otras facturas vinculadas a este remito; no se puede revertir stock automáticamente.'}
                  </p>
                </div>
              </label>

              {factura.bloqueado && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Este comprobante tiene CAE y no puede desvincularse. Emití una Nota de Crédito desde
                  Comprobantes AFIP.
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!motivo.trim() || saving || factura.bloqueado}
                className="btn-primary flex-1 bg-amber-600 hover:bg-amber-500 dark:bg-amber-600"
              >
                {saving ? 'Procesando...' : 'Confirmar desvinculación'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
