import { useEffect, useState } from 'react';
import { Bell, Moon, Search, Sun, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ title, subtitle }) {
  const [dolar, setDolar] = useState({ blue: { venta: 1220 }, oficial: { venta: 1090 } });
  const { isDark, toggleTheme } = useTheme();

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
            placeholder="Buscar clientes, ventas o facturas..."
            className="w-80 rounded-xl border border-edge-light bg-white/65 py-2 pl-10 pr-4 text-sm text-pastel-ink placeholder:text-pastel-muted focus:border-sky-500 focus:bg-white/85 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="hidden items-center gap-3 rounded-xl border border-edge-light bg-white/65 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 lg:flex">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-pastel-muted dark:text-slate-400">Blue</span>
            <span className="font-semibold text-pastel-ink dark:text-slate-100">
              ${dolar.blue?.venta?.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="h-4 w-px bg-edge-light/80 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-pastel-muted dark:text-slate-400">Oficial</span>
            <span className="font-semibold text-pastel-ink dark:text-slate-100">
              ${dolar.oficial?.venta?.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="rounded-xl border border-edge-light bg-white/70 p-2 text-pastel-ink transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label="Cambiar tema"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="relative rounded-xl border border-edge-light bg-white/70 p-2 text-pastel-ink transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <button
          className="flex items-center gap-3 rounded-xl border border-edge-light bg-white/70 px-2.5 py-1.5 transition hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white dark:bg-indigo-600">
            <User size={16} />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold text-pastel-ink dark:text-slate-100">Admin</p>
            <p className="text-xs text-pastel-muted dark:text-slate-400">Administrador</p>
          </div>
        </button>
      </div>
    </header>
  );
}
