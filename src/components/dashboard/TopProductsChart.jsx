import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function TopProductsChart({ data, theme = 'light', channelLabel = 'todos los canales' }) {
  const isDark = theme === 'dark';

  return (
    <section
      className={`rounded-2xl p-5 shadow-sm ${
        isDark ? 'border border-slate-800 bg-slate-900' : 'border border-edge-light bg-white/75 backdrop-blur-sm'
      }`}
    >
      <div className="mb-4">
        <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>Productos mas vendidos</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
          Unidades vendidas en {channelLabel}
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#c5d8ee'} />
            <XAxis type="number" stroke={isDark ? '#94a3b8' : '#3a5370'} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="name"
              type="category"
              stroke={isDark ? '#94a3b8' : '#3a5370'}
              tickLine={false}
              axisLine={false}
              width={130}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#334155' : '#9ebad9'}`,
                backgroundColor: isDark ? '#0f172a' : '#f6f9fc',
                color: isDark ? '#e2e8f0' : '#0c2742',
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
              }}
            />
            <Bar dataKey="units" name="Unidades" fill="#0284c7" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
