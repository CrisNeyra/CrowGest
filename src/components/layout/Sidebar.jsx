import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/productos', icon: Package, label: 'Productos' },
  { path: '/ventas', icon: ShoppingCart, label: 'Ventas' },
  { path: '/facturas', icon: FileText, label: 'Facturas' },
  { path: '/proveedores', icon: Truck, label: 'Proveedores' },
  { path: '/pagos', icon: CreditCard, label: 'Pagos' },
  { path: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  return (
    <aside
      className={`fixed left-0 top-0 z-50 h-full border-r border-edge-light bg-sidebar-light/95 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-edge-light px-4 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white dark:bg-indigo-600">
            <LayoutDashboard size={20} />
          </div>
          {isOpen && (
            <div>
              <h1 className="text-sm font-bold text-pastel-ink dark:text-slate-100">CrowGest</h1>
              <p className="text-xs text-pastel-muted dark:text-slate-400">Sistema de Gestion</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-pastel-muted transition-colors hover:bg-white/50 hover:text-pastel-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm dark:bg-indigo-600'
                  : 'text-pastel-ink hover:bg-white/50 hover:text-pastel-ink dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-edge-light p-3 dark:border-slate-800">
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
              isActive
                ? 'bg-sky-600 text-white dark:bg-indigo-600'
                : 'text-pastel-ink hover:bg-white/50 hover:text-pastel-ink dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`
          }
        >
          <Settings size={18} className="shrink-0" />
          {isOpen && <span>Configuración</span>}
        </NavLink>
      </div>
    </aside>
  );
}
