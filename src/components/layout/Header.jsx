import { useEffect, useMemo, useState } from 'react';
import { Bell, Moon, Search, Settings, Sun, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const quickLinks = [
  { label: 'Menu Principal', path: '/', keywords: 'dashboard inicio principal resumen' },
  { label: 'Clientes', path: '/clientes', keywords: 'clientes cuenta corriente deuda' },
  { label: 'Productos', path: '/productos', keywords: 'productos stock precios catalogo' },
  { label: 'Pedidos', path: '/pedidos', keywords: 'pedidos ventas autorizacion' },
  { label: 'Pedidos a facturar', path: '/pedidos-a-facturar', keywords: 'facturar pedidos autorizados' },
  { label: 'Comprobantes', path: '/comprobantes', keywords: 'facturas cae fiscal afip' },
  { label: 'Tesorería', path: '/tesoreria', keywords: 'caja bancos recibos pagos conciliacion' },
  { label: 'Reportes', path: '/reportes', keywords: 'reportes comerciales financieros pdf excel' },
  { label: 'Comisiones', path: '/comisiones', keywords: 'vendedores comisiones cobranzas' },
  { label: 'Auditoría', path: '/auditoria', keywords: 'trazabilidad audit log acciones' },
  { label: 'Configuración', path: '/configuracion', keywords: 'usuarios permisos roles deploy' },
];

export default function Header({ title, subtitle }) {
  const [dolar, setDolar] = useState({ blue: { venta: 1220 }, oficial: { venta: 1090 } });
  const [marketData, setMarketData] = useState({
    merval: { valor: 2788517, variacion: 0.5 },
    riesgoPais: { valor: 519 },
  });
  const [marketIndex, setMarketIndex] = useState(0);
  const [quickSearch, setQuickSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { productos = [], facturas = [], pedidos = [] } = useData();

  const quickResults = useMemo(() => {
    const term = quickSearch.trim().toLowerCase();
    if (!term) return quickLinks.slice(0, 5);
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const marketItems = useMemo(
    () => [
      {
        label: 'Blue',
        value: `$${dolar.blue?.venta?.toLocaleString('es-AR')}`,
        detail: `Oficial $${dolar.oficial?.venta?.toLocaleString('es-AR')}`,
      },
      {
        label: 'MERVAL',
        value: Number(marketData.merval.valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 }),
        detail: `${Number(marketData.merval.variacion || 0) >= 0 ? '+' : ''}${Number(marketData.merval.variacion || 0).toFixed(2)}%`,
      },
      {
        label: 'Riesgo país',
        value: `${Number(marketData.riesgoPais.valor || 0).toLocaleString('es-AR')} pb`,
        detail: 'Argentina',
      },
    ],
    [dolar, marketData]
  );
  const activeMarket = marketItems[marketIndex % marketItems.length];

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const [dolarRes, riesgoRes, mervalRes] = await Promise.allSettled([
          fetch('https://dolarapi.com/v1/dolares'),
          fetch('https://argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo'),
          fetch('https://api5.rava.com/cotizaciones?especie=MERVAL'),
        ]);

        const data = dolarRes.status === 'fulfilled' ? await dolarRes.value.json() : [];
        setDolar({
          blue: data.find(d => d.casa === 'blue') || { venta: 1220 },
          oficial: data.find(d => d.casa === 'oficial') || { venta: 1090 }
        });

        const riesgo = riesgoRes.status === 'fulfilled' ? await riesgoRes.value.json() : null;
        const merval = mervalRes.status === 'fulfilled' ? await mervalRes.value.json() : null;
        const mervalRow = Array.isArray(merval?.body) ? merval.body[0] : Array.isArray(merval) ? merval[0] : merval;

        setMarketData((prev) => ({
          merval: {
            valor: Number(mervalRow?.ultimo || mervalRow?.precio || prev.merval.valor),
            variacion: Number(mervalRow?.variacion || prev.merval.variacion),
          },
          riesgoPais: {
            valor: Number(riesgo?.valor || prev.riesgoPais.valor),
          },
        }));
      } catch (e) {
        console.log('Usando valores de fallback');
      }
    };
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketIndex((value) => value + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-edge-light bg-sidebar-light/95 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div>
        <h1 className="text-lg font-semibold text-pastel-ink dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-pastel-muted dark:text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={18} />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            onFocus={() => setShowNotifications(false)}
            placeholder="Ir a clientes, reportes, auditoría..."
            className="w-80 rounded-xl border border-edge-light bg-white/65 py-2 pl-10 pr-4 text-sm text-pastel-ink placeholder:text-pastel-muted focus:border-sky-500 focus:bg-white/85 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {quickSearch && (
            <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-edge-light bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {quickResults.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setQuickSearch('')}
                  className="block px-4 py-3 text-sm text-pastel-ink transition hover:bg-pastel-mist dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {item.label}
                </Link>
              ))}
              {!quickResults.length && (
                <p className="px-4 py-3 text-sm text-pastel-muted">Sin accesos encontrados</p>
              )}
            </div>
          )}
        </div>

        <div className="hidden min-w-[210px] items-center justify-between gap-3 rounded-xl border border-edge-light bg-white/65 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 lg:flex">
          <span className="font-medium text-pastel-muted dark:text-slate-400">{activeMarket.label}</span>
          <span className="font-semibold text-pastel-ink dark:text-slate-100">{activeMarket.value}</span>
          <span className="text-pastel-muted dark:text-slate-500">{activeMarket.detail}</span>
        </div>

        <button
          onClick={toggleTheme}
          className="rounded-xl border border-edge-light bg-white/70 p-2 text-pastel-ink transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label="Cambiar tema"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((value) => !value)}
            className="relative rounded-xl border border-edge-light bg-white/70 p-2 text-pastel-ink transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Alertas operativas"
          >
            <Bell size={19} />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-edge-light bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-edge-light px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-pastel-ink dark:text-slate-100">Alertas</p>
              </div>
              {notifications.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setShowNotifications(false)}
                  className={`block px-4 py-3 text-sm transition hover:bg-pastel-mist dark:hover:bg-slate-800 ${
                    item.tone === 'danger' ? 'text-rose-600 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {!notifications.length && (
                <p className="px-4 py-4 text-sm text-pastel-muted">Sin alertas pendientes</p>
              )}
            </div>
          )}
        </div>

        <Link
          to="/configuracion"
          className="flex items-center gap-2 rounded-xl border border-edge-light bg-white/70 px-2.5 py-1.5 text-pastel-ink transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          title="Configuración"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-indigo-500/20">
            <Settings size={16} />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold">Config.</p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
          title="Cerrar sesión"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
            <LogOut size={16} />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold">Salir</p>
          </div>
        </button>
      </div>
    </header>
  );
}
