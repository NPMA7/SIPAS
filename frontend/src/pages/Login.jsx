import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SipasLogo from '../components/ui/SipasLogo';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('hotspot_token')) navigate('/manage/admin');
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
        navigate('/manage/admin');
      } else {
        setError(data.message || 'Login gagal.');
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Ambient background glow orbs */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl rounded-2xl p-8 sm:p-10 shadow-2xl text-center animate-scaleIn">
        {/* Brand Logo */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
            <SipasLogo size={56} />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold px-3 py-0.5 rounded-full tracking-wider uppercase mb-2">
          SIPAS ADMIN PANEL
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          SIPAS <span className="text-blue-400">Portal</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </span>
              <input
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-10 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center"
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
          ← Kembali ke <a href="/" className="text-blue-400 hover:text-blue-300 underline font-medium">Captive Portal</a>
        </div>
      </div>
    </div>
  );
}
