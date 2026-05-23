import { useMemo, useState } from 'react';
import { CheckCircle2, Package, ShoppingCart, Users, Wallet } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import SalesOverviewChart from '../components/dashboard/SalesOverviewChart';
import StatCard from '../components/dashboard/StatCard';
import TopProductsChart from '../components/dashboard/TopProductsChart';
import CategoryChart from '../components/dashboard/CategoryChart';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import {
  aggregateCategorySales,
  aggregateSalesVsExpenses,
  aggregateTopProducts,
  countNewClientsInPeriod,
  mapPendingInvoices,
  mapRecentSales,
} from '../utils/dashboardStats';

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

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export default function Dashboard() {
  const { ventas, facturas, clientes, productos, movimientos, getEstadisticas } = useData();
  const [period, setPeriod] = useState(6);
  const { theme, isDark } = useTheme();

  const stats = getEstadisticas();

  const salesVsExpensesData = useMemo(
    () => aggregateSalesVsExpenses(ventas, movimientos, period),
    [ventas, movimientos, period]
  );

  const salesNow = salesVsExpensesData.at(-1)?.sales ?? 0;
  const salesBefore = salesVsExpensesData.at(-2)?.sales ?? salesNow;
  const salesGrowth = salesBefore ? ((salesNow - salesBefore) / salesBefore) * 100 : 0;

  const topProducts = useMemo(
    () => aggregateTopProducts(ventas, productos, period),
    [ventas, productos, period]
  );

  const newClients = useMemo(
    () => countNewClientsInPeriod(clientes, period),
    [clientes, period]
  );

  const pendingInvoicesList = useMemo(
    () => mapPendingInvoices(facturas, clientes),
    [facturas, clientes]
  );

  const recentSalesList = useMemo(
    () => mapRecentSales(ventas, clientes),
    [ventas, clientes]
  );

  const categoryData = useMemo(
    () => aggregateCategorySales(ventas, productos),
    [ventas, productos]
  );

  const stockStatus =
    stats.productosStockBajo > 0
      ? `${stats.productosStockBajo} con stock bajo`
      : 'Estado OK';

  const kpiData = [
    {
      title: 'Ventas del Mes',
      value: formatCurrency(stats.totalVentasMes),
      change: `${salesGrowth >= 0 ? '+' : ''}${salesGrowth.toFixed(1)}% vs mes anterior`,
      tone: salesGrowth >= 0 ? 'positive' : 'negative',
      icon: 'sales',
    },
    {
      title: 'Por Cobrar',
      value: formatCurrency(stats.totalPorCobrar),
      change: `${pendingInvoicesList.length} facturas pendientes`,
      tone: 'negative',
      icon: 'wallet',
    },
    {
      title: 'Clientes',
      value: stats.totalClientes.toLocaleString('es-AR'),
      change: `+${newClients} nuevos (${period} meses)`,
      tone: 'positive',
      icon: 'users',
    },
    {
      title: 'Productos',
      value: stats.totalProductos.toLocaleString('es-AR'),
      change: stockStatus,
      tone: stats.productosStockBajo > 0 ? 'negative' : 'neutral',
      icon: 'package',
    },
  ];

  const periodLabel = periodOptions.find((o) => o.value === period)?.label ?? `${period} meses`;

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
            <SalesOverviewChart data={salesVsExpensesData} theme={theme} periodLabel={periodLabel} />
          </div>
          <div className="flex flex-col gap-6">
            <TopProductsChart data={topProducts} theme={theme} periodLabel={periodLabel} />
            <CategoryChart data={categoryData} theme={theme} />
          </div>
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
              {recentSalesList.length === 0 ? (
                <p className={`py-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
                  No hay ventas registradas
                </p>
              ) : (
                recentSalesList.map((sale) => (
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
                ))
              )}
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
              {pendingInvoicesList.length === 0 ? (
                <p className={`py-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
                  No hay facturas pendientes de cobro
                </p>
              ) : (
                pendingInvoicesList.map((invoice) => (
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
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {invoice.isPending && <CheckCircle2 size={12} />}
                        {invoice.status}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
