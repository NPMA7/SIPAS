import { useState, useEffect, useContext, useRef } from 'react';
import { apiFetch, apiPost, apiPut, apiDelete } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import Modal from '../components/ui/Modal';
import { Badge, Loader, EmptyState } from '../components/ui/index';

const BW_PRESETS = ['1M/512K', '2M/1M', '5M/2M', '10M/10M', '20M/20M', '50M/50M', '100M/100M'];

function UserCard({ user, blockedSites = [], isVisitor = false, onEdit, onDelete }) {
  const primaryTitle = user.full_name || user.username;
  const initial = primaryTitle?.[0]?.toUpperCase() || '?';
  const blocks = (user.website_block || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => Boolean(s) && !['true', 'false', '0', '1'].includes(s.toLowerCase()));
  const siteMap = Object.fromEntries(blockedSites.map(s => [s.key, s]));

  const details = [];
  if (user.full_name && user.full_name !== user.username) {
    details.push(user.username);
  }
  if (user.jabatan) details.push(user.jabatan);
  if (user.instansi) {
    details.push(user.instansi.toLowerCase().includes('gol') ? user.instansi : `Gol. ${user.instansi}`);
  }
  const subInfo = details.length > 0 ? details.join(' • ') : (user.username !== primaryTitle ? user.username : '—');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 border-b border-slate-800/80 hover:bg-slate-850/50 transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-100 truncate">{primaryTitle}</span>
            {user.auth_provider === 'sso' ? (
              <Badge variant="info">SSO</Badge>
            ) : (
              <Badge variant="neutral">Lokal</Badge>
            )}
          </div>
          <div className="text-xs text-slate-400 truncate mt-0.5">{subInfo}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
        <Badge variant="primary">{user.bandwidth_limit || '—'}</Badge>
        <Badge variant="neutral">Max {user.max_devices || 4} Device</Badge>
        {blocks.map(bKey => (
          <Badge key={bKey} variant="danger">
            {siteMap[bKey]?.name || bKey.toUpperCase()}
          </Badge>
        ))}
        {user.router_name ? (
          <Badge variant="info">{user.router_name}</Badge>
        ) : (
          <Badge variant="neutral">Semua Router</Badge>
        )}
        <Badge variant={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>

        {!isVisitor && (
          <div className="flex items-center gap-1 ml-2">
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Edit user"
              onClick={() => onEdit(user)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  username: '', password: '', full_name: '', email: '', jabatan: '', instansi: '',
  bandwidth_limit: '10M/10M', max_devices: 4, router_id: '', website_block: '', notes: '', is_active: true,
  auth_provider: 'local',
};

export default function Users() {
  const ctx = useContext(ToastContext);
  const currentAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('hotspot_admin') || '{}'); } catch { return {}; }
  })();
  const isVisitor = currentAdmin.role === 'visitor';

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

  useEffect(() => { loadUsers(page, search); }, [page, routerFilter, providerFilter]);

  async function loadUsers(p = page, s = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: p,
        limit: 20,
        search: s,
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
    searchTimer.current = setTimeout(() => { setPage(1); loadUsers(1, v); }, 300);
  }

  function openAdd() {
    setEditUser(null);
    setForm({ ...EMPTY_FORM, router_id: routers[0]?.id || '' });
    setModal(true);
  }

  function openEdit(user) {
    setEditUser(user);
    setForm({
      username: user.username || '',
      password: user.password || '',
      full_name: user.full_name || '',
      email: user.email || '',
      jabatan: user.jabatan || '',
      instansi: user.instansi || '',
      bandwidth_limit: user.bandwidth_limit || '10M/10M',
      max_devices: user.max_devices || 4,
      router_id: user.router_id || '',
      website_block: user.website_block || '',
      notes: user.notes || '',
      is_active: user.is_active !== false,
    });
    setModal(true);
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

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <span>Daftar User</span>
            <Badge variant="primary">{total}</Badge>
          </div>
          <div className="card-actions">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="search-input"
                placeholder="Cari nama, username, NIP..."
                value={search}
                onChange={e => onSearchChange(e.target.value)}
              />
            </div>
            <select
              className="select min-w-36"
              value={providerFilter}
              onChange={e => { setProviderFilter(e.target.value); setPage(1); }}
            >
              <option value="">Semua Provider</option>
              <option value="sso">User SSO</option>
              <option value="local">User Lokal / Tamu</option>
            </select>

            <select
              className="select min-w-36"
              value={routerFilter}
              onChange={e => { setRouterFilter(e.target.value); setPage(1); }}
            >
              <option value="">Semua Router</option>
              {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            {!isVisitor && (
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Tambah User</span>
              </button>
            )}
          </div>
        </div>

        {isVisitor && (
          <div className="m-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shrink-0 text-blue-400">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span><strong>Mode Visitor (Read-Only)</strong></span>
          </div>
        )}

        {loading ? (
          <Loader />
        ) : users.length === 0 ? (
          <EmptyState text="Belum ada user. Klik 'Tambah User'." />
        ) : (
          <div className="divide-y divide-slate-800/60">
            {users.map(u => (
              <UserCard
                key={u.id}
                user={u}
                routers={routers}
                blockedSites={blockedSites}
                isVisitor={isVisitor}
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
                <span key={p} className="inline-flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="page-btn cursor-default">…</span>}
                  <button className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                </span>
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
              <span>{editUser ? 'Update' : 'Simpan'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={submitForm} className="space-y-4">
          {editUser?.auth_provider === 'sso' && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shrink-0 text-blue-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <strong>User SSO (Sinkronisasi Otomatis)</strong>
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
                  <input className="input opacity-60 cursor-not-allowed" value="••••••••••••" disabled />
                </div>
              ) : (
                <input className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="password" required={!editUser} />
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                className={`input ${editUser?.auth_provider === 'sso' ? 'opacity-60 cursor-not-allowed' : ''}`}
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Nama lengkap..."
                disabled={editUser?.auth_provider === 'sso'}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Golongan</label>
              <input
                className={`input ${editUser?.auth_provider === 'sso' ? 'opacity-60 cursor-not-allowed' : ''}`}
                value={form.instansi}
                onChange={e => setForm(f => ({ ...f, instansi: e.target.value }))}
                placeholder="IV/a, III/a, dll"
                disabled={editUser?.auth_provider === 'sso'}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Jabatan</label>
            <input
              className={`input ${editUser?.auth_provider === 'sso' ? 'opacity-60 cursor-not-allowed' : ''}`}
              value={form.jabatan}
              onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))}
              placeholder="Pranata Komputer / Kabid / dll"
              disabled={editUser?.auth_provider === 'sso'}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bandwidth Limit</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={form.bandwidth_limit}
                  onChange={e => setForm(f => ({ ...f, bandwidth_limit: e.target.value }))}
                  placeholder="10M/10M"
                />
                <select
                  className="select min-w-28"
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
              <label className="form-label">Max Devices (Batas Perangkat)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={50}
                value={form.max_devices}
                onChange={e => setForm(f => ({ ...f, max_devices: parseInt(e.target.value) || 4 }))}
                placeholder="4"
              />
              <div className="form-hint">Default 4 perangkat aktif terhubung</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Router</label>
            <select className="select w-full" value={form.router_id} onChange={e => setForm(f => ({ ...f, router_id: e.target.value }))}>
              <option value="">— Semua Router —</option>
              {routers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.ip_address})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..." />
          </div>

          {editUser && (
            <div className="form-group">
              <label className="form-check">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <span>User aktif</span>
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
            <button className="btn btn-danger" onClick={deleteUser} disabled={deleting}>
              {deleting ? <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
              <span>{deleting ? 'Menghapus...' : 'Hapus & Putuskan Koneksi'}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Yakin ingin menghapus user <strong className="text-slate-100">"{confirmDel?.username}"</strong>?
        </p>
        <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shrink-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Ini akan memutuskan koneksi aktif, menghapus queue bandwidth, dan user dari router.</span>
        </p>
      </Modal>
    </>
  );
}
