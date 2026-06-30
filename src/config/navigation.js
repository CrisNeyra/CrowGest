import {
  Home,
  ShoppingCart,
  ShoppingBag,
  Boxes,
  CircleDollarSign,
  Users2,
  BarChart3,
  Settings,
  UserRound,
  ClipboardList,
  PackageCheck,
  Receipt,
  Send,
  Wallet,
  Truck,
  FileText,
  Package,
  CreditCard,
  ArrowLeftRight,
  Award,
  History,
  ShieldCheck,
} from 'lucide-react';

/**
 * Estructura de navegación estilo Cloud Gestion.
 * Nivel 1: módulos (con ícono). Nivel 2: páginas del módulo.
 * `permission` es opcional; si se define, el item se oculta cuando el rol no lo tiene.
 */
export const NAV_MODULES = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: Home,
    items: [{ path: '/', label: 'Panel principal', icon: Home }],
  },
  {
    id: 'ventas',
    label: 'Ventas',
    icon: ShoppingCart,
    items: [
      { path: '/clientes', label: 'Clientes', icon: UserRound },
      { path: '/presupuestos', label: 'Presupuestos', icon: ClipboardList },
      { path: '/pedidos', label: 'Pedidos', icon: PackageCheck },
      { path: '/pedidos-a-facturar', label: 'A Facturar', icon: Receipt },
      { path: '/remitos', label: 'Remitos', icon: Send },
      { path: '/cuenta-corriente', label: 'Cta. Corriente', icon: Wallet },
      { path: '/ventas', label: 'Mostrador', icon: ShoppingCart },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: ShoppingBag,
    items: [
      { path: '/proveedores', label: 'Proveedores', icon: Truck },
      { path: '/ordenes-compra', label: 'Órdenes de Compra', icon: ShoppingBag },
      { path: '/remitos-compra', label: 'Rem. Compra', icon: PackageCheck },
      { path: '/comprobantes-proveedor', label: 'Comp. Proveedor', icon: FileText },
      { path: '/cuenta-corriente-proveedores', label: 'Cta. Proveedores', icon: Wallet },
    ],
  },
  {
    id: 'almacen',
    label: 'Almacén',
    icon: Boxes,
    items: [
      { path: '/productos', label: 'Productos', icon: Package },
      { path: '/stock-kardex', label: 'Stock / Kardex', icon: Boxes },
    ],
  },
  {
    id: 'tesoreria',
    label: 'Tesorería',
    icon: CircleDollarSign,
    items: [
      { path: '/tesoreria', label: 'Tesorería', icon: CircleDollarSign },
      { path: '/pagos', label: 'Pagos', icon: CreditCard },
      { path: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
    ],
  },
  {
    id: 'equipo',
    label: 'Equipo',
    icon: Users2,
    items: [
      { path: '/maestros', label: 'Vendedores', icon: Users2 },
      { path: '/comisiones', label: 'Comisiones', icon: Award },
    ],
  },
  {
    id: 'informes',
    label: 'Informes',
    icon: BarChart3,
    items: [
      { path: '/reportes', label: 'Reportes', icon: BarChart3 },
      { path: '/auditoria', label: 'Auditoría', icon: History },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: Settings,
    items: [{ path: '/configuracion', label: 'Configuración', icon: ShieldCheck }],
  },
];

/** Devuelve los módulos con sus items filtrados por permisos (oculta vacíos). */
export function getVisibleModules(can) {
  return NAV_MODULES.map((mod) => ({
    ...mod,
    items: mod.items.filter((it) => !it.permission || can?.(it.permission)),
  })).filter((mod) => mod.items.length > 0);
}

/** Match más específico (más largo) de path para soportar rutas anidadas. */
export function findActiveModule(pathname) {
  let best = null;
  for (const mod of NAV_MODULES) {
    for (const item of mod.items) {
      const isMatch =
        item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
      if (isMatch && (!best || item.path.length > best.item.path.length)) {
        best = { module: mod, item };
      }
    }
  }
  return best;
}
