import { useState, useEffect, useContext, useRef } from 'react';
import { apiFetch, apiPost, apiPut, apiDelete } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import Modal from '../components/ui/Modal';
import { Badge, Loader, EmptyState } from '../components/ui/index';

const BW_PRESETS = ['1M/512K', '2M/1M', '5M/2M', '10M/10M', '20M/20M', '50M/50M', '100M/100M'];

function UserCard({ user, routers, blockedSites = [], onEdit, onDelete, onBwChange }) {
  const initial = user.username?.[0]?.toUpperCase() || '?';
  const blocks = (user.website_block || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => Boolean(s) && !['true', 'false', '0', '1'].includes(s.toLowerCase()));
  const siteMap = Object.fromEntries(blockedSites.map(s => [s.key, s]));

  const subInfo = [
    user.full_name,
    user.jabatan,
    user.instansi ? `(${user.instansi})` : null
  ].filter(Boolean).join(' • ') || '—';

  return (
    <div className="user-card">
      <div className="user-card-avatar">{initial}</div>
      <div className="user-card-info">
        <div className="user-card-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {user.username}
          {user.auth_provider === 'sso' ? (
            <Badge variant="info">SSO Diskominfo</Badge>
          ) : (
            <Badge variant="neutral">Lokal</Badge>
          )}
        </div>
        <div className="user-card-sub">{subInfo}</div>
      </div>
      <div className="user-card-meta">
        <Badge variant="primary">{user.bandwidth_limit || '—'}</Badge>
        {blocks.map(bKey => (
          <Badge key={bKey} variant="danger">
            {siteMap[bKey]?.name || bKey.toUpperCase()}
          </Badge>
        ))}
        {user.router_name
          ? <Badge variant="info">{user.router_name}</Badge>
          : <Badge variant="neutral">Semua Router</Badge>
        }
        <Badge variant={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      </div>
      <div className="user-card-actions">
        <button
          className="btn btn-ghost btn-icon-sm"
          title="Edit user"
          onClick={() => onEdit(user)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          className="btn btn-danger btn-icon-sm"
          title="Hapus user"
          onClick={() => onDelete(user)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  username: '', password: '', full_name: '', email: '', jabatan: '', instansi: '',
  bandwidth_limit: '10M/10M', router_id: '', website_block: '', notes: '', is_active: true,
  auth_provider: 'local',
};


export default function Users() {
  const ctx = useContext(ToastContext);
  const [users, setUsers] = useState([]);
  const [routers, setRouters] = useState([]);
  const [blockedSites, setBlockedSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [routerFilter, setRouterFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => { ctx?.setPageTitle?.('Pengguna Hotspot'); }, [ctx]);

  useEffect(() => {
    apiFetch('/routers').then(d => { if (d?.success) setRouters(d.data); });
    apiFetch('/blocked-sites').then(d => { if (d?.success) setBlockedSites(d.data); });
  }, []);

  useEffect(() => { loadUsers(); }, [page, routerFilter, providerFilter]);

  async function loadUsers(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: p,
        limit: 20,
        search,
        ...(routerFilter ? { router_id: routerFilter } : {}),
        ...(providerFilter ? { auth_provider: providerFilter } : {})
      });
      const d = await apiFetch(`/users?${params}`);
      if (d?.success) {
        setUsers(d.data || []);
        setTotal(d.meta?.total ?? d.pagination?.total ?? (d.data?.length || 0));
      }
    } catch (err) {
      ctx?.addToast?.('danger', err.message || 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  }

  function onSearchChange(v) {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadUsers(1); }, 400);
  }

  function openAdd() {
    setEditUser(null);
    setForm({ ...EMPTY_FORM, router_id: routers[0]?.id || '' });
    setModal(true);
  }

  function openEdit(user) {
    setEditUser(user);
    const blocks = (user.website_block || '').split(',').filter(Boolean);
    setForm({
      username: user.username || '',
      password: user.password || '',
      full_name: user.full_name || '',
      email: user.email || '',
      jabatan: user.jabatan || '',
      instansi: user.instansi || '',
      bandwidth_limit: user.bandwidth_limit || '10M/10M',
      router_id: user.router_id || '',
      website_block: user.website_block || '',
      notes: user.notes || '',
      is_active: user.is_active !== false,
    });

    setModal(true);
  }

  function setBlock(key, checked) {
    const current = (form.website_block || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => Boolean(s) && !['true', 'false', '0', '1'].includes(s.toLowerCase()));
    const next = checked ? [...new Set([...current, key])] : current.filter(k => k !== key);
    setForm(f => ({ ...f, website_block: next.join(',') }));
  }

  async function submitForm(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      let res;
      if (editUser) {
        res = await apiPut(`/users/${editUser.id}`, body);
      } else {
        res = await apiPost('/users', body);
      }
      if (res?.success) {
        ctx?.addToast('Berhasil', editUser ? 'User berhasil diupdate.' : 'User berhasil ditambahkan.', 'success');
        setModal(false);
        loadUsers(1);
      } else {
        ctx?.addToast('Gagal', res?.message || 'Terjadi kesalahan.', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  const [deleting, setDeleting] = useState(false);

  async function deleteUser() {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    try {
      const res = await apiDelete(`/users/${confirmDel.id}`);
      if (res?.success) {
        ctx?.addToast('Dihapus', `User "${confirmDel.username}" berhasil dihapus.`, 'success');
        setConfirmDel(null);
        loadUsers(1);
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal menghapus user.', 'error');
      }
    } catch (err) {
      ctx?.addToast('Error', err.message || 'Terjadi kesalahan saat menghapus user.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('csv_file', file);

    setLoading(true);
    try {
      const res = await apiFetch('/users/import-csv', {
        method: 'POST',
        body: formData,
      });

      if (res?.success) {
        ctx?.addToast('Sukses', res.message || 'Import data selesai.', 'success');
        if (res.data?.errors && res.data.errors.length > 0) {
          console.warn('Import warnings:', res.data.errors);
        }
        loadUsers(1);
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal mengimport CSV.', 'error');
      }
    } catch (err) {
      ctx?.addToast('Error', err.message || 'Koneksi gagal.', 'error');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input file
    }
  }

  const totalPages = Math.ceil(total / 20);
  const blocks = form.website_block.split(',').filter(Boolean);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            Daftar User
            <Badge variant="primary">{total}</Badge>
          </div>
          <div className="card-actions">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="search-input"
                placeholder="Cari username..."
                value={search}
                onChange={e => onSearchChange(e.target.value)}
              />
            </div>
            <select
              className="select"
              style={{ width: 'auto', minWidth: 150 }}
              value={providerFilter}
              onChange={e => { setProviderFilter(e.target.value); setPage(1); }}
            >
              <option value="">Semua Provider</option>
              <option value="sso">SSO Diskominfo (ASN)</option>
              <option value="local">User Lokal / Tamu</option>
            </select>

            <select
              className="select"
              style={{ width: 'auto', minWidth: 130 }}
              value={routerFilter}
              onChange={e => { setRouterFilter(e.target.value); setPage(1); }}
            >
              <option value="">Semua Router</option>
              {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import CSV
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleCSVImport}
              />
            </label>

            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah User
            </button>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : users.length === 0 ? (
          <EmptyState icon="👤" text="Belum ada user. Klik 'Tambah User'." />
        ) : (
          <div>
            {users.map(u => (
              <UserCard
                key={u.id}
                user={u}
                routers={routers}
                blockedSites={blockedSites}
                onEdit={openEdit}
                onDelete={setConfirmDel}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <span className="page-info">Total {total} user</span>
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <>
                  {i > 0 && arr[i - 1] !== p - 1 && <span key={`e${p}`} className="page-btn" style={{ cursor: 'default' }}>…</span>}
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                </>
              ))
            }
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editUser ? `Edit User — ${editUser.username}` : 'Tambah User Baru'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={submitForm} disabled={saving}>
              {saving ? <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
              {editUser ? 'Update' : 'Simpan'}
            </button>
          </>
        }
      >
        <form onSubmit={submitForm}>
          {editUser?.auth_provider === 'sso' && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.85rem',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>🔒</span>
              <div>
                <strong>User SSO Diskominfo (ASN)</strong>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  Password dikelola penuh oleh API SSO Pemkab Bandung. Anda mengelola limit bandwidth, router, dan situs terblokir di sini.
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{editUser?.auth_provider === 'sso' ? 'Username / NIP *' : 'Username *'}</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="user123" required disabled={!!editUser} autoCapitalize="none" />
            </div>
            <div className="form-group">
              <label className="form-label">Password {editUser?.auth_provider === 'sso' ? '' : '*'}</label>
              {editUser?.auth_provider === 'sso' ? (
                <div>
                  <input className="input" value="••••••••••••" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  <div className="form-hint" style={{ color: 'var(--info)' }}>Dikelola oleh SSO Pemkab Bandung</div>
                </div>
              ) : (
                <input className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="password" required={!editUser} />
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Budi Santoso" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@mail.com" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Jabatan</label>
              <input className="input" value={form.jabatan} onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))} placeholder="Pranata Komputer / Kabid" />
            </div>
            <div className="form-group">
              <label className="form-label">Instansi / OPD</label>
              <input className="input" value={form.instansi} onChange={e => setForm(f => ({ ...f, instansi: e.target.value }))} placeholder="Diskominfo Kab. Bandung" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bandwidth Limit</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                <input
                  className="input"
                  value={form.bandwidth_limit}
                  onChange={e => setForm(f => ({ ...f, bandwidth_limit: e.target.value }))}
                  placeholder="10M/10M"
                />
                <select
                  className="select"
                  style={{ minWidth: 100 }}
                  onChange={e => e.target.value && setForm(f => ({ ...f, bandwidth_limit: e.target.value }))}
                  value=""
                >
                  <option value="" disabled>Preset</option>
                  {BW_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-hint">Format: down/up — cth: 10M/10M</div>
            </div>
            <div className="form-group">
              <label className="form-label">Router</label>
              <select className="select" value={form.router_id} onChange={e => setForm(f => ({ ...f, router_id: e.target.value }))}>
                <option value="">— Pilih Router —</option>
                {routers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.ip_address})</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">🔒 Blokir Akses Situs</label>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {blockedSites.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum ada situs terdaftar.</span>
              ) : (
                blockedSites.map(site => (
                  <label key={site.key} className="form-check">
                    <input
                      type="checkbox"
                      checked={blocks.includes(site.key)}
                      onChange={e => setBlock(site.key, e.target.checked)}
                    />
                    {site.name} ({site.key})
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Catatan</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..." style={{ resize: 'vertical' }} />
          </div>
          {editUser && (
            <div className="form-group">
              <label className="form-check">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                User aktif
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!confirmDel}
        onClose={() => !deleting && setConfirmDel(null)}
        title="Hapus User"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDel(null)} disabled={deleting}>Batal</button>
            <button className="btn btn-danger" onClick={deleteUser} disabled={deleting} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {deleting ? <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
              {deleting ? 'Menghapus & Memutuskan Koneksi...' : 'Hapus & Putuskan Koneksi'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Yakin ingin menghapus user <strong style={{ color: 'var(--text)' }}>"{confirmDel?.username}"</strong>?
        </p>
        <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 8 }}>
          ⚠ Ini akan memutuskan koneksi aktif, menghapus queue bandwidth, dan user dari router.
        </p>
      </Modal>
    </>
  );
}
