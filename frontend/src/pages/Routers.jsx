import { useState, useEffect, useContext, useCallback } from 'react';
import { apiFetch, apiPost, apiPut, apiDelete } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import Modal from '../components/ui/Modal';
import { Badge, Loader, EmptyState } from '../components/ui/index';

const EMPTY_FORM = {
  name: '', ip_address: '', api_port: 8728, api_username: 'admin', api_password: '', location: '', router_type: 'internal'
};

function RouterCard({ router, onEdit, onDelete, onTest, isVisitor }) {
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    setTesting(true);
    await onTest(router);
    setTesting(false);
  }

  let lastSeen = 'Belum pernah';
  if (router.last_seen) {
    const d = new Date(router.last_seen);
    if (!isNaN(d.getTime())) {
      lastSeen = d.toLocaleString('id-ID');
    }
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="font-bold text-slate-100 text-base truncate">{router.name}</div>
          <div className="flex items-center gap-1.5 shrink-0">
            {router.router_type === 'external' ? (
              <Badge variant="warning">Eksternal</Badge>
            ) : (
              <Badge variant="info">Internal</Badge>
            )}
            <Badge variant={router.is_active ? 'success' : 'neutral'}>
              {router.is_active ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-slate-500 shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            </svg>
            <span className="mono font-semibold text-slate-200">{router.ip_address}{isVisitor ? '' : `:${router.api_port || 8728}`}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-slate-500 shrink-0">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{router.router_type === 'external' ? 'Vendor Portal (No API)' : (isVisitor ? (router.api_username || 'a****n') : router.api_username)}</span>
          </div>
          {router.location && (
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-slate-500 shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{router.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="shrink-0">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Last seen: {lastSeen}</span>
          </div>
        </div>
      </div>

      {!isVisitor && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button className="btn btn-secondary btn-xs flex-1" onClick={handleTest} disabled={testing}>
            {testing ? <div className="loader-ring" style={{ width: 12, height: 12, borderWidth: 2 }} /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            )}
            <span>Test</span>
          </button>
          <button className="btn btn-ghost btn-xs flex-1" onClick={() => onEdit(router)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Edit</span>
          </button>
          <button className="btn btn-danger btn-xs" onClick={() => onDelete(router)} title="Hapus router">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Routers() {
  const ctx = useContext(ToastContext);
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editRouter, setEditRouter] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currentAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('hotspot_admin') || '{}'); } catch { return {}; }
  })();
  const isVisitor = currentAdmin?.role === 'visitor';

  useEffect(() => { ctx?.setPageTitle?.('Manajemen Router'); }, [ctx]);

  const loadRouters = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/routers');
      if (d?.success) setRouters(d.data || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadRouters(); }, [loadRouters]);

  // Connect to Global Auto-Refresh in Header
  useEffect(() => {
    ctx?.registerAutoRefresh?.(loadRouters);
    return () => ctx?.registerAutoRefresh?.(null);
  }, [ctx, loadRouters]);

  function openAdd() {
    setEditRouter(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEdit(router) {
    setEditRouter(router);
    setForm({
      name: router.name || '',
      ip_address: router.ip_address || '',
      api_port: router.api_port || 8728,
      api_username: router.api_username || 'admin',
      api_password: '',
      location: router.location || '',
      router_type: router.router_type || 'internal',
    });
    setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      let res;
      if (editRouter) {
        res = await apiPut(`/routers/${editRouter.id}`, body);
      } else {
        res = await apiPost('/routers', body);
      }
      if (res?.success) {
        ctx?.addToast('Berhasil', editRouter ? 'Router diupdate.' : 'Router ditambahkan.', 'success');
        setModal(false);
        loadRouters();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Terjadi kesalahan.', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(target) {
    const id = typeof target === 'object' ? target?.id : target;
    ctx?.addToast('Mencoba...', 'Menghubungi MikroTik API...', 'info');
    const res = await apiFetch(`/routers/${id}/test`);
    if (res?.success) {
      ctx?.addToast('Koneksi Sukses', res.message || 'Berhasil terhubung ke MikroTik.', 'success');
      loadRouters();
    } else {
      ctx?.addToast('Koneksi Gagal', res?.message || 'Tidak dapat terhubung.', 'error');
    }
  }

  async function deleteRouter() {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    try {
      const res = await apiDelete(`/routers/${confirmDel.id}`);
      if (res?.success) {
        ctx?.addToast('Dihapus', res.message || 'Router dihapus.', 'success');
        setConfirmDel(null);
        loadRouters();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal menghapus.', 'error');
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01"/>
            </svg>
            <span>Daftar Router</span>
            <Badge variant="primary">{routers.length}</Badge>
          </div>
          {!isVisitor && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Tambah Router</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6"><Loader /></div>
        ) : routers.length === 0 ? (
          <div className="p-6"><EmptyState text="Belum ada router. Klik 'Tambah Router'." /></div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routers.map(r => (
                <RouterCard
                  key={r.id}
                  router={r}
                  onEdit={openEdit}
                  onDelete={setConfirmDel}
                  onTest={testConnection}
                  isVisitor={isVisitor}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editRouter ? `Edit Router — ${editRouter.name}` : 'Tambah Router Baru'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
              <span>Simpan</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Tipe Pengelolaan Router *</label>
            <select
              className="select w-full"
              value={form.router_type}
              onChange={e => setForm(f => ({ ...f, router_type: e.target.value }))}
            >
              <option value="internal">Internal (Full API Management)</option>
              <option value="external">Eksternal (Portal Auth Only)</option>
            </select>
            {form.router_type === 'external' ? (
              <div className="form-hint text-amber-400">
                Router Eksternal hanya meminjam portal ini untuk verifikasi login SSO/Lokal. Bandwidth, bloking, dan penanganan koneksi diatur penuh oleh Vendor.
              </div>
            ) : (
              <div className="form-hint text-slate-400">
                Admin mengelola penuh limit bandwidth, pemblokiran situs, dan akun hotspot via Mikrotik API.
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Router *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Router Utama / Vendor A" required />
            </div>
            <div className="form-group">
              <label className="form-label">IP Address / Host Target *</label>
              <input className="input" value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.42.2 / portal.vendor.com" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">API Port {form.router_type === 'external' ? '(Opsional)' : ''}</label>
              <input className="input" type="number" value={form.api_port} onChange={e => setForm(f => ({ ...f, api_port: e.target.value }))} placeholder="8728" />
            </div>
            <div className="form-group">
              <label className="form-label">Lokasi / Keterangan</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Lokasi / Nama Vendor" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username API {form.router_type === 'external' ? '(Opsional)' : '*'}</label>
              <input className="input" value={form.api_username} onChange={e => setForm(f => ({ ...f, api_username: e.target.value }))} placeholder="admin" required={form.router_type === 'internal'} autoCapitalize="none" />
            </div>
            <div className="form-group">
              <label className="form-label">{editRouter ? 'Password API (kosongkan jika tidak ganti)' : (form.router_type === 'external' ? 'Password API (Opsional)' : 'Password API *')}</label>
              <input className="input" type="password" value={form.api_password} onChange={e => setForm(f => ({ ...f, api_password: e.target.value }))} placeholder="••••••••" required={!editRouter && form.router_type === 'internal'} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!confirmDel}
        onClose={() => !deleting && setConfirmDel(null)}
        title="Hapus Router"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDel(null)} disabled={deleting}>Batal</button>
            <button className="btn btn-danger" onClick={deleteRouter} disabled={deleting}>
              {deleting && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{deleting ? 'Menghapus...' : 'Hapus'}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Yakin ingin menghapus router <strong className="text-slate-100">"{confirmDel?.name}"</strong>?
        </p>
      </Modal>
    </>
  );
}
