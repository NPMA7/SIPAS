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
      return parts[0];
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
  const [userFilterTab, setUserFilterTab] = useState('all');
  const [modal, setModal] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currentAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('hotspot_admin') || '{}'); } catch { return {}; }
  })();
  const isVisitor = currentAdmin?.role === 'visitor';

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

  const displayUsers = users.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                          (u.username || '').toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    const isChecked = (form.user_ids || []).includes(u.id);
    if (userFilterTab === 'selected') return isChecked;
    if (userFilterTab === 'unselected') return !isChecked;
    return true;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Daftar Situs Diblokir</span>
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
          {!isVisitor && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Tambah Situs</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-6"><Loader /></div>
      ) : filteredSites.length === 0 ? (
        <div className="p-6"><EmptyState text="Belum ada situs yang didaftarkan. Klik 'Tambah Situs'." /></div>
      ) : (
        <div className="p-4 space-y-3">
          {filteredSites.map(site => (
            <div
              key={site.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-100">{site.name}</span>
                    <span className="text-xs font-mono font-medium text-sky-400">({site.key})</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {site.domains.split(',').map(d => (
                      <span key={d.trim()} className="bg-slate-800/80 text-slate-300 border border-slate-700/50 px-2 py-0.5 rounded text-[11px] font-mono">
                        {d.trim()}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5 text-xs text-slate-400">
                    <span className="text-rose-400 font-semibold text-[11px] flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Diblokir untuk ({site.blocked_user_ids?.length || 0} User):
                    </span>
                    {site.blocked_usernames && site.blocked_usernames.length > 0 ? (
                      site.blocked_usernames.slice(0, 5).map((uname, idx) => (
                        <Badge key={idx} variant="danger" className="text-[10px] py-0">{uname}</Badge>
                      ))
                    ) : (
                      <span className="italic text-slate-500 text-[11px]">Tidak ada user</span>
                    )}
                    {site.blocked_usernames && site.blocked_usernames.length > 5 && (
                      <span className="text-[11px] text-slate-500 font-medium">+{site.blocked_usernames.length - 5} lainnya</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <Badge variant={site.is_active ? 'success' : 'neutral'}>
                  {site.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
                {!isVisitor && (
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer" title="Edit situs" onClick={() => openEdit(site)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer" title="Hapus situs" onClick={() => setConfirmDel(site)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        maxWidth="max-w-2xl"
        title={editSite ? `Edit Situs — ${editSite.name}` : 'Tambah Situs Diblokir Baru'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={submitForm} disabled={saving}>
              {saving ? <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
              <span>{editSite ? 'Update' : 'Simpan'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={submitForm} className="space-y-4">
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
          <div className="form-group pt-2">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="form-label m-0 font-semibold flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" className="text-rose-400">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Pilih User yang Diblokir Situs Ini
                </label>
                <Badge variant={(form.user_ids || []).length > 0 ? 'danger' : 'neutral'}>
                  {(form.user_ids || []).length} / {users.length} User
                </Badge>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-sky-400"
                  onClick={() => setForm(f => ({ ...f, user_ids: users.map(u => u.id) }))}
                >
                  Pilih Semua ({users.length})
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-slate-400"
                  onClick={() => setForm(f => ({ ...f, user_ids: [] }))}
                >
                  Batalkan Semua
                </button>
              </div>
            </div>

            {/* Filter Mode Tabs & Search Bar */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="input pl-8 py-1.5 text-xs"
                  placeholder="Cari nama / username..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <select
                className="select text-xs py-1.5"
                value={userFilterTab}
                onChange={e => setUserFilterTab(e.target.value)}
              >
                <option value="all">Semua User ({users.length})</option>
                <option value="selected">Terpilih ({(form.user_ids || []).length})</option>
                <option value="unselected">Belum Terpilih ({users.length - (form.user_ids || []).length})</option>
              </select>
            </div>

            {/* Selected Chips Preview */}
            {(form.user_ids || []).length > 0 && (
              <div className="flex gap-1.5 flex-wrap p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-2 max-h-20 overflow-y-auto">
                <span className="text-[11px] text-rose-400 font-bold self-center">Terpilih:</span>
                {users.filter(u => (form.user_ids || []).includes(u.id)).slice(0, 10).map(u => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 bg-rose-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-full"
                  >
                    {u.username}
                    <button
                      type="button"
                      className="cursor-pointer font-bold ml-1 hover:text-slate-200"
                      onClick={() => setForm(f => ({ ...f, user_ids: (f.user_ids || []).filter(id => id !== u.id) }))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(form.user_ids || []).length > 10 && (
                  <span className="text-[10px] text-slate-400 self-center">
                    +{(form.user_ids || []).length - 10} lainnya
                  </span>
                )}
              </div>
            )}

            {/* Scrollable User List */}
            <div className="flex flex-col max-h-52 overflow-y-auto bg-slate-950/60 rounded-lg border border-slate-800 divide-y divide-slate-800/80">
              {displayUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Tidak ada user yang sesuai filter.
                </div>
              ) : (
                displayUsers.map(u => {
                  const isChecked = (form.user_ids || []).includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          user_ids: isChecked
                            ? (f.user_ids || []).filter(id => id !== u.id)
                            : [...(f.user_ids || []), u.id]
                        }));
                      }}
                      className={`flex items-center justify-between p-2.5 px-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-rose-500/10' : 'hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded accent-rose-500 cursor-pointer"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-medium truncate ${isChecked ? 'text-rose-300 font-semibold' : 'text-slate-200'}`}>
                            {u.full_name || u.username}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">
                            @{u.username} {u.jabatan ? `• ${u.jabatan}` : ''}
                          </span>
                        </div>
                      </div>
                      <Badge variant={isChecked ? 'danger' : 'neutral'} className="text-[10px] py-0">
                        {isChecked ? 'Diblokir' : 'Diizinkan'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {editSite && (
            <div className="form-group pt-1">
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                <span>Aturan Blokir Aktif</span>
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
            <button className="btn btn-danger" onClick={deleteSite} disabled={deleting}>
              {deleting && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{deleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Apakah Anda yakin ingin menghapus situs <strong className="text-slate-100">{confirmDel?.name}</strong> (<code>{confirmDel?.key}</code>) dari daftar blokir?
        </p>
      </Modal>
    </div>
  );
}
