import { useState, useEffect, useContext, useMemo } from 'react';
import { apiFetch, apiPut, apiPost } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import SipasLogo from '../components/ui/SipasLogo';
import Modal from '../components/ui/Modal';

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

const COLOR_PRESETS = [
  { label: 'Deep Navy', value: '#0a0e1a' },
  { label: 'Midnight Blue', value: '#030712' },
  { label: 'Charcoal Slate', value: '#0f172a' },
  { label: 'Dark Emerald', value: '#041d18' },
];

const CARD_COLOR_PRESETS = [
  { label: 'Dark Slate', value: '#111827' },
  { label: 'Midnight', value: '#030712' },
  { label: 'Deep Navy', value: '#0a0e1a' },
  { label: 'Charcoal', value: '#0f172a' },
  { label: 'Emerald', value: '#041d18' },
];

const BUTTON_PRESETS = [
  { label: 'Primary Blue', value: '#2563eb' },
  { label: 'Sky Blue', value: '#0284c7' },
  { label: 'Cyan Ocean', value: '#0891b2' },
  { label: 'Emerald Green', value: '#059669' },
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
    card_bg_color: '#111827',
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

    if (file.size > 2 * 1024 * 1024) {
      addToast('Ukuran gambar maksimal 2 MB.', 'warning');
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

    if (file.size > 1 * 1024 * 1024) {
      addToast('Ukuran logo maksimal 1 MB.', 'warning');
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

  const [showResetModal, setShowResetModal] = useState(false);

  const handleResetClick = () => {
    if (isVisitor) {
      addToast('Mode Visitor: Aksi ditolak.', 'warning');
      return;
    }
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    try {
      setSaving(true);
      const res = await apiPost('/portal-settings/reset', {});
      if (res?.success) {
        addToast('Pengaturan portal berhasil direset ke default.', 'success');
        if (res.data) setForm(res.data);
        setShowResetModal(false);
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
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800/60">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            Kustomisasi Tampilan Portal Login
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur tema warna, gambar latar belakang, logo, teks branding, dan transparansi halaman captive portal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span>Buka Portal di Tab Baru</span>
          </a>

          {!isVisitor && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleResetClick}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Background & Branding Cards */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Latar Belakang (Background) */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Latar Belakang (Background)</span>
              </div>
            </div>

            <div className="card-body space-y-4">
              {/* Type Switcher */}
              <div className="form-group">
                <label className="form-label">Tipe Latar Belakang</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm ${form.bg_type === 'color' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, bg_type: 'color' }))}
                  >
                    Warna Solid
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${form.bg_type === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, bg_type: 'image' }))}
                  >
                    Gambar Background
                  </button>
                </div>
              </div>

              {/* Mode: Color */}
              {form.bg_type === 'color' && (
                <div className="space-y-3">
                  <label className="form-label">Pilih Warna Solid</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.bg_color || '#0a0e1a'}
                      onChange={(e) => setForm(f => ({ ...f, bg_color: e.target.value }))}
                      className="w-10 h-9 p-0 border border-slate-700 rounded-lg cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      className="input input-sm mono flex-1"
                      value={form.bg_color || '#0a0e1a'}
                      onChange={(e) => setForm(f => ({ ...f, bg_color: e.target.value }))}
                      placeholder="#0a0e1a"
                    />
                  </div>

                  {/* Presets */}
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, bg_color: p.value }))}
                        className={`px-2.5 py-1 rounded-md text-xs text-white border transition-all cursor-pointer ${
                          form.bg_color === p.value ? 'ring-2 ring-blue-400 border-transparent' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: p.value }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode: Image */}
              {form.bg_type === 'image' && (
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Upload File Gambar Latar</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                      className="input input-sm text-xs"
                    />
                    <div className="form-hint">
                      Format didukung: JPG, PNG, WebP (maks. 2 MB).
                    </div>
                  </div>

                  {form.bg_image && (
                    <div className="relative rounded-lg overflow-hidden border border-slate-700 h-28">
                      <img
                        src={form.bg_image}
                        alt="Background Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, bg_image: null, bg_type: 'color' }))}
                        className="btn btn-danger btn-xs absolute top-2 right-2 shadow-md"
                      >
                        Hapus Gambar
                      </button>
                    </div>
                  )}

                  {/* Sliders for Image BG */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="form-label m-0 text-xs">Efek Blur</label>
                        <span className="mono text-[11px] text-slate-400">{form.bg_blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={form.bg_blur}
                        onChange={(e) => setForm(f => ({ ...f, bg_blur: parseInt(e.target.value) }))}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="form-label m-0 text-xs">Overlay Gelap</label>
                        <span className="mono text-[11px] text-slate-400">{form.bg_overlay_opacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        step="5"
                        value={form.bg_overlay_opacity}
                        onChange={(e) => setForm(f => ({ ...f, bg_overlay_opacity: parseInt(e.target.value) }))}
                        className="w-full accent-blue-500"
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
                <span>Branding, Logo & Teks</span>
              </div>
            </div>

            <div className="card-body space-y-3.5">
              {/* Logo Selection */}
              <div className="form-group">
                <label className="form-label">Tipe Logo</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    className={`btn btn-sm ${form.logo_type === 'default' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, logo_type: 'default' }))}
                  >
                    Logo Default SIPAS
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${form.logo_type === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, logo_type: 'custom' }))}
                  >
                    Upload Custom Logo
                  </button>
                </div>

                {form.logo_type === 'custom' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml, image/webp"
                      onChange={handleLogoUpload}
                      className="input input-sm text-xs"
                    />
                    <div className="form-hint">
                      Upload logo transparan (PNG/SVG disarankan, maks. 1 MB).
                    </div>
                    {form.logo_custom && (
                      <div className="flex items-center gap-3 p-2 bg-slate-950/40 border border-slate-800 rounded-lg">
                        <img src={form.logo_custom} alt="Custom Logo" className="max-h-10 max-w-28 object-contain" />
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-rose-400 hover:text-rose-300"
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

        {/* Right: Live Preview Card */}
        <div className="lg:col-span-7 card flex flex-col h-full">
          <div className="card-header">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Live Preview Captive Portal</span>
            </div>

            {/* Viewport Toggle */}
            <div className="flex gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                className={`btn btn-xs ${previewMode === 'desktop' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPreviewMode('desktop')}
                title="Tampilan Desktop"
              >
                Desktop
              </button>
              <button
                type="button"
                className={`btn btn-xs ${previewMode === 'mobile' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPreviewMode('mobile')}
                title="Tampilan HP (Mobile)"
              >
                Mobile
              </button>
            </div>
          </div>

          <div className="card-body p-4 bg-slate-950/80 overflow-hidden flex flex-col flex-1">
            {/* Preview Window Box */}
            <div
              data-portal-preview="true"
              className={`portal-preview-isolated relative w-full mx-auto flex-1 min-h-[420px] rounded-xl overflow-hidden flex items-center justify-center p-6 border border-slate-800 shadow-2xl transition-all duration-300 ${
                previewMode === 'mobile' ? 'max-w-[340px]' : 'max-w-full'
              }`}
              style={{
                backgroundColor: isImageBg ? '#060911' : (form.bg_color || '#0a0e1a'),
              }}
            >
              {/* Simulated BG Image */}
              {isImageBg && (
                <div
                  className="absolute inset-0 bg-cover bg-center z-0"
                  style={{
                    backgroundImage: `url(${form.bg_image})`,
                    filter: form.bg_blur > 0 ? `blur(${form.bg_blur}px)` : 'none',
                    transform: form.bg_blur > 0 ? 'scale(1.08)' : 'none',
                  }}
                />
              )}

              {/* Simulated Overlay */}
              {isImageBg && (
                <div
                  className="absolute inset-0 bg-black z-0"
                  style={{ opacity: overlayOpacity }}
                />
              )}

              {/* Preview Content Container */}
              <div className="relative z-10 w-full max-w-[340px]">
                {/* Header */}
                <div className="text-center mb-3.5">
                  <div className="flex justify-center mb-2">
                    {form.logo_type === 'custom' && form.logo_custom ? (
                      <img
                        src={form.logo_custom}
                        alt="Logo Preview"
                        className="max-h-12 max-w-32 object-contain"
                      />
                    ) : (
                      <SipasLogo size={42} />
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">
                    {form.portal_title || 'Portal SIPAS'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {form.portal_subtitle || 'Sistem Integrasi Portal & Autentikasi Satu-Pintu'}
                  </p>
                </div>

                {/* Card Simulation */}
                <div
                  className="border border-slate-700/80 rounded-xl p-4 shadow-xl"
                  style={{
                    backgroundColor: hexToRgba(form.card_bg_color || '#111827', cardOpacity),
                    backdropFilter: cardOpacity < 1 ? 'blur(12px)' : 'none',
                  }}
                >
                  {/* Simulated Net Info */}
                  <div className="flex gap-1 p-2 bg-slate-950/50 border border-slate-800 rounded-lg mb-3">
                    <div className="flex-1 text-center">
                      <div className="text-[9px] text-slate-400 font-bold uppercase">IP ANDA</div>
                      <div className="text-[10px] font-mono font-semibold text-slate-200">10.10.254.10</div>
                    </div>
                    <div className="w-px bg-slate-800" />
                    <div className="flex-1 text-center">
                      <div className="text-[9px] text-slate-400 font-bold uppercase">MAC</div>
                      <div className="text-[10px] font-mono font-semibold text-slate-200">10:F6:0A:C9:32:E5</div>
                    </div>
                    <div className="w-px bg-slate-800" />
                    <div className="flex-1 text-center">
                      <div className="text-[9px] text-slate-400 font-bold uppercase">STATUS</div>
                      <div className="text-[10px] text-amber-400 font-semibold flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        <span>Menunggu</span>
                      </div>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-2.5 mb-3.5 text-left">
                    <div>
                      <label className="block text-[11px] text-slate-300 font-medium mb-1">Username</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 pointer-events-none"
                          placeholder="Masukkan username"
                          disabled
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 font-medium mb-1">Password</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </span>
                        <input
                          type="password"
                          className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 pointer-events-none"
                          value="••••••••"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  {/* Simulated Submit Button */}
                  <button
                    type="button"
                    className="w-full py-2 px-3 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                    style={{
                      backgroundColor: primaryColor,
                      boxShadow: `0 4px 12px ${hexToRgba(primaryColor, 0.35)}`,
                    }}
                  >
                    Masuk ke Internet
                  </button>
                </div>

                {/* Simulated Footer */}
                <div className="text-center mt-3 text-[10px] text-slate-400">
                  {form.footer_text || 'Butuh bantuan? Hubungi administrator jaringan'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Bottom Section - Card Colors & Info Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Card 3 - Warna Kartu & Tombol Form Login */}
        <div className="lg:col-span-5 card">
          <div className="card-header">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              <span>Warna Kartu & Tombol Form</span>
            </div>
          </div>

          <div className="card-body space-y-4">
            {/* Form Card Background Color */}
            <div className="space-y-2">
              <label className="form-label">Warna Latar Kartu Form</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.card_bg_color || '#111827'}
                  onChange={(e) => setForm(f => ({ ...f, card_bg_color: e.target.value }))}
                  className="w-10 h-9 p-0 border border-slate-700 rounded-lg cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  className="input input-sm mono flex-1"
                  value={form.card_bg_color || '#111827'}
                  onChange={(e) => setForm(f => ({ ...f, card_bg_color: e.target.value }))}
                  placeholder="#111827"
                />
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {CARD_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, card_bg_color: p.value }))}
                    className={`px-2.5 py-1 rounded-md text-xs text-white border transition-all cursor-pointer ${
                      form.card_bg_color === p.value ? 'ring-2 ring-blue-400 border-transparent' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: p.value }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Opacity Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="form-label m-0 text-xs">Kepadatan (Opasitas) Kartu</label>
                <span className="mono text-[11px] text-slate-400">{form.card_opacity}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={form.card_opacity}
                onChange={(e) => setForm(f => ({ ...f, card_opacity: parseInt(e.target.value) }))}
                className="w-full accent-blue-500"
              />
              <div className="form-hint">
                Nilai lebih rendah memberi efek glassmorphism transparan yang elegan.
              </div>
            </div>

            {/* Primary Button Color */}
            <div className="space-y-2">
              <label className="form-label">Warna Tombol Utama</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color || '#2563eb'}
                  onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="w-10 h-9 p-0 border border-slate-700 rounded-lg cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  className="input input-sm mono flex-1"
                  value={form.primary_color || '#2563eb'}
                  onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  placeholder="#2563eb"
                />
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {BUTTON_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, primary_color: p.value }))}
                    className={`px-2.5 py-1 rounded-md text-xs text-white border transition-all cursor-pointer ${
                      form.primary_color === p.value ? 'ring-2 ring-white border-transparent' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: p.value }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Panduan & Arsitektur Sistem Portal SIPAS */}
        <div className="lg:col-span-7 card">
          <div className="card-header">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span>Panduan & Arsitektur Sistem Portal SIPAS</span>
            </div>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Sistem Terintegrasi
            </span>
          </div>

          <div className="card-body space-y-4">
            {/* 4 Tahap Alur */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="text-blue-400">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Alur Kerja & Mekanisme Otentikasi Hotspot:
                </span>
                <span className="text-[11px] text-slate-500">
                  MikroTik RouterOS → SIPAS Engine
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-slate-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-sky-400">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>
                    </svg>
                    1. Intersepsi
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    MikroTik menangkap HTTP request klien baru & redirect ke portal SIPAS dengan IP & MAC.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-slate-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-purple-400">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                    </svg>
                    2. UI Dinamis
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    SIPAS menyajikan antarmuka login responsif sesuai tema kustomisasi & deteksi identitas.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-slate-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-emerald-400">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    3. Verifikasi
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Backend memvalidasi akun, sisa kuota (FUP), masa aktif, dan batas multi-device.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-slate-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-amber-400">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    4. Otorisasi
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    MikroTik membuka akses internet & menerapkan limit bandwidth (Simple Queue) otomatis.
                  </p>
                </div>
              </div>
            </div>

            {/* Tips Desain */}
            <div className="border-t border-slate-800/80 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="text-amber-400 shrink-0 mt-0.5">
                  <path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                </svg>
                <div>
                  <strong className="text-slate-200">Keterbacaan Teks:</strong> Gunakan <em>Overlay Gelap</em> (60%-80%) jika gambar latar Anda terang agar form tetap kontras.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="text-sky-400 shrink-0 mt-0.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
                </svg>
                <div>
                  <strong className="text-slate-200">Rasio & Resolusi:</strong> Disarankan gambar 16:9 (1920x1080) di bawah 2MB untuk performa loading secepat kilat.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="text-purple-400 shrink-0 mt-0.5">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
                <div>
                  <strong className="text-slate-200">Modern Glassmorphism:</strong> Atur <em>Kepadatan Kartu</em> ke 80%-90% untuk efek kaca transparan yang profesional.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="text-emerald-400 shrink-0 mt-0.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <div>
                  <strong className="text-slate-200">Format Logo:</strong> Upload logo format PNG transparan atau SVG agar logo berpadu menyatu sempurna.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset Default */}
      <Modal
        open={showResetModal}
        title="Reset Pengaturan Portal?"
        onClose={() => setShowResetModal(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowResetModal(false)}
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={confirmReset}
              disabled={saving}
            >
              {saving ? 'Mereset...' : 'Ya, Reset ke Default'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Tindakan ini akan mengembalikan semua tema visual halaman captive portal ke setelan standar:
          </p>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span>Latar belakang & kartu kembali ke tema Deep Navy & Slate.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Logo kembali ke <strong className="text-slate-200">Logo Default SIPAS</strong>.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span>Warna tombol kembali ke warna biru primer.</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
