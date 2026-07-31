import { useState, useEffect, useContext, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import { Badge, Loader, EmptyState } from '../components/ui/index';
import Modal from '../components/ui/Modal';

const TABS = [
  {
    key: 'active',
    path: 'active-sessions',
    label: 'Sesi Aktif',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
  },
  {
    key: 'hosts',
    path: 'host-connected',
    label: 'Host Terhubung',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01"/></svg>
  },
  {
    key: 'users',
    path: 'user-router',
    label: 'User Router',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    key: 'bindings',
    path: 'bindings',
    label: 'IP Binding',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  },
];

function formatBytes(b) {
  const n = parseInt(b) || 0;
  if (n >= 1073741824) return (n / 1073741824).toFixed(2) + ' GB';
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
  return n + ' B';
}

function formatSpeed(val) {
  if (!val || val === '0' || val === '0 bps' || val === 0) return '0 bps';
  if (typeof val === 'string' && (val.includes('kbps') || val.includes('Mbps') || val.includes('Gbps') || val.includes('bps'))) {
    return val;
  }
  const n = typeof val === 'number' ? val : (parseInt(val) || 0);
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + ' Gbps';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + ' Mbps';
  if (n >= 1000) return (n / 1000).toFixed(1) + ' kbps';
  return n + ' bps';
}

export default function Hotspot() {
  const ctx = useContext(ToastContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [routers, setRouters] = useState([]);
  const [routerId, setRouterId] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({ active: 0, hosts: 0, users: 0, bindings: 0 });
  
  // Modals state
  const [confirmKick, setConfirmKick] = useState(null);
  const [kicking, setKicking] = useState(false);
  
  const [showAddBindingModal, setShowAddBindingModal] = useState(false);
  const [addingBinding, setAddingBinding] = useState(false);
  const [newBinding, setNewBinding] = useState({
    macAddress: '',
    address: '',
    toAddress: '',
    server: 'all',
    type: 'bypassed',
    comment: ''
  });

  const [confirmDeleteBinding, setConfirmDeleteBinding] = useState(null);
  const [deletingBinding, setDeletingBinding] = useState(false);

  // Sync tab with URL
  const currentPathSegment = location.pathname.replace('/admin/hotspot', '').replace(/^\//, '');
  const activeTabObj = TABS.find(t => t.path === currentPathSegment) || TABS[0];
  const tab = activeTabObj.key;

  useEffect(() => {
    // If URL is just /admin/hotspot or invalid sub-path, redirect to active-sessions
    if (!currentPathSegment || !TABS.some(t => t.path === currentPathSegment)) {
      navigate('/admin/hotspot/active-sessions', { replace: true });
    }
  }, [currentPathSegment, navigate]);

  useEffect(() => {
    ctx?.setPageTitle?.(`Hotspot Router - ${activeTabObj.label}`);
  }, [ctx, activeTabObj]);

  const loadRouters = useCallback(async () => {
    try {
      const d = await apiFetch('/routers');
      if (d?.success && d.data.length > 0) {
        setRouters(d.data);
        setRouterId(prev => prev || d.data[0].id);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadRouters();
  }, [loadRouters]);

  const loadAllCounts = useCallback(async () => {
    if (!routerId) return;
    try {
      const [resActive, resHosts, resUsers, resBindings] = await Promise.all([
        apiFetch(`/hotspot-router/active?router_id=${routerId}`),
        apiFetch(`/hotspot-router/hosts?router_id=${routerId}`),
        apiFetch(`/hotspot-router/users?router_id=${routerId}`),
        apiFetch(`/hotspot-router/bindings?router_id=${routerId}`)
      ]);
      const isRealUser = a => a && a.user && String(a.user).trim() !== '' && String(a.user).trim() !== '—' && String(a.user).trim() !== 'undefined' && String(a.user).trim() !== 'null';
      const validActive = (resActive?.data || []).filter(isRealUser);
      setCounts({
        active: validActive.length,
        hosts: resHosts?.success ? (resHosts.data || []).length : 0,
        users: resUsers?.success ? (resUsers.data || []).length : 0,
        bindings: resBindings?.success ? (resBindings.data || []).length : 0,
      });
    } catch (err) {
      console.warn('Failed to load counts:', err.message);
    }
  }, [routerId]);

  const loadTab = useCallback(async (t) => {
    if (!routerId) return;
    setLoading(true);
    setSearch('');
    try {
      let res;
      if (t === 'active') res = await apiFetch(`/hotspot-router/active?router_id=${routerId}`);
      else if (t === 'hosts') res = await apiFetch(`/hotspot-router/hosts?router_id=${routerId}`);
      else if (t === 'users') res = await apiFetch(`/hotspot-router/users?router_id=${routerId}`);
      else if (t === 'bindings') res = await apiFetch(`/hotspot-router/bindings?router_id=${routerId}`);

      if (res?.success) {
        const rawList = res.data || [];
        if (t === 'active') {
          const isRealUser = a => a && a.user && String(a.user).trim() !== '' && String(a.user).trim() !== '—' && String(a.user).trim() !== 'undefined' && String(a.user).trim() !== 'null';
          setData(rawList.filter(isRealUser));
        } else {
          setData(rawList);
        }
      } else {
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  useEffect(() => {
    if (routerId) {
      loadTab(tab);
      loadAllCounts();
    }
  }, [routerId, tab, loadTab, loadAllCounts]);

  const handleTabClick = (tObj) => {
    navigate(`/admin/hotspot/${tObj.path}`);
  };

  async function kickSession() {
    if (!confirmKick || kicking) return;
    setKicking(true);
    try {
      const { id, user } = confirmKick;
      const res = await apiFetch(`/hotspot-router/active/${id}?router_id=${routerId}`, { method: 'DELETE' });
      if (res?.success) {
        ctx?.addToast('Berhasil', `Sesi untuk "${user}" berhasil diputuskan.`, 'success');
        setConfirmKick(null);
        loadTab('active');
        loadAllCounts();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal memutuskan sesi.', 'error');
      }
    } finally {
      setKicking(false);
    }
  }

  async function deleteHost(id) {
    const res = await apiFetch(`/hotspot-router/hosts/${id}?router_id=${routerId}`, { method: 'DELETE' });
    if (res?.success) {
      ctx?.addToast('Berhasil', 'Host dihapus.', 'success');
      loadTab('hosts');
      loadAllCounts();
    } else {
      ctx?.addToast('Gagal', res?.message || 'Gagal menghapus host.', 'error');
    }
  }

  async function deleteUser(id) {
    const res = await apiFetch(`/hotspot-router/users/${id}?router_id=${routerId}`, { method: 'DELETE' });
    if (res?.success) {
      ctx?.addToast('Berhasil', 'User lokal dihapus.', 'success');
      loadTab('users');
      loadAllCounts();
    } else {
      ctx?.addToast('Gagal', res?.message || 'Gagal menghapus user.', 'error');
    }
  }

  async function handleAddBindingSubmit(e) {
    e.preventDefault();
    if (!newBinding.macAddress && !newBinding.address) {
      ctx?.addToast('Peringatan', 'Minimal MAC Address atau IP Address harus diisi.', 'warning');
      return;
    }
    setAddingBinding(true);
    try {
      const res = await apiFetch('/hotspot-router/bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          router_id: routerId,
          ...newBinding
        })
      });
      if (res?.success) {
        ctx?.addToast('Berhasil', 'IP Binding berhasil ditambahkan ke router.', 'success');
        setShowAddBindingModal(false);
        setNewBinding({ macAddress: '', address: '', toAddress: '', server: 'all', type: 'bypassed', comment: '' });
        loadTab('bindings');
        loadAllCounts();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal menambah IP Binding.', 'error');
      }
    } finally {
      setAddingBinding(false);
    }
  }

  async function handleDeleteBinding() {
    if (!confirmDeleteBinding || deletingBinding) return;
    setDeletingBinding(true);
    try {
      const { id } = confirmDeleteBinding;
      const res = await apiFetch(`/hotspot-router/bindings/${id}?router_id=${routerId}`, { method: 'DELETE' });
      if (res?.success) {
        ctx?.addToast('Berhasil', 'IP Binding berhasil dihapus.', 'success');
        setConfirmDeleteBinding(null);
        loadTab('bindings');
        loadAllCounts();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal menghapus IP Binding.', 'error');
      }
    } finally {
      setDeletingBinding(false);
    }
  }

  const safeData = Array.isArray(data) ? data : [];
  const filtered = safeData.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(row || {}).some(v => String(v || '').toLowerCase().includes(s));
  });

  function renderTable() {
    if (tab === 'active') {
      return (
        <table className="data-table">
          <thead><tr>
            <th>User</th><th>IP Address</th><th>MAC</th><th>Uptime</th>
            <th>Traffic Realtime (DL / UL)</th><th>Total Kuota (Kumulatif)</th><th>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{s.user || '—'}</td>
                <td className="mono">{s.address || '—'}</td>
                <td className="mono" style={{ fontSize: '0.72rem' }}>{s.mac || s['mac-address'] || '—'}</td>
                <td>{s.uptime || '—'}</td>
                <td>
                  <span style={{ color: '#10b981', fontWeight: 600, marginRight: 8 }}>
                    ↓ {formatSpeed(s.tx_rate || s['tx-rate'])}
                  </span>
                  <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                    ↑ {formatSpeed(s.rx_rate || s['rx-rate'])}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                    ↓ {formatBytes(s.bytes_out || s['bytes-out'])}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 8 }}>
                    (↑ {formatBytes(s.bytes_in || s['bytes-in'])})
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger btn-xs" onClick={() => setConfirmKick({ id: s.id || s['.id'], user: s.user })}>
                    Kick
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (tab === 'hosts') {
      return (
        <table className="data-table">
          <thead><tr>
            <th>MAC</th><th>IP Address</th><th>Server</th><th>Status</th><th>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.map((h, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontSize: '0.72rem' }}>{h.mac_address || h['mac-address'] || '—'}</td>
                <td className="mono">{h.address || '—'}</td>
                <td>{h.server || '—'}</td>
                <td>
                  <Badge variant={h.bypass === 'true' || h.bypass === true ? 'success' : 'neutral'}>
                    {h.bypass === 'true' || h.bypass === true ? 'Bypass' : 'Normal'}
                  </Badge>
                </td>
                <td>
                  <button className="btn btn-danger btn-xs" onClick={() => deleteHost(h.id || h['.id'])}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (tab === 'users') {
      return (
        <table className="data-table">
          <thead><tr>
            <th>Username</th><th>Password</th><th>Profile</th><th>Komentar</th><th>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{u.name || '—'}</td>
                <td className="mono" style={{ fontSize: '0.72rem' }}>
                  {u.password ? '••••••••' : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>SSO (Tanpa Pass)</span>}
                </td>
                <td>{u.profile || '—'}</td>
                <td style={{ color: 'var(--text-muted)', maxWidth: 180 }}>{u.comment || '—'}</td>
                <td>
                  <button className="btn btn-danger btn-xs" onClick={() => deleteUser(u.id || u['.id'])}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    // bindings
    return (
      <table className="data-table">
        <thead><tr>
          <th>MAC Address</th><th>Address (IP)</th><th>To Address</th><th>Server</th><th>Type</th><th>Komentar</th><th>Aksi</th>
        </tr></thead>
        <tbody>
          {filtered.map((b, i) => {
            const bType = b.type || 'bypassed';
            const badgeVariant = bType === 'bypassed' ? 'success' : (bType === 'passthrough' ? 'warning' : 'neutral');
            return (
              <tr key={i}>
                <td className="mono" style={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.mac_address || '—'}</td>
                <td className="mono">{b.address || '—'}</td>
                <td className="mono">{b.to_address || '—'}</td>
                <td>{b.server || 'all'}</td>
                <td>
                  <Badge variant={badgeVariant}>
                    {bType}
                  </Badge>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{b.comment || '—'}</td>
                <td>
                  <button className="btn btn-danger btn-xs" onClick={() => setConfirmDeleteBinding(b)}>
                    Hapus
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <>
      {/* Router selector */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="select" style={{ width: 'auto', minWidth: 200 }} value={routerId} onChange={e => setRouterId(e.target.value)}>
          {routers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.ip_address})</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => loadTab(tab)} disabled={loading}>
          {loading ? <div className="loader-ring" style={{ width: 13, height: 13, borderWidth: 2 }} /> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
          )}
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => handleTabClick(t)}
          >
            {t.icon} {t.label}
            <span className="tab-badge">{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {activeTabObj.icon}
            {activeTabObj.label}
            <Badge variant="primary">{filtered.length}</Badge>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {tab === 'bindings' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddBindingModal(true)}>
                + Tambah IP Binding
              </button>
            )}
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <Loader />
          ) : filtered.length === 0 ? (
            <EmptyState icon="📡" text={`Tidak ada data ${(activeTabObj.label || 'sesi').toLowerCase()}.`} />
          ) : (
            renderTable()
          )}
        </div>
      </div>

      {/* Modal Kick Session */}
      <Modal
        open={!!confirmKick}
        onClose={() => !kicking && setConfirmKick(null)}
        title="Putuskan Sesi Aktif (Kick)"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmKick(null)} disabled={kicking}>Batal</button>
            <button className="btn btn-danger" onClick={kickSession} disabled={kicking} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {kicking && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              {kicking ? 'Memproses...' : 'Putuskan Sesi'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Yakin ingin memutuskan sesi aktif untuk user <strong style={{ color: 'var(--text)' }}>"{confirmKick?.user}"</strong>?
        </p>
        <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 8 }}>
          ⚠ Perangkat akan didepak dan harus masuk (login) kembali melalui captive portal untuk mengakses internet.
        </p>
      </Modal>

      {/* Modal Add IP Binding */}
      <Modal
        open={showAddBindingModal}
        onClose={() => !addingBinding && setShowAddBindingModal(false)}
        title="Tambah Hotspot IP Binding Baru"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddBindingModal(false)} disabled={addingBinding}>Batal</button>
            <button className="btn btn-primary" onClick={handleAddBindingSubmit} disabled={addingBinding} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {addingBinding && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              {addingBinding ? 'Menyimpan...' : 'Simpan Binding'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddBindingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">MAC Address</label>
            <input
              type="text"
              className="input mono"
              placeholder="Contoh: 9C:CE:88:1E:3B:F4"
              value={newBinding.macAddress}
              onChange={e => setNewBinding({ ...newBinding, macAddress: e.target.value })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Boleh dikosongkan jika hanya mem-binding IP.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Address (IP)</label>
              <input
                type="text"
                className="input mono"
                placeholder="Contoh: 10.10.254.252"
                value={newBinding.address}
                onChange={e => setNewBinding({ ...newBinding, address: e.target.value })}
              />
            </div>
            <div>
              <label className="label">To Address</label>
              <input
                type="text"
                className="input mono"
                placeholder="Kosongkan atau samakan IP"
                value={newBinding.toAddress}
                onChange={e => setNewBinding({ ...newBinding, toAddress: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Server</label>
              <select
                className="select"
                value={newBinding.server}
                onChange={e => setNewBinding({ ...newBinding, server: e.target.value })}
              >
                <option value="all">all</option>
                <option value="dhcp-hotspot">dhcp-hotspot</option>
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="select"
                value={newBinding.type}
                onChange={e => setNewBinding({ ...newBinding, type: e.target.value })}
              >
                <option value="bypassed">bypassed (Meloloskan Internet & Captive)</option>
                <option value="regular">regular (Wajib Login Hotspot)</option>
                <option value="passthrough">passthrough (Bypass Login saja)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Komentar</label>
            <input
              type="text"
              className="input"
              placeholder="Catatan / Nama Perangkat (opsional)"
              value={newBinding.comment}
              onChange={e => setNewBinding({ ...newBinding, comment: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Modal Delete Binding */}
      <Modal
        open={!!confirmDeleteBinding}
        onClose={() => !deletingBinding && setConfirmDeleteBinding(null)}
        title="Hapus Hotspot IP Binding"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDeleteBinding(null)} disabled={deletingBinding}>Batal</button>
            <button className="btn btn-danger" onClick={handleDeleteBinding} disabled={deletingBinding} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {deletingBinding && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              {deletingBinding ? 'Menghapus...' : 'Hapus Binding'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Yakin ingin menghapus IP Binding untuk MAC <strong className="mono" style={{ color: 'var(--text)' }}>"{confirmDeleteBinding?.mac_address || confirmDeleteBinding?.address}"</strong>?
        </p>
      </Modal>
    </>
  );
}
