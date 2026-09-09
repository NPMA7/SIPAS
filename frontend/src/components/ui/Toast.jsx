export default function Toast({ toasts }) {
  const icons = {
    success: (
      <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3.5 shadow-2xl pointer-events-auto transition-all animate-slideIn"
        >
          {icons[t.type] || icons.info}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-100">{t.title}</div>
            {t.msg && <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
