import { useState, useEffect, useContext } from 'react';
import { apiFetch, apiPost, apiPut, apiDelete } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import Modal from '../components/ui/Modal';
import { Badge, Loader, EmptyState } from '../components/ui/index';

const EMPTY_FORM = {
  key: '',
  name: '',
  domains: '',
  l7_regex: '',
  is_active: true,
  user_ids: [],
};

function generateL7Regex(domainsStr) {
  if (!domainsStr || !domainsStr.trim()) return '';
  const keywords = domainsStr
    .split(',')
    .map(d => {
      const clean = d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
      const parts = clean.split('.');
      return parts[0]; // cth: detik.com -> detik
    })
    .filter(Boolean);

  if (keywords.length === 0) return '';
  const uniqueKeywords = [...new Set(keywords)].join('|');
  return `^.*(${uniqueKeywords}).*$`;
}

export default function BlockedSites() {
  const ctx = useContext(ToastContext);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    ctx?.setPageTitle?.('Daftar Situs Diblokir');
    loadSites();
  }, [ctx]);

  async function loadSites() {
    setLoading(true);
    try {
      const res = await apiFetch('/blocked-sites');
      if (res?.success) {
        setSites(res.data || []);
        setUsers(res.users || []);
      }
    } catch (err) {
      ctx?.addToast?.('danger', err.message || 'Gagal memuat daftar situs.');
    } finally {
      setLoading(false);
    }
  }

  function handleDomainsChange(val) {
    const autoRegex = generateL7Regex(val);
    setForm(f => {
      let newKey = f.key;
      let newName = f.name;
      if (!editSite && val.trim()) {
        const firstDomain = val.split(',')[0].trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
        const keyword = firstDomain.split('.')[0];
        if (keyword && (!f.key || f.key === f.domains.split(',')[0]?.trim()?.toLowerCase()?.replace(/^https?:\/\//, '')?.replace(/^www\./, '')?.split('.')[0])) {
          newKey = keyword;
          newName = keyword;
        }
      }
      return {
        ...f,
        domains: val,
        key: newKey,
        name: newName,
        l7_regex: autoRegex,
      };
    });
  }

  function openAdd() {
    setEditSite(null);
    setUserSearch('');
    setForm({ ...EMPTY_FORM, user_ids: users.map(u => u.id) });
    setModal(true);
  }

  function openEdit(site) {
    setEditSite(site);
    setUserSearch('');
    setForm({
      key: site.key || '',
      name: site.name || '',
      domains: site.domains || '',
      l7_regex: site.l7_regex || '',
      is_active: site.is_active !== false,
      user_ids: site.blocked_user_ids || [],
    });
    setModal(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (editSite) {
        res = await apiPut(`/blocked-sites/${editSite.id}`, form);
      } else {
        res = await apiPost('/blocked-sites', form);
      }

      if (res?.success) {
        ctx?.addToast('Sukses', res.message || 'Situs berhasil disimpan.', 'success');
        setModal(false);
        loadSites();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal menyimpan situs.', 'danger');
      }
    } catch (err) {
      ctx?.addToast('Error', err.message || 'Koneksi gagal.', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSite() {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    try {
      const res = await apiDelete(`/blocked-sites/${confirmDel.id}`);
      if (res?.success) {
        ctx?.addToast('Dihapus', res.message || 'Situs berhasil dihapus.', 'success');
        setConfirmDel(null);
        loadSites();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal menghapus situs.', 'danger');
      }
    } catch (err) {
      ctx?.addToast('Error', err.message || 'Koneksi gagal.', 'danger');
    } finally {
      setDeleting(false);
    }
  }

  const filteredSites = sites.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.key?.toLowerCase().includes(search.toLowerCase()) ||
    s.domains?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Daftar Situs Diblokir
          <Badge variant="primary">{filteredSites.length}</Badge>
        </div>
        <div className="card-actions">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              placeholder="Cari situs / domain..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Situs
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : filteredSites.length === 0 ? (
        <EmptyState icon="🔒" text="Belum ada situs yang didaftarkan. Klik 'Tambah Situs'." />
      ) : (
        <div style={{ display: 'grid', gap: 12, padding: 16 }}>
          {filteredSites.map(site => (
            <div key={site.id} className="user-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div className="user-card-avatar" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  🔒
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{site.name}</span>
                    <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 500 }}>({site.key})</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {site.domains.split(',').map(d => (
                      <span key={d.trim()} style={{ background: 'var(--bg-tertiary, #1e293b)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                        {d.trim()}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: '#f87171', fontWeight: 600, fontSize: 11 }}>🔒 Diblokir untuk ({site.blocked_user_ids?.length || 0} User):</span>
                    {site.blocked_usernames && site.blocked_usernames.length > 0 ? (
                      site.blocked_usernames.slice(0, 5).map((uname, idx) => (
                        <Badge key={idx} variant="danger" style={{ fontSize: 10, padding: '2px 6px' }}>{uname}</Badge>
                      ))
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 11 }}>Tidak ada user</span>
                    )}
                    {site.blocked_usernames && site.blocked_usernames.length > 5 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{site.blocked_usernames.length - 5} lainnya</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
                <Badge variant={site.is_active ? 'success' : 'neutral'}>
                  {site.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
                <div className="user-card-actions">
                  <button className="btn btn-ghost btn-icon-sm" title="Edit situs" onClick={() => openEdit(site)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="btn btn-danger btn-icon-sm" title="Hapus situs" onClick={() => setConfirmDel(site)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editSite ? `Edit Situs — ${editSite.name}` : 'Tambah Situs Diblokir Baru'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={submitForm} disabled={saving}>
              {saving ? <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
              {editSite ? 'Update' : 'Simpan'}
            </button>
          </>
        }
      >
        <form onSubmit={submitForm}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Key ID (Tanpa spasi) *</label>
              <input
                className="input"
                value={form.key}
                onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                placeholder="facebook"
                required
                disabled={!!editSite}
              />
              <div className="form-hint">Kode unik huruf kecil, cth: facebook, tiktok</div>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Situs *</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Facebook & Instagram"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Daftar Domain (Pisahkan dengan koma) *</label>
            <input
              className="input"
              value={form.domains}
              onChange={e => handleDomainsChange(e.target.value)}
              placeholder="facebook.com, instagram.com, fbcdn.net"
              required
            />
            <div className="form-hint">Domain utama & CDN yang berhubungan dengan situs ini</div>
          </div>

          <div className="form-group">
            <label className="form-label">Custom Layer-7 Regex (Opsional)</label>
            <input
              className="input"
              value={form.l7_regex}
              onChange={e => setForm(f => ({ ...f, l7_regex: e.target.value }))}
              placeholder="^.*(facebook|instagram|fbcdn).*$"
            />
            <div className="form-hint">Jika dikosongkan, regex akan dibuat otomatis dari daftar domain</div>
          </div>

          {/* User Selection Section */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>🔒 Pilih User yang Diblokir Situs Ini</label>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--primary-light)' }}
                onClick={() => {
                  const allSelected = (form.user_ids || []).length === users.length;
                  setForm(f => ({ ...f, user_ids: allSelected ? [] : users.map(u => u.id) }));
                }}
              >
                {(form.user_ids || []).length === users.length ? 'Batalkan Semua' : 'Pilih Semua User'}
              </button>
            </div>

            <div className="search-wrapper" style={{ marginBottom: 8 }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="search-input"
                style={{ fontSize: '0.8rem', padding: '6px 12px 6px 30px' }}
                placeholder="Cari nama / username..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 8,
              maxHeight: 180,
              overflowY: 'auto',
              padding: 10,
              background: 'var(--bg-tertiary, #0f172a)',
              borderRadius: 6,
              border: '1px solid var(--border)'
            }}>
              {users.filter(u =>
                (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                (u.username || '').toLowerCase().includes(userSearch.toLowerCase())
              ).length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tidak ada user yang cocok.</span>
              ) : (
                users
                  .filter(u =>
                    (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.username || '').toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map(u => {
                    const isChecked = (form.user_ids || []).includes(u.id);
                    return (
                      <label key={u.id} className="form-check" style={{ fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const checked = e.target.checked;
                            setForm(f => ({
                              ...f,
                              user_ids: checked
                                ? [...(f.user_ids || []), u.id]
                                : (f.user_ids || []).filter(id => id !== u.id)
                            }));
                          }}
                        />
                        <span>{u.full_name || u.username} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({u.username})</span></span>
                      </label>
                    );
                  })
              )}
            </div>
            <div className="form-hint">User yang dicentang akan diblokir pengaksesan domain situs ini.</div>
          </div>

          {editSite && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                Aturan Blokir Aktif
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDel}
        onClose={() => !deleting && setConfirmDel(null)}
        title="Hapus Situs Diblokir"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDel(null)} disabled={deleting}>Batal</button>
            <button className="btn btn-danger" onClick={deleteSite} disabled={deleting} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {deleting && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </>
        }
      >
        <p>Apakah Anda yakin ingin menghapus situs <strong>{confirmDel?.name}</strong> (<code>{confirmDel?.key}</code>) dari daftar blokir?</p>
      </Modal>
    </div>
  );
}
