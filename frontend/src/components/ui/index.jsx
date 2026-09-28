export function Badge({ variant = 'neutral', children, className = '' }) {
  const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    danger: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-info',
    neutral: 'badge-neutral',
  };

  return (
    <span className={`badge ${variants[variant] || 'badge-neutral'} ${className}`}>
      {children}
    </span>
  );
}

export function StatCard({ icon, label, value, variant = 'primary' }) {
  const iconVariants = {
    primary: 'stat-icon-primary',
    success: 'stat-icon-success',
    warning: 'stat-icon-warning',
    info: 'stat-icon-info',
  };

  return (
    <div className="card-stat-box flex items-center gap-4 transition-all duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${iconVariants[variant] || iconVariants.primary}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl sm:text-2xl font-bold stat-card-value tracking-tight">{value ?? '—'}</div>
        <div className="text-xs stat-card-label font-medium truncate mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export function Loader({ text = 'Memuat...' }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-sm font-medium loader-text">
      <div className="w-5 h-5 border-2 loader-spinner rounded-full animate-spin" />
      <span>{text}</span>
    </div>
  );
}

export function EmptyState({ icon, text = 'Tidak ada data.' }) {
  const defaultIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28" className="empty-state-icon">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M16 2H8a2 2 0 0 0-2 2v3h12V4a2 2 0 0 0-2-2z" />
    </svg>
  );

  return (
    <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-2xl empty-state-icon-box flex items-center justify-center mb-3">
        {icon || defaultIcon}
      </div>
      <div className="text-sm font-medium empty-state-text">{text}</div>
    </div>
  );
}
