import { useState, useEffect } from 'react';
import SipasLogo from '../../components/ui/SipasLogo';

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
    } catch (err) {
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
    <div style={{
      ...styles.page,
      background: isImageBg ? '#060911' : (settings.bg_color || 'var(--bg-body)'),
    }}>
      {/* Background Image Container */}
      {isImageBg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `url(${settings.bg_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: settings.bg_blur > 0 ? `blur(${settings.bg_blur}px)` : 'none',
            transform: settings.bg_blur > 0 ? 'scale(1.05)' : 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Background Overlay */}
      {isImageBg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000000',
            opacity: overlayOpacity,
            zIndex: 0,
          }}
        />
      )}

      {/* Decorative ambient lights if color mode */}
      {!isImageBg && (
        <>
          <div style={styles.orb1} />
          <div style={styles.orb2} />
        </>
      )}

      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div style={styles.logo}>
            {settings.logo_type === 'custom' && settings.logo_custom ? (
              <img
                src={settings.logo_custom}
                alt="Portal Logo"
                style={{ maxHeight: 72, maxWidth: 180, objectFit: 'contain', marginBottom: 6 }}
              />
            ) : (
              <SipasLogo size={64} />
            )}
          </div>
          <h1 style={styles.title}>
            {settings.portal_title || 'Portal SIPAS'}
          </h1>
          <p style={styles.subTitle}>
            {settings.portal_subtitle || 'Sistem Integrasi Portal & Autentikasi Satu-Pintu'}
          </p>
        </div>

        <div style={{
          ...styles.card,
          backgroundColor: `rgba(17, 24, 39, ${cardOpacity})`,
          backdropFilter: cardOpacity < 1 ? 'blur(16px)' : 'none',
        }}>
          {/* Network Info */}
          <div style={styles.netInfo}>
            <div style={styles.netItem}>
              <div style={styles.netLabel}>IP ANDA</div>
              <div style={styles.netValue}>{params.ip || 'Deteksi...'}</div>
            </div>
            <div style={styles.netDivider} />
            <div style={styles.netItem}>
              <div style={styles.netLabel}>MAC</div>
              <div style={styles.netValue}>{params.mac || 'N/A'}</div>
            </div>
            <div style={styles.netDivider} />
            <div style={styles.netItem}>
              <div style={styles.netLabel}>STATUS</div>
              <div style={styles.netValue}>
                <span style={{
                  ...styles.statusDot,
                  backgroundColor: status === 'connected' ? 'var(--success)' : status === 'failed' ? 'var(--danger)' : 'var(--warning)',
                  animation: status === 'authenticating' ? 'blink 1.5s ease-in-out infinite' : 'none'
                }} />
                {status === 'waiting' && 'Menunggu'}
                {status === 'authenticating' && 'Verifikasi...'}
                {status === 'connected' && 'Terhubung'}
                {status === 'failed' && 'Gagal'}
              </div>
            </div>
          </div>

          {alert && (
            <div style={{
              ...styles.alert,
              background: alert.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              borderColor: alert.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
              color: alert.type === 'error' ? '#fca5a5' : '#6ee7b7',
            }}>
              {alert.msg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  className="input"
                  style={{ paddingLeft: 38 }}
                  type="text"
                  placeholder="Masukkan username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoCapitalize="none"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  className="input"
                  style={{ paddingLeft: 38, paddingRight: 40 }}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={styles.eyeBtn}
                >
                  {showPwd
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                width: '100%',
                padding: '12px',
                marginTop: 10,
                fontSize: '0.9rem',
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                color: '#ffffff',
                fontWeight: 600,
              }}
              disabled={loading}
            >
              {loading ? <><div className="loader-ring" style={{ width: 16, height: 16, borderWidth: 2 }} /> Menyambungkan...</> : 'Masuk ke Internet'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <p>{settings.footer_text || 'Butuh bantuan? Hubungi administrator jaringan'}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: { position: 'fixed', top: '-15%', left: '-10%', width: 500, height: 500, background: 'rgba(37,99,235,0.04)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 },
  orb2: { position: 'fixed', bottom: '-20%', right: '-10%', width: 600, height: 600, background: 'rgba(2,132,199,0.03)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 },
  wrapper: { width: '100%', maxWidth: 430, position: 'relative', zIndex: 1 },
  header: { textAlign: 'center', marginBottom: 20 },
  logo: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 12px',
  },
  title: { fontSize: '1.4rem', fontWeight: 800, marginBottom: 4, color: 'var(--text-main)' },
  subTitle: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
  card: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 20px',
    boxShadow: 'var(--shadow-card)',
  },
  netInfo: {
    display: 'flex',
    gap: 8,
    padding: 12,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 20,
  },
  netItem: { flex: 1, textAlign: 'center' },
  netLabel: { fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 },
  netValue: { fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600, fontFamily: 'monospace' },
  netDivider: { width: 1, background: 'var(--border)', alignSelf: 'stretch' },
  statusDot: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 5, verticalAlign: 'middle' },
  alert: {
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.8rem',
    marginBottom: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 12, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    display: 'flex', alignItems: 'center',
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: '0.75rem', color: 'var(--text-secondary)' },
};
