import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

const toneStyles = {
  positive: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: ArrowUpRight,
  },
  negative: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    icon: ArrowDownRight,
  },
  neutral: {
    text: 'text-sky-900',
    bg: 'bg-sky-100/90',
    icon: Minus,
  },
};

export default function StatCard({ title, value, change, tone = 'neutral', icon: Icon, theme = 'light' }) {
  const palette = toneStyles[tone] ?? toneStyles.neutral;
  const TrendIcon = palette.icon;
  const isDark = theme === 'dark';

  return (
    <article
      className={`rounded-2xl p-5 shadow-sm ${
        isDark ? 'border border-slate-800 bg-slate-900' : 'border border-edge-light bg-white/75 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-pastel-muted'}`}>{title}</p>
          <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-pastel-ink'}`}>{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${isDark ? 'bg-indigo-950/60 text-indigo-300' : 'bg-sky-100 text-sky-700'}`}>
          <Icon size={20} />
        </div>
      </div>

      <div className={`mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${palette.bg} ${palette.text}`}>
        <TrendIcon size={14} />
        <span>{change}</span>
      </div>
    </article>
  );
}
