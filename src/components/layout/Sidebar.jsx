import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  Truck,
  CreditCard,
  ArrowLeftRight,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'from-slate-500 to-slate-600' },
  { path: '/clientes', icon: Users, label: 'Clientes', color: 'from-emerald-500 to-emerald-600' },
  { path: '/productos', icon: Package, label: 'Productos', color: 'from-purple-500 to-purple-600' },
  { path: '/ventas', icon: ShoppingCart, label: 'Ventas', color: 'from-cyan-500 to-cyan-600' },
  { path: '/facturas', icon: FileText, label: 'Facturas', color: 'from-amber-500 to-amber-600' },
  { path: '/proveedores', icon: Truck, label: 'Proveedores', color: 'from-rose-500 to-rose-600' },
  { path: '/pagos', icon: CreditCard, label: 'Pagos', color: 'from-indigo-500 to-indigo-600' },
  { path: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos', color: 'from-teal-500 to-teal-600' },
];

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut"
    }
  })
};

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: isOpen ? 256 : 80 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed left-0 top-0 h-full bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800/50 z-50 flex flex-col shadow-2xl"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/50">
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative overflow-hidden"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Crow Icon SVG */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
              <path d="M18.5,8.5 C19,8 20,7 21,7.5 C20.5,8.5 20,9 19,9.5 L17.5,10.5 C17,11.5 16,13 14,14.5 C12,16 10,17 8,17 C6,17 4.5,16 3.5,14.5 C3,13 3,11 4,9.5 C5,8 6.5,7 8.5,7 L9.5,7.5 C9,6.5 9,5.5 9.5,4.5 C10,4 11,3.5 12,4 C12.5,4.5 12.5,5.5 12,6.5 L11.5,7.5 C12.5,7 13.5,7 14.5,7.5 C15.5,8 16,9 16,10 C16.5,9.5 17.5,9 18.5,8.5 Z M10.5,5.5 C10.5,6 11,6.5 11.5,6.5 C12,6.5 12.5,6 12.5,5.5 C12.5,5 12,4.5 11.5,4.5 C11,4.5 10.5,5 10.5,5.5 Z"/>
            </svg>
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{ 
                scale: [1, 2, 1],
                opacity: [0.3, 0, 0.3]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-white font-bold text-lg flex items-center gap-1">
                  CrowGest
                  <Sparkles size={14} className="text-amber-400" />
                </h1>
                <p className="text-zinc-500 text-xs">Sistema de Gestión</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft size={20} />
          </motion.div>
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              custom={index}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <NavLink
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {/* Active background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeBackground"
                      className="absolute inset-0 bg-zinc-800 rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                {/* Hover background */}
                {!isActive && (
                  <motion.div
                    className="absolute inset-0 bg-zinc-800/50 rounded-xl opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                )}

                <motion.div
                  className={`relative p-2 rounded-lg bg-gradient-to-br ${item.color} transition-all duration-300`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    boxShadow: isActive 
                      ? '0 0 20px rgba(99, 102, 241, 0.4)' 
                      : '0 0 0px rgba(99, 102, 241, 0)'
                  }}
                >
                  <item.icon size={18} className="text-white" />
                </motion.div>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="relative font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active indicator dot */}
                {isActive && !isOpen && (
                  <motion.div
                    layoutId="activeDot"
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-full"
                  />
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-zinc-800/50">
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            `relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              isActive
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`
          }
        >
          <motion.div 
            className="p-2 rounded-lg bg-zinc-700"
            whileHover={{ scale: 1.1, rotate: 90 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Settings size={18} className="text-zinc-300" />
          </motion.div>
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-medium"
              >
                Configuración
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>
    </motion.aside>
  );
}
