import { NavLink } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  LayoutDashboard,
  Users,
  Package,
  Library,
  ShoppingCart,
  ClipboardList,
  PackageCheck,
  Receipt,
  FileText,
  Send,
  ShieldCheck,
  Truck,
  ShoppingBag,
  CreditCard,
  Wallet,
  BarChart3,
  CircleDollarSign,
  Award,
  ArrowLeftRight,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const menuItems = [
  { path: '/pedidos-a-facturar', icon: Receipt, label: 'A Facturar' },
  { path: '/auditoria', icon: History, label: 'Auditoría' },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/comisiones', icon: Award, label: 'Comisiones' },
  { path: '/comprobantes-proveedor', icon: FileText, label: 'Comp. Prov.' },
  { path: '/comprobantes', icon: ShieldCheck, label: 'Comprobantes' },
  { path: '/ordenes-compra', icon: ShoppingBag, label: 'Compras' },
  { path: '/cuenta-corriente', icon: Wallet, label: 'Cta. Corriente' },
  { path: '/cuenta-corriente-proveedores', icon: Wallet, label: 'Cta. Proveedores' },
  { path: '/facturas', icon: FileText, label: 'Facturas' },
  { path: '/maestros', icon: Library, label: 'Maestros' },
  { path: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
  { path: '/pagos', icon: CreditCard, label: 'Pagos' },
  { path: '/pedidos', icon: PackageCheck, label: 'Pedidos' },
  { path: '/presupuestos', icon: ClipboardList, label: 'Presupuestos' },
  { path: '/productos', icon: Package, label: 'Productos' },
  { path: '/proveedores', icon: Truck, label: 'Proveedores' },
  { path: '/remitos-compra', icon: PackageCheck, label: 'Rem. Compra' },
  { path: '/remitos', icon: Send, label: 'Remitos' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes' },
  { path: '/stock-kardex', icon: Package, label: 'Stock/Kardex' },
  { path: '/tesoreria', icon: CircleDollarSign, label: 'Tesorería' },
  { path: '/ventas', icon: ShoppingCart, label: 'Ventas' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const logoSize = isOpen ? 'sm' : 'xs';
  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-edge-light bg-sidebar-light/95 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex min-h-[4.25rem] items-center justify-between gap-2 overflow-visible border-b border-edge-light py-2 pl-3 pr-2 dark:border-slate-800">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-visible">
          <BrandLogo size={logoSize} className="shrink-0" />
          {isOpen && (
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-sm font-bold text-pastel-ink dark:text-slate-100">Gest Crow</h1>
              <p className="truncate text-xs text-pastel-muted dark:text-slate-400">Management System</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0 rounded-lg p-2 text-pastel-muted transition-colors hover:bg-white/50 hover:text-pastel-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className="border-b border-edge-light px-3 py-3 dark:border-slate-800">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
              isActive
                ? 'bg-sky-600 text-white shadow-sm dark:bg-indigo-600'
                : 'text-pastel-ink hover:bg-white/50 hover:text-pastel-ink dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`
          }
        >
          <LayoutDashboard size={18} className="shrink-0" />
          {isOpen && <span className="whitespace-nowrap">Menu Principal</span>}
        </NavLink>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
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
    </aside>
  );
}
