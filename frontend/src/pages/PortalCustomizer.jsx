import { useState, useEffect, useContext, useMemo } from 'react';
import { apiFetch, apiPut, apiPost } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import SipasLogo from '../components/ui/SipasLogo';

const COLOR_PRESETS = [
  { label: 'Deep Navy', value: '#0a0e1a' },
  { label: 'Midnight Blue', value: '#030712' },
  { label: 'Charcoal Slate', value: '#0f172a' },
  { label: 'Dark Emerald', value: '#041d18' },
  { label: 'Pure Dark', value: '#000000' },
];

const BUTTON_PRESETS = [
  { label: 'Primary Blue', value: '#2563eb' },
  { label: 'Sky Blue', value: '#0284c7' },
  { label: 'Cyan Ocean', value: '#0891b2' },
  { label: 'Emerald Green', value: '#059669' },
  { label: 'Amber Gold', value: '#d97706' },
  { label: 'Slate Steel', value: '#475569' },
];

export default function PortalCustomizer() {
  const { addToast } = useContext(ToastContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop | mobile

  // Role info
  const currentAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('hotspot_admin') || '{}');
    } catch {
      return {};
    }
  }, []);
  const isVisitor = currentAdmin?.role === 'visitor';

  // Form settings state
  const [form, setForm] = useState({
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

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/portal-settings');
      if (res?.success && res?.data) {
        setForm(prev => ({
          ...prev,
          ...res.data,
          bg_blur: Number(res.data.bg_blur) || 0,
          bg_overlay_opacity: Number(res.data.bg_overlay_opacity) || 60,
          card_opacity: Number(res.data.card_opacity) || 95,
        }));
      }
    } catch (err) {
      addToast('Gagal memuat pengaturan portal.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Handle Background Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('File harus berupa gambar (JPG, PNG, WebP).', 'warning');
      return;
    }

    if (file.size > 3.5 * 1024 * 1024) {
      addToast('Ukuran gambar maksimal 3.5 MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({
        ...prev,
        bg_type: 'image',
        bg_image: reader.result,
      }));
      addToast('Gambar latar belakang berhasil dimuat.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Handle Custom Logo Upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('File harus berupa gambar logo.', 'warning');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast('Ukuran logo maksimal 2 MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({
        ...prev,
        logo_type: 'custom',
        logo_custom: reader.result,
      }));
      addToast('Logo kustom berhasil dimuat.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (isVisitor) {
      addToast('Mode Visitor: Anda tidak memiliki izin untuk menyimpan perubahan.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await apiPut('/portal-settings', form);
      if (res?.success) {
        addToast(res.message || 'Pengaturan tampilan portal berhasil disimpan!', 'success');
      } else {
        addToast(res?.message || 'Gagal menyimpan pengaturan.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal terhubung ke server.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (isVisitor) {
      addToast('Mode Visitor: Aksi ditolak.', 'warning');
      return;
    }
    if (!window.confirm('Kembalikan semua pengaturan tampilan portal ke default bawaan SIPAS?')) {
      return;
    }

    try {
      setSaving(true);
      const res = await apiPost('/portal-settings/reset', {});
      if (res?.success) {
        addToast('Pengaturan portal berhasil direset ke default.', 'success');
        if (res.data) setForm(res.data);
      } else {
        addToast(res?.message || 'Gagal mereset pengaturan.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal mereset pengaturan.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Preview styling variables
  const isImageBg = form.bg_type === 'image' && form.bg_image;
  const overlayOpacity = (form.bg_overlay_opacity ?? 60) / 100;
  const cardOpacity = (form.card_opacity ?? 95) / 100;
  const primaryColor = form.primary_color || '#2563eb';

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Kustomisasi Tampilan Portal Login
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Atur tema warna, gambar latar belakang, logo, teks branding, dan transparansi halaman captive portal.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Buka Portal di Tab Baru
          </a>

          {!isVisitor && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
                disabled={saving || loading}
              >
                Reset Default
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Row 1: Top Section - Settings (Left) & Live Preview (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
        alignItems: 'stretch',
        marginBottom: 20,
      }}>
        {/* Left: Background & Branding Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Card 1: Latar Belakang (Background) */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Latar Belakang (Background)
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type Switcher */}
              <div className="form-group">
                <label className="form-label">Tipe Latar Belakang</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${form.bg_type === 'color' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setForm(f => ({ ...f, bg_type: 'color' }))}
                  >
                    Warna Solid
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${form.bg_type === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setForm(f => ({ ...f, bg_type: 'image' }))}
                  >
                    Gambar Background
                  </button>
                </div>
              </div>

              {/* Mode: Color */}
              {form.bg_type === 'color' && (
                <div>
                  <label className="form-label">Pilih Warna Solid</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <input
                      type="color"
                      value={form.bg_color || '#0a0e1a'}
                      onChange={(e) => setForm(f => ({ ...f, bg_color: e.target.value }))}
                      style={{
                        width: 44,
                        height: 38,
                        padding: 0,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: 'transparent',
                      }}
                    />
                    <input
                      type="text"
                      className="input input-sm mono"
                      value={form.bg_color || '#0a0e1a'}
                      onChange={(e) => setForm(f => ({ ...f, bg_color: e.target.value }))}
                      placeholder="#0a0e1a"
                      style={{ flex: 1 }}
                    />
                  </div>

                  {/* Presets */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, bg_color: p.value }))}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.74rem',
                          background: p.value,
                          color: '#ffffff',
                          border: form.bg_color === p.value ? '2px solid var(--primary-light)' : '1px solid var(--border)',
                          cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode: Image */}
              {form.bg_type === 'image' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="form-label">Upload File Gambar Latar</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                      className="input input-sm"
                      style={{ padding: '6px 10px' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Format didukung: JPG, PNG, WebP (maks. 3.5 MB). Disarankan resolusi 1920x1080.
                    </span>
                  </div>

                  {form.bg_image && (
                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', height: 110 }}>
                      <img
                        src={form.bg_image}
                        alt="Background Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, bg_image: null, bg_type: 'color' }))}
                        className="btn btn-danger btn-sm"
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          padding: '4px 8px',
                          fontSize: '0.7rem',
                        }}
                      >
                        Hapus Gambar
                      </button>
                    </div>
                  )}

                  {/* Sliders for Image BG */}
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label className="form-label" style={{ margin: 0 }}>Efek Blur</label>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{form.bg_blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={form.bg_blur}
                        onChange={(e) => setForm(f => ({ ...f, bg_blur: parseInt(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label className="form-label" style={{ margin: 0 }}>Overlay Gelap</label>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{form.bg_overlay_opacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        step="5"
                        value={form.bg_overlay_opacity}
                        onChange={(e) => setForm(f => ({ ...f, bg_overlay_opacity: parseInt(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Branding & Logo */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Branding, Logo & Teks
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Logo Selection */}
              <div className="form-group">
                <label className="form-label">Tipe Logo</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${form.logo_type === 'default' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setForm(f => ({ ...f, logo_type: 'default' }))}
                  >
                    Logo Default SIPAS
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${form.logo_type === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setForm(f => ({ ...f, logo_type: 'custom' }))}
                  >
                    Upload Custom Logo
                  </button>
                </div>

                {form.logo_type === 'custom' && (
                  <div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml, image/webp"
                      onChange={handleLogoUpload}
                      className="input input-sm"
                      style={{ padding: '6px 10px' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Upload logo transparan (PNG/SVG disarankan).
                    </span>
                    {form.logo_custom && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        <img src={form.logo_custom} alt="Custom Logo" style={{ maxHeight: 44, maxWidth: 120, objectFit: 'contain' }} />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setForm(f => ({ ...f, logo_custom: null, logo_type: 'default' }))}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="form-group">
                <label className="form-label">Judul Portal</label>
                <input
                  type="text"
                  className="input"
                  value={form.portal_title}
                  onChange={(e) => setForm(f => ({ ...f, portal_title: e.target.value }))}
                  placeholder="Portal SIPAS"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sub-Judul / Slogan</label>
                <input
                  type="text"
                  className="input"
                  value={form.portal_subtitle}
                  onChange={(e) => setForm(f => ({ ...f, portal_subtitle: e.target.value }))}
                  placeholder="Sistem Integrasi Portal & Autentikasi Satu-Pintu"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teks Bantuan Footer</label>
                <input
                  type="text"
                  className="input"
                  value={form.footer_text}
                  onChange={(e) => setForm(f => ({ ...f, footer_text: e.target.value }))}
                  placeholder="Butuh bantuan? Hubungi administrator jaringan"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right: Live Preview Card (Height matches Card 1 + Card 2 exactly!) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Live Preview Captive Portal
            </div>

            {/* Viewport Toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className={`btn btn-sm ${previewMode === 'desktop' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => setPreviewMode('desktop')}
                title="Tampilan Desktop"
              >
                 Desktop
              </button>
              <button
                type="button"
                className={`btn btn-sm ${previewMode === 'mobile' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => setPreviewMode('mobile')}
                title="Tampilan HP (Mobile)"
              >
                 Mobile
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: 12, background: 'rgba(0,0,0,0.35)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Preview Window Box */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: previewMode === 'mobile' ? 340 : '100%',
                margin: '0 auto',
                flex: 1,
                minHeight: 380,
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                backgroundColor: isImageBg ? '#060911' : (form.bg_color || '#0a0e1a'),
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                border: '1px solid var(--border)',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Simulated BG Image */}
              {isImageBg && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${form.bg_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: form.bg_blur > 0 ? `blur(${form.bg_blur}px)` : 'none',
                    transform: form.bg_blur > 0 ? 'scale(1.08)' : 'none',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Simulated Overlay */}
              {isImageBg && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: '#000000',
                    opacity: overlayOpacity,
                    zIndex: 0,
                  }}
                />
              )}

              {/* Preview Content Container */}
              <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    {form.logo_type === 'custom' && form.logo_custom ? (
                      <img
                        src={form.logo_custom}
                        alt="Logo Preview"
                        style={{ maxHeight: 50, maxWidth: 140, objectFit: 'contain' }}
                      />
                    ) : (
                      <SipasLogo size={46} />
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 2px', color: 'var(--text-main)' }}>
                    {form.portal_title || 'Portal SIPAS'}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {form.portal_subtitle || 'Sistem Integrasi Portal & Autentikasi Satu-Pintu'}
                  </p>
                </div>

                {/* Card Simulation */}
                <div
                  style={{
                    backgroundColor: `rgba(17, 24, 39, ${cardOpacity})`,
                    backdropFilter: cardOpacity < 1 ? 'blur(12px)' : 'none',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  {/* Simulated Net Info */}
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    padding: '6px 8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    marginBottom: 12,
                  }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600 }}>IP ANDA</div>
                      <div style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>10.10.254.10</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600 }}>MAC</div>
                      <div style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>10:F6:0A:C9:32:E5</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</div>
                      <div style={{ fontSize: '0.68rem', color: '#fbbf24' }}>● Menunggu</div>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 3 }}>Username</label>
                    <input
                      type="text"
                      className="input input-sm"
                      placeholder="Contoh: user123"
                      disabled
                      style={{ width: '100%', fontSize: '0.78rem', background: 'rgba(0,0,0,0.2)' }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 3 }}>Password</label>
                    <input
                      type="password"
                      className="input input-sm"
                      value="••••••••"
                      disabled
                      style={{ width: '100%', fontSize: '0.78rem', background: 'rgba(0,0,0,0.2)' }}
                    />
                  </div>

                  {/* Simulated Submit Button */}
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      width: '100%',
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                      color: '#ffffff',
                      fontWeight: 600,
                      padding: '8px',
                    }}
                  >
                    Masuk ke Internet
                  </button>
                </div>

                {/* Simulated Footer */}
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {form.footer_text || 'Butuh bantuan? Hubungi administrator jaringan'}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Row 2: Bottom Section - Button Settings (Left) & Tips/Endpoint (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
        alignItems: 'stretch',
      }}>
        {/* Left: Card 3 - Warna Tombol & Transparansi Kartu */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Warna Tombol & Transparansi Kartu
            </div>
          </div>

          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
            {/* Primary Button Color */}
            <div>
              <label className="form-label" style={{ marginBottom: 6 }}>Warna Tombol Utama</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input
                  type="color"
                  value={form.primary_color || '#2563eb'}
                  onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  style={{
                    width: 44,
                    height: 38,
                    padding: 0,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                />
                <input
                  type="text"
                  className="input input-sm mono"
                  value={form.primary_color || '#2563eb'}
                  onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  placeholder="#2563eb"
                  style={{ flex: 1 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {BUTTON_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, primary_color: p.value }))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.74rem',
                      background: p.value,
                      color: '#ffffff',
                      border: form.primary_color === p.value ? '2px solid #ffffff' : '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Opacity Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="form-label" style={{ margin: 0 }}>Kepadatan (Opasitas) Kartu Login</label>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{form.card_opacity}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={form.card_opacity}
                onChange={(e) => setForm(f => ({ ...f, card_opacity: parseInt(e.target.value) }))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Nilai lebih rendah memberi efek glassmorphism transparan yang elegan.
              </span>
            </div>
          </div>
        </div>

        {/* Right: Card 2 - Tips & Panduan Tampilan dan Endpoint Portal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Tips & Panduan Tampilan dan Endpoint Portal
            </div>
          </div>

          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
            {/* URL Portal Bar */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                URL Halaman Login Captive Portal:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  className="input input-sm mono"
                  value="https://sipas.npma.my.id/"
                  style={{ flex: 1, background: 'rgba(0,0,0,0.2)', color: 'var(--primary-light)' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText('https://sipas.npma.my.id/');
                    addToast('URL Captive Portal berhasil disalin!', 'success');
                  }}
                  title="Salin URL"
                >
                  Salin
                </button>
              </div>
            </div>

            {/* Tips Section */}
            <div style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: '0.76rem',
              color: 'var(--text-secondary)',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span>💡</span>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Keterbacaan Teks:</strong> Gunakan <em>Overlay Gelap</em> (60%-80%) jika gambar latar Anda terang.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span>📐</span>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Rasio Gambar:</strong> Disarankan gambar 16:9 (1920x1080) di bawah 2MB untuk loading cepat.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span>✨</span>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Efek Kaca:</strong> Atur <em>Kepadatan Kartu</em> ke 80%-90% untuk efek transparan modern.
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
