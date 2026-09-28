import { useTheme } from '../../hooks/ThemeContext';

export default function ThemeToggle({ className = '', variant = 'button' }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  if (variant === 'sidebar') {
    return (
      <button
        onClick={toggleTheme}
        className={`cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors theme-btn-toggle ${className}`}
        title={`Beralih ke tema ${isLight ? 'Gelap' : 'Terang'}`}
        aria-label="Toggle Theme"
      >
        <div className="flex items-center gap-2">
          {isLight ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="text-amber-500">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="text-sky-400">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          <span>Tema {isLight ? 'Terang' : 'Gelap'}</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-500">
          {isLight ? 'Light' : 'Dark'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center theme-btn-toggle ${className}`}
      title={`Beralih ke tema ${isLight ? 'Gelap' : 'Terang'}`}
      aria-label={`Beralih ke tema ${isLight ? 'Gelap' : 'Terang'}`}
    >
      {isLight ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" className="text-amber-500 transition-transform duration-300 hover:rotate-45">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" className="text-sky-400 transition-transform duration-300 hover:-rotate-12">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
