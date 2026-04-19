import { useMemo, useState } from 'react';
import { CheckCircle2, Package, ShoppingCart, Users, Wallet } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import SalesOverviewChart from '../components/dashboard/SalesOverviewChart';
import StatCard from '../components/dashboard/StatCard';
import TopProductsChart from '../components/dashboard/TopProductsChart';
import { useTheme } from '../context/ThemeContext';
import {
  pendingInvoices,
  recentSales,
  salesVsExpensesData,
  topProductsData,
} from '../data/dashboardMock';

const iconByKey = {
  sales: ShoppingCart,
  wallet: Wallet,
  users: Users,
  package: Package,
};

const periodOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

const channelOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Retail', value: 'retail' },
  { label: 'Mayorista', value: 'wholesale' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export default function Dashboard() {
  const [period, setPeriod] = useState(6);
  const [channel, setChannel] = useState('all');
  const { theme, isDark } = useTheme();

  const filteredSalesData = useMemo(() => salesVsExpensesData.slice(-period), [period]);

  const salesNow = filteredSalesData.at(-1)?.sales ?? 0;
  const salesBefore = filteredSalesData.at(-2)?.sales ?? salesNow;
  const salesGrowth = salesBefore ? ((salesNow - salesBefore) / salesBefore) * 100 : 0;

  const filteredProducts = useMemo(
    () =>
      topProductsData.map((product) => ({
        name: product.name,
        units: product.units[channel] ?? product.units.all,
      })),
    [channel]
  );

  const totalPending = pendingInvoices.reduce((acc, invoice) => acc + invoice.amount, 0);
  const newClients = filteredSalesData.reduce((acc, item) => acc + item.newClients, 0);
  const hasLowStock = filteredProducts.some((product) => product.units < 80);
  const stockStatus = hasLowStock ? 'Revisar stock bajo' : 'Estado OK';

  const kpiData = [
    {
      title: 'Ventas del Mes',
      value: formatCurrency(salesNow),
      change: `${salesGrowth >= 0 ? '+' : ''}${salesGrowth.toFixed(1)}% vs mes anterior`,
      tone: salesGrowth >= 0 ? 'positive' : 'negative',
      icon: 'sales',
    },
    {
      title: 'Por Cobrar',
      value: formatCurrency(totalPending),
      change: `${pendingInvoices.length} facturas pendientes`,
      tone: 'negative',
      icon: 'wallet',
    },
    {
      title: 'Clientes',
      value: `${(1200 + newClients).toLocaleString('es-AR')}`,
      change: `+${newClients} nuevos (${period} meses)`,
      tone: 'positive',
      icon: 'users',
    },
    {
      title: 'Productos',
      value: `${topProductsData.length * 65}`,
      change: stockStatus,
      tone: hasLowStock ? 'negative' : 'neutral',
      icon: 'package',
    },
  ];

  const visibleSales = recentSales.filter((sale) => channel === 'all' || sale.channel === channel);

  return (
    <Layout>
      <Header title="Dashboard" subtitle="Resumen general del negocio" />

      <div className="space-y-6 p-6">
        <div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>
            Dashboard - Resumen general del negocio
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
            Vista ejecutiva con indicadores clave de ventas, clientes y facturacion.
          </p>
        </div>

        <section
          className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 shadow-sm ${
            isDark ? 'border border-slate-800 bg-slate-900' : 'border border-edge-light bg-white/70 backdrop-blur-sm'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-pastel-muted'}`}>Periodo:</span>
            <select
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value))}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-100'
                  : 'border-edge-light bg-pastel-mist text-pastel-ink'
              }`}
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-pastel-muted'}`}>Canal:</span>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-100'
                  : 'border-edge-light bg-pastel-mist text-pastel-ink'
              }`}
            >
              {channelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiData.map((item) => (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              change={item.change}
              tone={item.tone}
              icon={iconByKey[item.icon]}
              theme={theme}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SalesOverviewChart data={filteredSalesData} theme={theme} periodLabel={`${period} meses`} />
          </div>
          <TopProductsChart
            data={filteredProducts}
            theme={theme}
            channelLabel={channelOptions.find((option) => option.value === channel)?.label.toLowerCase() || 'todos'}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section
            className={`rounded-2xl p-5 shadow-sm ${
              isDark ? 'border border-slate-800 bg-slate-900' : 'border border-edge-light bg-white/75 backdrop-blur-sm'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>Ventas Recientes</h3>
              <a href="/ventas" className="text-sm font-medium text-sky-700 transition hover:text-sky-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                Ver todas
              </a>
            </div>

            <div className="space-y-2">
              {visibleSales.map((sale) => (
                <article
                  key={sale.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    isDark ? 'bg-slate-800/70' : 'bg-pastel-mist'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>{sale.number}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>{sale.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>
                      {formatCurrency(sale.amount)}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>{sale.date}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            className={`rounded-2xl p-5 shadow-sm ${
              isDark ? 'border border-slate-800 bg-slate-900' : 'border border-edge-light bg-white/75 backdrop-blur-sm'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>Facturas Pendientes</h3>
              <a href="/facturas" className="text-sm font-medium text-sky-700 transition hover:text-sky-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                Ver todas
              </a>
            </div>

            <div className="space-y-2">
              {pendingInvoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    isDark ? 'bg-slate-800/70' : 'bg-pastel-mist'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>{invoice.number}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>{invoice.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>
                      {formatCurrency(invoice.amount)}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>{invoice.dueDate}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      {invoice.status === 'Pendiente' && <CheckCircle2 size={12} />}
                      {invoice.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
