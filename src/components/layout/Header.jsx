import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, LogOut, Settings, DollarSign, RefreshCw } from 'lucide-react';

export default function Header({ title, subtitle }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dolar, setDolar] = useState({ blue: { venta: 1220 }, oficial: { venta: 1090 } });
  const [loadingDolar, setLoadingDolar] = useState(false);

  useEffect(() => {
    const fetchDolar = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares');
        const data = await res.json();
        setDolar({
          blue: data.find(d => d.casa === 'blue') || { venta: 1220 },
          oficial: data.find(d => d.casa === 'oficial') || { venta: 1090 }
        });
      } catch (e) {
        console.log('Usando valores de fallback');
      }
    };
    fetchDolar();
    const interval = setInterval(fetchDolar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const notifications = [
    { id: 1, title: 'Stock bajo', message: 'Mouse Logitech tiene stock bajo', type: 'warning' },
    { id: 2, title: 'Factura vencida', message: 'Factura F-000001 está vencida', type: 'danger' },
    { id: 3, title: 'Nueva venta', message: 'Se registró una nueva venta', type: 'success' },
  ];

  return (
    <header className="h-16 bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-64 bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Cotización Dólar - Compacto */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg">
          <DollarSign size={14} className="text-emerald-400" />
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-zinc-500">Blue </span>
              <span className="text-emerald-400 font-bold">${dolar.blue?.venta?.toLocaleString('es-AR')}</span>
            </div>
            <div className="w-px h-4 bg-zinc-700" />
            <div>
              <span className="text-zinc-500">Oficial </span>
              <span className="text-blue-400 font-bold">${dolar.oficial?.venta?.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold text-white">Notificaciones</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 mt-2 rounded-full ${
                          notif.type === 'warning'
                            ? 'bg-amber-500'
                            : notif.type === 'danger'
                            ? 'bg-red-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{notif.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-zinc-800/50">
                <button className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                  Ver todas las notificaciones
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-white">Admin</p>
              <p className="text-xs text-zinc-500">Administrador</p>
            </div>
          </button>

          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden"
            >
              <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <Settings size={18} />
                <span className="text-sm">Configuración</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors">
                <LogOut size={18} />
                <span className="text-sm">Cerrar sesión</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
