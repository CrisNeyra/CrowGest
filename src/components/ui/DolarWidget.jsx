import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

export default function DolarWidget() {
  const [cotizaciones, setCotizaciones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchCotizaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      // API pública de cotización del dólar en Argentina
      const response = await fetch('https://dolarapi.com/v1/dolares');
      if (!response.ok) throw new Error('Error al obtener cotizaciones');
      const data = await response.json();
      
      // Buscar dólar oficial y blue
      const oficial = data.find(d => d.casa === 'oficial');
      const blue = data.find(d => d.casa === 'blue');
      
      setCotizaciones({ oficial, blue });
      setLastUpdate(new Date());
    } catch (err) {
      setError('No se pudo cargar');
      // Datos de fallback para demo
      setCotizaciones({
        oficial: { compra: 1050, venta: 1090 },
        blue: { compra: 1180, venta: 1220 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotizaciones();
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchCotizaciones, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <motion.div
        className={`bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden ${
          isExpanded ? 'w-80' : 'w-auto'
        }`}
        layout
      >
        {/* Header - Always visible */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
            <DollarSign size={18} className="text-white" />
          </div>
          
          {!isExpanded && cotizaciones && (
            <div className="flex items-center gap-4">
              <div className="text-left">
                <p className="text-[10px] text-zinc-500 uppercase">Blue</p>
                <p className="text-sm font-bold text-emerald-400">
                  ${formatNumber(cotizaciones.blue?.venta || 0)}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-zinc-500 uppercase">Oficial</p>
                <p className="text-sm font-bold text-blue-400">
                  ${formatNumber(cotizaciones.oficial?.venta || 0)}
                </p>
              </div>
            </div>
          )}

          {isExpanded && (
            <span className="text-white font-medium flex-1 text-left">Cotización Dólar</span>
          )}

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-zinc-500" />
          </motion.div>
        </motion.button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-zinc-800"
            >
              {loading ? (
                <div className="p-4 flex items-center justify-center">
                  <RefreshCw className="animate-spin text-zinc-500" size={20} />
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {/* Dólar Blue */}
                  <motion.div
                    className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 rounded-xl p-3 border border-emerald-500/20"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-emerald-400 font-semibold flex items-center gap-2">
                        <TrendingUp size={16} />
                        Dólar Blue
                      </span>
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">PARALELO</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Compra</p>
                        <p className="text-lg font-bold text-white">
                          ${formatNumber(cotizaciones?.blue?.compra || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Venta</p>
                        <p className="text-lg font-bold text-emerald-400">
                          ${formatNumber(cotizaciones?.blue?.venta || 0)}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Dólar Oficial */}
                  <motion.div
                    className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 rounded-xl p-3 border border-blue-500/20"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-400 font-semibold flex items-center gap-2">
                        <TrendingDown size={16} />
                        Dólar Oficial
                      </span>
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">BNA</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Compra</p>
                        <p className="text-lg font-bold text-white">
                          ${formatNumber(cotizaciones?.oficial?.compra || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Venta</p>
                        <p className="text-lg font-bold text-blue-400">
                          ${formatNumber(cotizaciones?.oficial?.venta || 0)}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Spread */}
                  {cotizaciones?.blue && cotizaciones?.oficial && (
                    <div className="bg-zinc-800/50 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Brecha</span>
                      <span className="text-sm font-bold text-amber-400">
                        {(((cotizaciones.blue.venta / cotizaciones.oficial.venta) - 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <span className="text-[10px] text-zinc-600">
                      {lastUpdate ? `Actualizado: ${lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchCotizaciones();
                      }}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                      disabled={loading}
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
