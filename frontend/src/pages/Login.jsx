import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SipasLogo from '../components/ui/SipasLogo';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [checkingSso, setCheckingSso] = useState(true);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    // 1. Jika token SIPAS sudah ada di localStorage, langsung ke Dashboard
    if (localStorage.getItem('hotspot_token')) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // 2. Seamless SSO: Cek apakah sesi NOCR Gateway aktif via cookie
    let isMounted = true;
    fetch('/api/admin/gateway-sso', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data?.success && data?.token) {
          localStorage.setItem('hotspot_token', data.token);
          if (data.admin) {
            localStorage.setItem('hotspot_admin', JSON.stringify(data.admin));
          }
          navigate('/dashboard', { replace: true });
        } else {
          setCheckingSso(false);
        }
      })
      .catch(() => {
        if (isMounted) setCheckingSso(false);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('hotspot_token', data.token);
        localStorage.setItem('hotspot_admin', JSON.stringify(data.admin));
        navigate('/dashboard', { replace: true });
      } else {
        setError(data.message || 'Login gagal.');
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  // Tampilan loading minimalis saat SSO sedang diperiksa
  if (checkingSso) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 shadow-2xl text-center animate-scaleIn">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
              <SipasLogo size={52} />
            </div>
          </div>
          <h2 className="text-base font-bold text-[var(--text-heading)]">Memverifikasi Sesi NOCR</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Menyambungkan autentikasi terpusat gateway...</p>
          <div className="mt-5 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4 overflow-hidden select-none transition-colors duration-200">
      {/* Theme Toggle Button Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Ambient background glow orbs */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] backdrop-blur-xl rounded-2xl p-8 sm:p-10 shadow-2xl text-center animate-scaleIn">
        {/* Brand Logo */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
            <SipasLogo size={56} />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold px-3 py-0.5 rounded-full tracking-wider uppercase mb-2">
          SIPAS ADMIN PANEL
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
          SIPAS <span className="text-blue-500">Portal</span>
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Sistem Integrasi Portal & Autentikasi Satu-Pintu
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 text-left space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs animate-fadeIn">
              <svg className="shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </span>
              <input
                className="w-full bg-[var(--bg-input)] border border-[var(--input-border)] text-[var(--text-primary)] rounded-lg pl-10 pr-3.5 py-2.5 text-sm placeholder-[var(--input-placeholder)] focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                type="text"
                placeholder="admin"
                autoCapitalize="none"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                className="w-full bg-[var(--bg-input)] border border-[var(--input-border)] text-[var(--text-primary)] rounded-lg pl-10 pr-10 py-2.5 text-sm placeholder-[var(--input-placeholder)] focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer flex items-center justify-center"
              >
                {showPwd ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Masuk...</span>
              </>
            ) : (
              'Masuk ke Dashboard'
            )}
          </button>
        </form>

        <div className="mt-6 text-xs text-slate-500">
          ← Kembali ke <a href="https://sipas.npma.my.id/" className="text-blue-400 hover:text-blue-300 underline font-medium">Captive Portal</a>
        </div>
      </div>
    </div>
  );
}
