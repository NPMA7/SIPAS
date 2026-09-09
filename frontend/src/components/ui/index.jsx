export function Badge({ variant = 'neutral', children, className = '' }) {
  const variants = {
    primary: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    neutral: 'bg-slate-800/60 text-slate-300 border-slate-700/60',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant] || variants.neutral} ${className}`}>
      {children}
    </span>
  );
}

export function StatCard({ icon, label, value, variant = 'primary' }) {
  const iconVariants = {
    primary: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    info: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-blue-500/40 rounded-xl p-4 sm:p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${iconVariants[variant] || iconVariants.primary}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">{value ?? '—'}</div>
        <div className="text-xs text-slate-400 font-medium truncate mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export function Loader({ text = 'Memuat...' }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-sm font-medium text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      <span>{text}</span>
    </div>
  );
}

export function EmptyState({ icon = '📭', text = 'Tidak ada data.' }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm font-medium text-slate-400">{text}</div>
    </div>
  );
}
