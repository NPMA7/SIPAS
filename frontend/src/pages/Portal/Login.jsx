import { useState, useEffect } from 'react';
import SipasLogo from '../../components/ui/SipasLogo';

function hexToRgba(hex, opacity) {
  if (!hex || !hex.startsWith('#')) return `rgba(17, 24, 39, ${opacity})`;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(17, 24, 39, ${opacity})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function PortalLogin() {
  const [params, setParams] = useState({ ip: '', mac: '', linkLogin: '', linkLoginOnly: '', dst: '', error: '' });
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('waiting'); // waiting, authenticating, connected, failed
  const [alert, setAlert] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [settings, setSettings] = useState({
    portal_title: 'Portal SIPAS',
    portal_subtitle: 'Sistem Integrasi Portal & Autentikasi Satu-Pintu',
    bg_type: 'color',
    bg_color: '#0a0e1a',
    bg_image: null,
    bg_blur: 0,
    bg_overlay_opacity: 60,
    card_bg_color: '#111827',
    card_opacity: 95,
    primary_color: '#2563eb',
    logo_type: 'default',
    logo_custom: null,
    footer_text: 'Butuh bantuan? Hubungi administrator jaringan',
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setParams({
      ip: urlParams.get('ip') || '',
      mac: urlParams.get('mac') || '',
      linkLogin: urlParams.get('link-login') || '',
      linkLoginOnly: urlParams.get('link-login-only') || '',
      dst: urlParams.get('dst') || '',
      error: urlParams.get('error') || '',
    });
    if (urlParams.get('error')) {
      setAlert({ type: 'error', msg: urlParams.get('error') });
    }

    // Fetch portal settings
    fetch('/api/portal-settings')
      .then(res => res.json())
      .then(data => {
        if (data?.success && data?.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert(null);

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setAlert({ type: 'error', msg: 'Username dan password tidak boleh kosong.' });
      return;
    }

    setLoading(true);
    setStatus('authenticating');

    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          ip: params.ip,
          mac: params.mac,
          link_login: params.linkLogin,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('connected');
        setAlert({
          type: 'success',
          msg: `Selamat datang, ${data.data?.full_name || username}! Menghubungkan ke internet...`,
        });

        setTimeout(() => {
          let targetDst = params.dst;

          if (!targetDst && params.linkLogin) {
            try {
              const linkUrl = new URL(params.linkLogin);
              targetDst = linkUrl.searchParams.get('dst') || '';
            } catch (_) {}
          }

          const rawDst = decodeURIComponent(targetDst || '');

          if (
            !targetDst ||
            rawDst.includes('$(dst)') ||
            rawDst.includes('192.168.') ||
            rawDst.includes('10.10.') ||
            rawDst.includes('hotspot.net') ||
            rawDst.includes('connecttest') ||
            rawDst.includes('generate_204') ||
            rawDst.includes('gstatic') ||
            rawDst.includes('apple.com') ||
            rawDst.includes('msftconnecttest')
          ) {
            targetDst = 'https://www.google.com';
          }

          window.location.replace(targetDst);
        }, 500);
      } else {
        setStatus('failed');
        setAlert({ type: 'error', msg: data.message || 'Login gagal. Periksa username dan password.' });
        setLoading(false);
      }
    } catch {
      setStatus('failed');
      setAlert({ type: 'error', msg: 'Tidak dapat terhubung ke server portal.' });
      setLoading(false);
    }
  }

  // Dynamic Background style
  const isImageBg = settings.bg_type === 'image' && settings.bg_image;
  const overlayOpacity = (settings.bg_overlay_opacity ?? 60) / 100;
  const cardOpacity = (settings.card_opacity ?? 95) / 100;
  const primaryColor = settings.primary_color || '#2563eb';

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        backgroundColor: isImageBg ? '#060911' : (settings.bg_color || '#0b0f19'),
      }}
    >
      {/* Background Image Container */}
      {isImageBg && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{
            backgroundImage: `url(${settings.bg_image})`,
            filter: settings.bg_blur > 0 ? `blur(${settings.bg_blur}px)` : 'none',
            transform: settings.bg_blur > 0 ? 'scale(1.05)' : 'none',
          }}
        />
      )}

      {/* Background Overlay */}
      {isImageBg && (
        <div
          className="fixed inset-0 bg-black z-0"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Ambient Orbs */}
      {!isImageBg && (
        <>
          <div className="fixed -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      <div className="relative z-10 w-full max-w-md animate-scaleIn">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center mb-3">
            {settings.logo_type === 'custom' && settings.logo_custom ? (
              <img
                src={settings.logo_custom}
                alt="Portal Logo"
                className="max-h-18 max-w-44 object-contain mb-1.5"
              />
            ) : (
              <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
                <SipasLogo size={56} />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            {settings.portal_title || 'Portal SIPAS'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {settings.portal_subtitle || 'Sistem Integrasi Portal & Autentikasi Satu-Pintu'}
          </p>
        </div>

        {/* Login Card */}
        <div
          className="border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-2xl"
          style={{
            backgroundColor: hexToRgba(settings.card_bg_color || '#111827', cardOpacity),
            backdropFilter: cardOpacity < 1 ? 'blur(16px)' : 'none',
          }}
        >
          {/* Network Info Pills */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl mb-5 text-center">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IP ANDA</div>
              <div className="text-xs font-mono font-semibold text-slate-200 truncate mt-0.5">{params.ip || 'Deteksi...'}</div>
            </div>
            <div className="w-px h-6 bg-slate-800 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MAC</div>
              <div className="text-xs font-mono font-semibold text-slate-200 truncate mt-0.5">{params.mac || 'N/A'}</div>
            </div>
            <div className="w-px h-6 bg-slate-800 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STATUS</div>
              <div className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    status === 'connected'
                      ? 'bg-emerald-500'
                      : status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-amber-500 animate-pulse'
                  }`}
                />
                <span className="truncate">
                  {status === 'waiting' && 'Menunggu'}
                  {status === 'authenticating' && 'Verifikasi...'}
                  {status === 'connected' && 'Terhubung'}
                  {status === 'failed' && 'Gagal'}
                </span>
              </div>
            </div>
          </div>

          {alert && (
            <div
              className={`p-3 rounded-lg border text-xs mb-4 flex items-center gap-2 animate-fadeIn ${
                alert.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span className="shrink-0 font-bold">{alert.type === 'error' ? '⚠️' : '✓'}</span>
              <span>{alert.msg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  type="text"
                  placeholder="Masukkan username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoCapitalize="none"
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
                  placeholder="Masukkan password"
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
              className="w-full mt-3 py-2.5 px-4 text-white text-sm font-bold rounded-lg shadow-lg hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 4px 15px ${hexToRgba(primaryColor, 0.35)}`,
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyambungkan...</span>
                </>
              ) : (
                'Masuk ke Internet'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 text-xs text-slate-400">
          <p>{settings.footer_text || 'Butuh bantuan? Hubungi administrator jaringan'}</p>
        </div>
      </div>
    </div>
  );
}
