import { useState, useEffect, useContext, useMemo } from 'react';
import { apiFetch, apiPost, apiPut, apiDelete } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import Modal from '../components/ui/Modal';
import { Badge, StatCard, Loader, EmptyState } from '../components/ui/index';

const ROLE_CONFIG = {
  superadmin: {
    label: 'Superadmin',
    variant: 'primary',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    avatarBg: 'bg-blue-700',
    desc: 'Akses penuh ke seluruh sistem & manajemen pengelola web',
  },
  operator: {
    label: 'Operator SIPAS',
    variant: 'info',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    avatarBg: 'bg-sky-600',
    desc: 'Mengelola router, pengguna SIPAS, antrean bandwidth, dan situs',
  },
  visitor: {
    label: 'Visitor',
    variant: 'neutral',
    badgeClass: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
    avatarBg: 'bg-slate-700',
    desc: 'Akses Read-Only (hanya melihat) & data sensitif disamarkan',
  },
};

export default function AdminUsers() {
  const { addToast } = useContext(ToastContext);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Current logged in admin info
  const currentAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('hotspot_admin') || '{}');
    } catch {
      return {};
    }
  }, []);
  const isSuperAdmin = currentAdmin?.role === 'superadmin';

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State (Default role: operator)
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'operator',
    is_active: true,
  });

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin-users');
      if (res?.success) {
        setAdmins(res.data || []);
      } else {
        addToast(res?.message || 'Gagal memuat data pengelola.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal terhubung ke server.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchSearch =
        search === '' ||
        (a.username && a.username.toLowerCase().includes(search.toLowerCase())) ||
        (a.full_name && a.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (a.email && a.email.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === 'all' || a.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [admins, search, roleFilter]);

  const stats = useMemo(() => {
    const total = admins.length;
    const superadmins = admins.filter((a) => a.role === 'superadmin').length;
    const operators = admins.filter((a) => a.role === 'operator').length;
    const visitors = admins.filter((a) => a.role === 'visitor').length;
    return { total, superadmins, operators, visitors };
  }, [admins]);

  const openAdd = () => {
    if (!isSuperAdmin) {
      addToast('Hanya Superadmin yang dapat menambahkan pengelola baru.', 'warning');
      return;
    }
    setForm({
      username: '',
      full_name: '',
      email: '',
      password: '',
      role: 'operator',
      is_active: true,
    });
    setShowAddModal(true);
  };

  const openEdit = (admin) => {
    if (!isSuperAdmin) {
      addToast('Hanya Superadmin yang dapat mengubah data pengelola.', 'warning');
      return;
    }
    setSelectedAdmin(admin);
    setForm({
      username: admin.username,
      full_name: admin.full_name || '',
      email: admin.email || '',
      password: '',
      role: admin.role || 'operator',
      is_active: admin.is_active ?? true,
    });
    setShowEditModal(true);
  };

  const openDelete = (admin) => {
    if (!isSuperAdmin) {
      addToast('Hanya Superadmin yang dapat menghapus pengelola.', 'warning');
      return;
    }
    if (admin.role === 'superadmin') {
      addToast('Akun Superadmin tidak dapat dihapus melalui antarmuka web.', 'danger');
      return;
    }
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      addToast('Username dan password wajib diisi.', 'warning');
      return;
    }
    if (form.password.length < 6) {
      addToast('Password minimal 6 karakter.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await apiPost('/admin-users', form);
      if (res?.success) {
        addToast(res.message || 'Pengelola berhasil ditambahkan!', 'success');
        setShowAddModal(false);
        loadAdmins();
      } else {
        addToast(res?.message || 'Gagal menambahkan pengelola.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal menambahkan pengelola.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    const payload = {
      full_name: form.full_name,
      email: form.email,
      role: form.role,
      is_active: form.is_active,
    };
    if (form.password && form.password.trim().length > 0) {
      if (form.password.length < 6) {
        addToast('Password baru minimal 6 karakter.', 'warning');
        return;
      }
      payload.password = form.password;
    }

    try {
      setSaving(true);
      const res = await apiPut(`/admin-users/${selectedAdmin.id}`, payload);
      if (res?.success) {
        addToast(res.message || 'Data pengelola berhasil diperbarui!', 'success');
        setShowEditModal(false);
        loadAdmins();
      } else {
        addToast(res?.message || 'Gagal memperbarui pengelola.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui pengelola.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAdmin) return;
    try {
      setSaving(true);
      const res = await apiDelete(`/admin-users/${selectedAdmin.id}`);
      if (res?.success) {
        addToast(res.message || 'Pengelola berhasil dihapus.', 'success');
        setShowDeleteModal(false);
        setSelectedAdmin(null);
        loadAdmins();
      } else {
        addToast(res?.message || 'Gagal menghapus pengelola.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal menghapus pengelola.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          label="Total Pengelola Web"
          value={stats.total}
          variant="primary"
        />
        {isSuperAdmin && (
          <StatCard
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            }
            label="Super Administrator"
            value={stats.superadmins}
            variant="warning"
          />
        )}
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          label="Operator SIPAS"
          value={stats.operators}
          variant="info"
        />
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
          label="Visitor (Read-Only)"
          value={stats.visitors}
          variant="neutral"
        />
      </div>

      {/* Main Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Daftar Admin Pengelola Web</span>
            <Badge variant="primary">{filteredAdmins.length}</Badge>
          </div>

          <div className="card-actions">
            {/* Search */}
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Cari username / nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <select
              className="select min-w-36"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Semua Role</option>
              {isSuperAdmin && <option value="superadmin">Superadmin</option>}
              <option value="operator">Operator SIPAS</option>
              <option value="visitor">Visitor (Read-Only)</option>
            </select>

            {/* Tambah Button: Only Superadmin */}
            {isSuperAdmin && (
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Tambah Pengelola</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className="table-wrapper">
          {loading ? (
            <Loader />
          ) : filteredAdmins.length === 0 ? (
            <EmptyState text="Tidak ada data pengelola ditemukan." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pengelola</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role Hak Akses</th>
                  <th>Status Akses</th>
                  <th>Dibuat</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((a) => {
                  const roleCfg = ROLE_CONFIG[a.role] || ROLE_CONFIG.operator;
                  const initial = (a.full_name || a.username)?.[0]?.toUpperCase() || 'P';
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${roleCfg.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">
                              {a.full_name || a.username}
                            </div>
                            {a.full_name && a.full_name !== a.username && (
                              <div className="text-[11px] text-slate-400">@{a.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="mono font-semibold text-slate-200">
                        @{a.username}
                      </td>
                      <td className="text-xs text-slate-300">
                        {a.email || '—'}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleCfg.badgeClass}`}>
                          {roleCfg.label}
                        </span>
                      </td>
                      <td>
                        <Badge variant={a.is_active ? 'success' : 'danger'}>
                          {a.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="text-xs text-slate-400">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {isSuperAdmin && (
                            <button
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Pengelola"
                              onClick={() => openEdit(a)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}

                          {a.role !== 'superadmin' ? (
                            isSuperAdmin && (
                              <button
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Hapus Pengelola"
                                onClick={() => openDelete(a)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            )
                          ) : (
                            <span
                              className="inline-flex items-center justify-center w-7 h-7 text-slate-600 cursor-not-allowed"
                              title="Superadmin diproteksi"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH PENGELOLA (Khusus Superadmin) */}
      <Modal open={showAddModal} title="Tambah Pengelola Web Baru" onClose={() => setShowAddModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Username <span className="text-rose-400">*</span></label>
            <input
              type="text"
              className="input"
              placeholder="misal: operator_sipas"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input
              type="text"
              className="input"
              placeholder="misal: Bagian IT Diskominfo"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="operator@npma.my.id"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password <span className="text-rose-400">*</span></label>
            <input
              type="password"
              className="input"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role Hak Akses</label>
            <select
              className="select w-full"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="superadmin">Superadmin (Akses Penuh & Kelola Pengelola)</option>
              <option value="operator">Operator SIPAS (Kelola SIPAS, Router, & User)</option>
              <option value="visitor">Visitor (Read-Only & Data Sensitif Disamarkan)</option>
            </select>
            <div className="text-xs text-slate-400 mt-1">
              {ROLE_CONFIG[form.role]?.desc}
            </div>
          </div>

          <div className="form-group pt-1">
            <label className="form-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span>Status Akun Aktif (Bisa Login ke Web Admin)</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Pengelola'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDIT PENGELOLA (Khusus Superadmin) */}
      <Modal open={showEditModal} title={`Edit Pengelola: @${selectedAdmin?.username || ''}`} onClose={() => setShowEditModal(false)}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" className="input opacity-70" value={form.username} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input
              type="text"
              className="input"
              placeholder="Nama Lengkap"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role Hak Akses</label>
            <select
              className="select w-full"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="superadmin">Superadmin (Akses Penuh & Kelola Pengelola)</option>
              <option value="operator">Operator SIPAS (Kelola SIPAS, Router, & User)</option>
              <option value="visitor">Visitor (Read-Only & Data Sensitif Disamarkan)</option>
            </select>
            <div className="text-xs text-slate-400 mt-1">
              {ROLE_CONFIG[form.role]?.desc}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Reset Password Baru{' '}
              <span className="text-[11px] text-slate-400 font-normal">
                (Kosongkan jika tidak ingin mengubah password)
              </span>
            </label>
            <input
              type="password"
              className="input"
              placeholder="Password baru (opsional, min 6 karakter)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="form-group pt-1">
            <label className="form-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span>Status Akun Aktif (Bisa Login ke Web Admin)</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Perbarui Pengelola'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS (Khusus Superadmin) */}
      <Modal open={showDeleteModal} title="Konfirmasi Hapus Pengelola" onClose={() => setShowDeleteModal(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Apakah Anda yakin ingin menghapus akun pengelola <strong className="text-slate-100">@{selectedAdmin?.username}</strong> ({selectedAdmin?.full_name || 'Pengelola'})?
          </p>
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shrink-0 text-rose-400">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Akun ini tidak akan bisa login lagi ke Dashboard Admin SIPAS setelah dihapus.</span>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
            Batal
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
            {saving ? 'Menghapus...' : 'Hapus Sekarang'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
