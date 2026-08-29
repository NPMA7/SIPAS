import { useState, useEffect, useContext, useMemo } from 'react';
import { apiFetch, apiPost, apiPut, apiDelete } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import Modal from '../components/ui/Modal';
import { Badge, StatCard, Loader, EmptyState } from '../components/ui/index';

const ROLE_CONFIG = {
  superadmin: {
    label: 'Superadmin',
    variant: 'primary',
    badgeStyle: { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', border: 'none' },
    desc: 'Akses penuh ke seluruh sistem & manajemen pengelola',
  },
  admin: {
    label: 'Admin',
    variant: 'info',
    badgeStyle: { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' },
    desc: 'Mengelola router, hotspot, user, dan blokir situs',
  },
  operator: {
    label: 'Operator',
    variant: 'neutral',
    badgeStyle: { background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.3)' },
    desc: 'Monitoring lalu lintas dan status hotspot',
  },
  visitor: {
    label: 'Visitor',
    variant: 'neutral',
    badgeStyle: { background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)' },
    desc: 'Akses Read-Only (hanya melihat) & data sensitif disamarkan',
  },
};

export default function AdminUsers() {
  const { addToast } = useContext(ToastContext);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'admin',
    is_active: true,
  });

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin-users');
      if (res?.success) {
        setAdmins(res.data || []);
      } else {
        addToast(res?.message || 'Gagal memuat data admin.', 'danger');
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
    const active = admins.filter((a) => a.is_active).length;
    const visitors = admins.filter((a) => a.role === 'visitor').length;
    return { total, superadmins, active, visitors };
  }, [admins]);

  const openAdd = () => {
    setForm({
      username: '',
      full_name: '',
      email: '',
      password: '',
      role: 'admin',
      is_active: true,
    });
    setShowAddModal(true);
  };

  const openEdit = (admin) => {
    setSelectedAdmin(admin);
    setForm({
      username: admin.username,
      full_name: admin.full_name || '',
      email: admin.email || '',
      password: '',
      role: admin.role || 'admin',
      is_active: admin.is_active ?? true,
    });
    setShowEditModal(true);
  };

  const openDelete = (admin) => {
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
        addToast(res.message || 'Admin pengelola berhasil ditambahkan!', 'success');
        setShowAddModal(false);
        loadAdmins();
      } else {
        addToast(res?.message || 'Gagal menambahkan admin.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal menambahkan admin.', 'danger');
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
        addToast(res.message || 'Data admin berhasil diperbarui!', 'success');
        setShowEditModal(false);
        loadAdmins();
      } else {
        addToast(res?.message || 'Gagal memperbarui admin.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui admin.', 'danger');
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
        addToast(res.message || 'Admin berhasil dihapus.', 'success');
        setShowDeleteModal(false);
        setSelectedAdmin(null);
        loadAdmins();
      } else {
        addToast(res?.message || 'Gagal menghapus admin.', 'danger');
      }
    } catch (err) {
      addToast(err.message || 'Gagal menghapus admin.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
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
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          label="Pengelola Aktif"
          value={stats.active}
          variant="success"
        />
      </div>

      {/* Main Card */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Daftar Admin Pengelola Web
            <Badge variant="primary">{filteredAdmins.length}</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="search-box" style={{ minWidth: 200 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="input input-sm"
                placeholder="Cari username / nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <select
              className="select select-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">Semua Role</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="visitor">Visitor (Read-Only)</option>
            </select>

            {/* Tambah Button */}
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Pengelola
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="table-wrapper">
          {loading ? (
            <Loader />
          ) : filteredAdmins.length === 0 ? (
            <EmptyState icon="👤" text="Tidak ada data admin pengelola ditemukan." />
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
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((a) => {
                  const roleCfg = ROLE_CONFIG[a.role] || ROLE_CONFIG.admin;
                  const initial = (a.full_name || a.username)?.[0]?.toUpperCase() || 'A';
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background:
                                a.role === 'superadmin'
                                  ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                                  : a.role === 'visitor'
                                  ? 'linear-gradient(135deg, #64748b, #94a3b8)'
                                  : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {a.full_name || a.username}
                            </div>
                            {a.full_name && a.full_name !== a.username && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>@{a.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        @{a.username}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: a.email ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {a.email || '—'}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            ...roleCfg.badgeStyle,
                            padding: '4px 10px',
                            fontWeight: 600,
                            letterSpacing: '0.3px',
                          }}
                        >
                          {roleCfg.label}
                        </span>
                      </td>
                      <td>
                        <Badge variant={a.is_active ? 'success' : 'danger'}>
                          {a.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-icon-sm"
                            title="Edit Pengelola"
                            onClick={() => openEdit(a)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-danger btn-icon-sm"
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

      {/* MODAL TAMBAH ADMIN */}
      <Modal open={showAddModal} title="Tambah Pengelola Web Baru" onClose={() => setShowAddModal(false)}>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Username <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input
              type="text"
              className="input"
              placeholder="misal: admin_sipas"
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
              placeholder="admin@npma.my.id"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password <span style={{ color: 'var(--color-danger)' }}>*</span></label>
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
              className="select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="superadmin">Superadmin (Akses Penuh & Kelola Admin)</option>
              <option value="admin">Admin (Kelola Hotspot, Router, & User)</option>
              <option value="operator">Operator (Monitoring Lalu Lintas & Status)</option>
              <option value="visitor">Visitor (Read-Only & Data Sensitif Disamarkan)</option>
            </select>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {ROLE_CONFIG[form.role]?.desc}
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span style={{ fontSize: '0.88rem' }}>Status Akun Aktif (Bisa Login ke Web Admin)</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Pengelola'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDIT ADMIN */}
      <Modal open={showEditModal} title={`Edit Pengelola: @${selectedAdmin?.username || ''}`} onClose={() => setShowEditModal(false)}>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" className="input" value={form.username} disabled style={{ opacity: 0.7 }} />
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
              className="select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="superadmin">Superadmin (Akses Penuh & Kelola Admin)</option>
              <option value="admin">Admin (Kelola Hotspot, Router, & User)</option>
              <option value="operator">Operator (Monitoring Lalu Lintas & Status)</option>
              <option value="visitor">Visitor (Read-Only & Data Sensitif Disamarkan)</option>
            </select>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {ROLE_CONFIG[form.role]?.desc}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Reset Password Baru{' '}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
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

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span style={{ fontSize: '0.88rem' }}>Status Akun Aktif (Bisa Login ke Web Admin)</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Perbarui Pengelola'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal open={showDeleteModal} title="Konfirmasi Hapus Pengelola" onClose={() => setShowDeleteModal(false)}>
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: 12 }}>
            Apakah Anda yakin ingin menghapus akun pengelola <strong>@{selectedAdmin?.username}</strong> ({selectedAdmin?.full_name || 'Admin'})?
          </p>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '0.82rem',
              color: '#f87171',
              marginBottom: 16,
            }}
          >
            ⚠️ Akun ini tidak akan bisa login lagi ke Dashboard Admin SIPAS setelah dihapus.
          </div>
        </div>
        <div className="modal-actions">
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
