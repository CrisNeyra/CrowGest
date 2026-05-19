import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b'];

export default function CategoryChart({ data, theme }) {
  const isDark = theme === 'dark';

  return (
    <section
      className={`rounded-2xl p-5 shadow-sm h-full ${
        isDark ? 'border border-slate-800 bg-slate-900' : 'border border-edge-light bg-white/75 backdrop-blur-sm'
      }`}
    >
      <div className="mb-4">
        <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>
          Ventas por Categoría
        </h3>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>
          Distribución de ingresos según categoría de producto
        </p>
      </div>

      <div className="h-64 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderRadius: '0.75rem',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
                itemStyle={{ color: isDark ? '#e2e8f0' : '#334155' }}
                formatter={(value) => `$${value.toLocaleString()}`}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#475569' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-pastel-muted'}`}>
              No hay datos suficientes
            </p>
          </div>
        )}
      </div>
    </section>
  );
}