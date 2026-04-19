import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function SalesOverviewChart({ data, theme = 'light', periodLabel = 'ultimos 6 meses' }) {
  const isDark = theme === 'dark';

  return (
    <section
      className={`rounded-2xl p-5 shadow-sm ${
        isDark ? 'border border-slate-800 bg-slate-900' : 'border border-edge-light bg-white/75 backdrop-blur-sm'
      }`}
    >
      <div className="mb-4">
        <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>Ventas vs Gastos</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
          Evolucion mensual de los {periodLabel}
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#c5d8ee'} />
            <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#3a5370'} tickLine={false} axisLine={false} />
            <YAxis stroke={isDark ? '#94a3b8' : '#3a5370'} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#334155' : '#9ebad9'}`,
                backgroundColor: isDark ? '#0f172a' : '#f6f9fc',
                color: isDark ? '#e2e8f0' : '#0c2742',
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="sales" name="Ventas" stroke="#2563eb" fill="url(#salesGradient)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#94a3b8" fill="url(#expenseGradient)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
