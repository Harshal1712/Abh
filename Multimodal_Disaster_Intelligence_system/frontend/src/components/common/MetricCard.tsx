import type { LucideIcon } from 'lucide-react';

type MetricTone = 'danger' | 'info' | 'warning' | 'primary';

interface MetricCardProps {
  label: string;
  value: number;
  badge: string;
  detail: string;
  icon: LucideIcon;
  tone: MetricTone;
}

const toneClasses: Record<MetricTone, { icon: string; badge: string; accent: string }> = {
  danger: {
    icon: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    accent: 'from-rose-500 to-orange-400',
  },
  info: {
    icon: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    accent: 'from-sky-500 to-cyan-400',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    accent: 'from-amber-500 to-orange-400',
  },
  primary: {
    icon: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
    accent: 'from-indigo-500 to-violet-400',
  },
};

export const MetricCard = ({ label, value, badge, detail, icon: Icon, tone }: MetricCardProps) => {
  const styles = toneClasses[tone];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,.10)]">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${styles.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">{label}</span>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${styles.icon}`}><Icon className="h-5 w-5" /></span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-3xl font-black tracking-tight text-slate-950">{value}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}>{badge}</span>
      </div>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-500">{detail}</p>
    </article>
  );
};
