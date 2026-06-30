import { useEffect, useMemo, useState } from 'react';
import { Bell, HelpCircle, LogOut, Moon, Search, Sun, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const EMPRESA = 'Gest Crow';

const quickLinks = [
  { label: 'Panel principal', path: '/', keywords: 'dashboard inicio principal resumen' },
  { label: 'Clientes', path: '/clientes', keywords: 'clientes cuenta corriente deuda' },
  { label: 'Productos', path: '/productos', keywords: 'productos stock precios catalogo' },
  { label: 'Pedidos', path: '/pedidos', keywords: 'pedidos ventas autorizacion' },
  { label: 'A Facturar', path: '/pedidos-a-facturar', keywords: 'facturar pedidos facturas fiscal cae afip' },
  { label: 'Tesorería', path: '/tesoreria', keywords: 'caja bancos recibos pagos conciliacion' },
  { label: 'Reportes', path: '/reportes', keywords: 'reportes comerciales financieros pdf excel' },
  { label: 'Comisiones', path: '/comisiones', keywords: 'vendedores comisiones cobranzas' },
  { label: 'Auditoría', path: '/auditoria', keywords: 'trazabilidad audit log acciones' },
  { label: 'Configuración', path: '/configuracion', keywords: 'usuarios permisos roles deploy' },
];

export default function TopBar() {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const { profile } = usePermissions();
  const { productos = [], facturas = [], pedidos = [] } = useData();
  const [quickSearch, setQuickSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [dolar, setDolar] = useState({ blue: { venta: 1220 }, oficial: { venta: 1090 } });

  const usuarioLabel = profile?.nombre || currentUser?.email?.split('@')[0] || 'Usuario';
  const rolLabel = profile?.rol ? ` · ${profile.rol}` : '';

  const quickResults = useMemo(() => {
    const term = quickSearch.trim().toLowerCase();
    if (!term) return [];
    return quickLinks
      .filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(term))
      .slice(0, 6);
  }, [quickSearch]);

  const notifications = useMemo(() => {
    const now = new Date();
    const stockBajo = productos.filter((p) => (Number(p.stock) || 0) <= (Number(p.stockMinimo) || 0));
    const facturasVencidas = facturas.filter(
      (f) =>
        (Number(f.saldoPendiente) || 0) > 0 &&
        f.fechaVencimiento &&
        new Date(f.fechaVencimiento) < now
    );
    const pedidosPendientes = pedidos.filter((p) => p.estado === 'pending');
    return [
      stockBajo.length
        ? { label: `${stockBajo.length} productos con stock bajo`, path: '/stock-kardex', tone: 'warning' }
        : null,
      facturasVencidas.length
        ? { label: `${facturasVencidas.length} facturas vencidas`, path: '/cuenta-corriente', tone: 'danger' }
        : null,
      pedidosPendientes.length
        ? { label: `${pedidosPendientes.length} pedidos pendientes`, path: '/pedidos', tone: 'warning' }
        : null,
    ].filter(Boolean);
  }, [facturas, pedidos, productos]);

  useEffect(() => {
    const fetchDolar = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares');
        const data = await res.json();
        setDolar({
          blue: data.find((d) => d.casa === 'blue') || { venta: 1220 },
          oficial: data.find((d) => d.casa === 'oficial') || { venta: 1090 },
        });
      } catch {
        // mantiene fallback
      }
    };
    fetchDolar();
    const interval = setInterval(fetchDolar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <header className="cg-topbar">
      <Link to="/" className="flex items-center gap-3">
        <BrandLogo size="xs" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-cg-primaryDark dark:text-indigo-300">Gest Crow</p>
          <p className="text-[0.65rem] font-medium uppercase tracking-widest text-cg-muted dark:text-slate-500">
            Versión PRO
          </p>
        </div>
      </Link>

      <div className="hidden items-center gap-2 text-sm md:flex">
        <span className="text-cg-muted dark:text-slate-400">Empresa:</span>
        <span className="font-semibold text-cg-ink dark:text-slate-100">{EMPRESA}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-muted" size={16} />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Buscar módulo..."
            className="w-56 rounded-lg border border-cg-panelBorder bg-cg-panel py-1.5 pl-9 pr-3 text-sm text-cg-ink placeholder:text-cg-muted focus:border-cg-primary focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {quickResults.length > 0 && (
            <div className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-lg border border-cg-panelBorder bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {quickResults.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setQuickSearch('')}
                  className="block px-4 py-2.5 text-sm text-cg-ink transition hover:bg-cg-panel dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-cg-panelBorder bg-cg-panel px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 xl:flex">
          <span className="font-medium text-cg-muted dark:text-slate-400">Blue</span>
          <span className="font-semibold text-cg-ink dark:text-slate-100">
            ${dolar.blue?.venta?.toLocaleString('es-AR')}
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="rounded-lg border border-cg-panelBorder bg-cg-panel p-2 text-cg-ink transition hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Cambiar tema"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            className="relative rounded-lg border border-cg-panelBorder bg-cg-panel p-2 text-cg-ink transition hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Alertas operativas"
          >
            <Bell size={16} />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-lg border border-cg-panelBorder bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-cg-panelBorder px-4 py-2.5 dark:border-slate-800">
                <p className="text-sm font-semibold text-cg-ink dark:text-slate-100">Alertas</p>
              </div>
              {notifications.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setShowNotifications(false)}
                  className={`block px-4 py-2.5 text-sm transition hover:bg-cg-panel dark:hover:bg-slate-800 ${
                    item.tone === 'danger' ? 'text-rose-600 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {!notifications.length && (
                <p className="px-4 py-4 text-sm text-cg-muted">Sin alertas pendientes</p>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-cg-panelBorder bg-cg-panel px-3 py-1.5 sm:flex dark:border-slate-700 dark:bg-slate-800">
          <UserRound size={16} className="text-cg-primaryDark dark:text-indigo-300" />
          <span className="text-sm font-medium text-cg-ink dark:text-slate-100">
            {usuarioLabel}
            <span className="text-cg-muted dark:text-slate-400">{rolLabel}</span>
          </span>
        </div>

        <a
          href="https://github.com/CrisNeyra/CrowGest#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-cg-panelBorder bg-cg-panel p-2 text-cg-ink transition hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          title="Ayuda"
        >
          <HelpCircle size={16} />
        </a>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
          title="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
