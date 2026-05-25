import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function TesoreriaModal({ isOpen, onClose, title, children }) {
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
            className="modal-content max-h-[90vh] max-w-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-pastel-muted transition-colors hover:bg-pastel-mist hover:text-pastel-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
