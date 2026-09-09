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

  const currentAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('hotspot_admin') || '{}'); } catch { return {}; }
  })();
  const isVisitor = currentAdmin?.role === 'visitor';

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

  const [showEditBindingModal, setShowEditBindingModal] = useState(false);
  const [editingBinding, setEditingBinding] = useState(false);
  const [editBindingData, setEditBindingData] = useState({
    id: '',
    macAddress: '',
    address: '',
    toAddress: '',
    server: 'all',
    type: 'bypassed',
    comment: ''
  });

  const [confirmDeleteBinding, setConfirmDeleteBinding] = useState(null);
  const [deletingBinding, setDeletingBinding] = useState(false);

  const currentPathSegment = location.pathname.replace(/^\/(manage\/)?admin\/hotspot/, '').replace(/^\//, '');
  const activeTabObj = TABS.find(t => t.path === currentPathSegment) || TABS[0];
  const tab = activeTabObj.key;

  useEffect(() => {
    if (!currentPathSegment || !TABS.some(t => t.path === currentPathSegment)) {
      navigate('/manage/admin/hotspot/active-sessions', { replace: true });
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
      const isRealHost = h => h && ((h.mac_address && h.mac_address.trim() !== '' && h.mac_address !== '—') || (h.address && h.address.trim() !== '' && h.address !== '—'));
      const isRealRouterUser = u => u && u.name && u.name.trim() !== '' && u.name !== 'default-trial' && u.name !== '—';
      const isRealBinding = b => b && ((b.mac_address && b.mac_address.trim() !== '' && b.mac_address !== '—') || (b.address && b.address.trim() !== '' && b.address !== '—'));

      const validActive = (resActive?.data || []).filter(isRealUser);
      const validHosts = (resHosts?.data || []).filter(isRealHost);
      const validUsers = (resUsers?.data || []).filter(isRealRouterUser);
      const validBindings = (resBindings?.data || []).filter(isRealBinding);

      setCounts({
        active: validActive.length,
        hosts: resHosts?.success ? validHosts.length : 0,
        users: resUsers?.success ? validUsers.length : 0,
        bindings: resBindings?.success ? validBindings.length : 0,
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
        const isRealUser = a => a && a.user && String(a.user).trim() !== '' && String(a.user).trim() !== '—' && String(a.user).trim() !== 'undefined' && String(a.user).trim() !== 'null';
        const isRealHost = h => h && ((h.mac_address && h.mac_address.trim() !== '' && h.mac_address !== '—') || (h.address && h.address.trim() !== '' && h.address !== '—'));
        const isRealRouterUser = u => u && u.name && u.name.trim() !== '' && u.name !== 'default-trial' && u.name !== '—';
        const isRealBinding = b => b && ((b.mac_address && b.mac_address.trim() !== '' && b.mac_address !== '—') || (b.address && b.address.trim() !== '' && b.address !== '—'));

        if (t === 'active') {
          setData(rawList.filter(isRealUser));
        } else if (t === 'hosts') {
          setData(rawList.filter(isRealHost));
        } else if (t === 'bindings') {
          setData(rawList.filter(isRealBinding));
        } else if (t === 'users') {
          setData(rawList.filter(isRealRouterUser));
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
    navigate(`/manage/admin/hotspot/${tObj.path}`);
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

  const openEditBinding = (b) => {
    setEditBindingData({
      id: b.id || b['.id'],
      macAddress: b.mac_address || b['mac-address'] || '',
      address: b.address || '',
      toAddress: b.to_address || '',
      server: b.server || 'all',
      type: b.type || 'bypassed',
      comment: b.comment || ''
    });
    setShowEditBindingModal(true);
  };

  async function handleEditBindingSubmit(e) {
    e.preventDefault();
    if (!editBindingData.macAddress && !editBindingData.address) {
      ctx?.addToast('Peringatan', 'Minimal MAC Address atau IP Address harus diisi.', 'warning');
      return;
    }
    setEditingBinding(true);
    try {
      const res = await apiFetch(`/hotspot-router/bindings/${editBindingData.id}?router_id=${routerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          router_id: routerId,
          macAddress: editBindingData.macAddress,
          address: editBindingData.address,
          toAddress: editBindingData.toAddress,
          server: editBindingData.server,
          type: editBindingData.type,
          comment: editBindingData.comment
        })
      });
      if (res?.success) {
        ctx?.addToast('Berhasil', 'IP Binding berhasil diperbarui di router.', 'success');
        setShowEditBindingModal(false);
        loadTab('bindings');
        loadAllCounts();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal memperbarui IP Binding.', 'error');
      }
    } finally {
      setEditingBinding(false);
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
            <th>Traffic Realtime (DL / UL)</th><th>Total Kuota (Kumulatif)</th>
            {!isVisitor && <th>Aksi</th>}
          </tr></thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i}>
                <td>
                  <div className="font-semibold text-slate-100">
                    {s.full_name || s.user || '—'}
                  </div>
                  {s.full_name && s.full_name !== s.user && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {s.user}
                    </div>
                  )}
                </td>
                <td className="mono font-semibold text-slate-300">{s.address || '—'}</td>
                <td className="mono text-xs text-slate-400">{s.mac || s['mac-address'] || '—'}</td>
                <td className="text-slate-300">{s.uptime || '—'}</td>
                <td>
                  <span className="text-emerald-400 font-semibold mr-2">
                    ↓ {formatSpeed(s.tx_rate || s['tx-rate'])}
                  </span>
                  <span className="text-sky-400 font-semibold">
                    ↑ {formatSpeed(s.rx_rate || s['rx-rate'])}
                  </span>
                </td>
                <td>
                  <span className="text-slate-200">
                    ↓ {formatBytes(s.bytes_out || s['bytes-out'])}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">
                    (↑ {formatBytes(s.bytes_in || s['bytes-in'])})
                  </span>
                </td>
                {!isVisitor && (
                  <td>
                    <button className="btn btn-danger btn-xs" onClick={() => setConfirmKick({ id: s.id || s['.id'], user: s.user })}>
                      Kick
                    </button>
                  </td>
                )}
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
            <th>MAC</th><th>IP Address</th><th>Server</th><th>Status</th>
            {!isVisitor && <th>Aksi</th>}
          </tr></thead>
          <tbody>
            {filtered.map((h, i) => (
              <tr key={i}>
                <td className="mono text-xs text-slate-300">{h.mac_address || h['mac-address'] || '—'}</td>
                <td className="mono font-semibold text-slate-200">{h.address || '—'}</td>
                <td className="text-slate-400">{h.server || '—'}</td>
                <td>
                  <Badge variant={h.bypass === 'true' || h.bypass === true ? 'success' : 'neutral'}>
                    {h.bypass === 'true' || h.bypass === true ? 'Bypass' : 'Normal'}
                  </Badge>
                </td>
                {!isVisitor && (
                  <td>
                    <button className="btn btn-danger btn-xs" onClick={() => deleteHost(h.id || h['.id'])}>
                      Hapus
                    </button>
                  </td>
                )}
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
            <th>Username</th><th>Password</th><th>Profile</th><th>Komentar</th>
            {!isVisitor && <th>Aksi</th>}
          </tr></thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={i}>
                <td className="font-semibold text-slate-100">{u.name || '—'}</td>
                <td className="mono text-xs text-slate-400">
                  {u.password ? '••••••••' : <span className="italic text-slate-500">SSO (Tanpa Pass)</span>}
                </td>
                <td className="text-slate-300">{u.profile || '—'}</td>
                <td className="text-slate-400 max-w-44 truncate">{u.comment || '—'}</td>
                {!isVisitor && (
                  <td>
                    <button className="btn btn-danger btn-xs" onClick={() => deleteUser(u.id || u['.id'])}>
                      Hapus
                    </button>
                  </td>
                )}
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
          <th>MAC Address</th><th>Address (IP)</th><th>To Address</th><th>Server</th><th>Type</th><th>Komentar</th>
          {!isVisitor && <th>Aksi</th>}
        </tr></thead>
        <tbody>
          {filtered.map((b, i) => {
            const bType = b.type || 'bypassed';
            const badgeVariant = bType === 'bypassed' ? 'success' : (bType === 'passthrough' ? 'warning' : 'neutral');
            return (
              <tr key={i}>
                <td className="mono font-semibold text-slate-200">{b.mac_address || '—'}</td>
                <td className="mono text-slate-300">{b.address || '—'}</td>
                <td className="mono text-slate-400">{b.to_address || '—'}</td>
                <td className="text-slate-400">{b.server || 'all'}</td>
                <td>
                  <Badge variant={badgeVariant}>
                    {bType}
                  </Badge>
                </td>
                <td className="text-xs text-slate-400">{b.comment || '—'}</td>
                {!isVisitor && (
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-secondary btn-xs" onClick={() => openEditBinding(b)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={() => setConfirmDeleteBinding(b)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                )}
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
      <div className="mb-3.5 flex items-center gap-2.5 flex-wrap">
        <select className="select min-w-52" value={routerId} onChange={e => setRouterId(e.target.value)}>
          {routers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.ip_address})</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => loadTab(tab)} disabled={loading}>
          {loading ? <div className="loader-ring" style={{ width: 13, height: 13, borderWidth: 2 }} /> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
          )}
          <span>Refresh</span>
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
            {t.icon} <span>{t.label}</span>
            <span className="tab-badge">{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {activeTabObj.icon}
            <span>{activeTabObj.label}</span>
            <Badge variant="primary">{filtered.length}</Badge>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {tab === 'bindings' && !isVisitor && (
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
            <button className="btn btn-danger" onClick={kickSession} disabled={kicking}>
              {kicking && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{kicking ? 'Memproses...' : 'Putuskan Sesi'}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Yakin ingin memutuskan sesi aktif untuk user <strong className="text-slate-100">"{confirmKick?.user}"</strong>?
        </p>
        <p className="text-xs text-rose-400 mt-2">
          ⚠️ Perangkat akan didepak dan harus masuk (login) kembali melalui captive portal untuk mengakses internet.
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
            <button className="btn btn-primary" onClick={handleAddBindingSubmit} disabled={addingBinding}>
              {addingBinding && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{addingBinding ? 'Menyimpan...' : 'Simpan Binding'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleAddBindingSubmit} className="space-y-3">
          <div className="form-group">
            <label className="form-label">MAC Address</label>
            <input
              type="text"
              className="input mono"
              placeholder="Contoh: 9C:CE:88:1E:3B:F4"
              value={newBinding.macAddress}
              onChange={e => setNewBinding({ ...newBinding, macAddress: e.target.value })}
            />
            <div className="form-hint">Boleh dikosongkan jika hanya mem-binding IP.</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Address (IP)</label>
              <input
                type="text"
                className="input mono"
                placeholder="Contoh: 10.10.254.252"
                value={newBinding.address}
                onChange={e => setNewBinding({ ...newBinding, address: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">To Address</label>
              <input
                type="text"
                className="input mono"
                placeholder="Kosongkan atau samakan IP"
                value={newBinding.toAddress}
                onChange={e => setNewBinding({ ...newBinding, toAddress: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Server</label>
              <select
                className="select w-full"
                value={newBinding.server}
                onChange={e => setNewBinding({ ...newBinding, server: e.target.value })}
              >
                <option value="all">all</option>
                <option value="dhcp-hotspot">dhcp-hotspot</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="select w-full"
                value={newBinding.type}
                onChange={e => setNewBinding({ ...newBinding, type: e.target.value })}
              >
                <option value="bypassed">bypassed (Meloloskan Internet & Captive)</option>
                <option value="regular">regular (Wajib Login Hotspot)</option>
                <option value="passthrough">passthrough (Bypass Login saja)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Komentar</label>
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

      {/* Modal Edit IP Binding */}
      <Modal
        open={showEditBindingModal}
        onClose={() => !editingBinding && setShowEditBindingModal(false)}
        title="Edit Hotspot IP Binding"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditBindingModal(false)} disabled={editingBinding}>Batal</button>
            <button className="btn btn-primary" onClick={handleEditBindingSubmit} disabled={editingBinding}>
              {editingBinding && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{editingBinding ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleEditBindingSubmit} className="space-y-3">
          <div className="form-group">
            <label className="form-label">MAC Address</label>
            <input
              type="text"
              className="input mono"
              placeholder="Contoh: 9C:CE:88:1E:3B:F4"
              value={editBindingData.macAddress}
              onChange={e => setEditBindingData({ ...editBindingData, macAddress: e.target.value })}
            />
            <div className="form-hint">Boleh dikosongkan jika hanya mem-binding IP.</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Address (IP)</label>
              <input
                type="text"
                className="input mono"
                placeholder="Contoh: 10.10.254.252"
                value={editBindingData.address}
                onChange={e => setEditBindingData({ ...editBindingData, address: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">To Address</label>
              <input
                type="text"
                className="input mono"
                placeholder="Kosongkan atau samakan IP"
                value={editBindingData.toAddress}
                onChange={e => setEditBindingData({ ...editBindingData, toAddress: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Server</label>
              <select
                className="select w-full"
                value={editBindingData.server}
                onChange={e => setEditBindingData({ ...editBindingData, server: e.target.value })}
              >
                <option value="all">all</option>
                <option value="dhcp-hotspot">dhcp-hotspot</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="select w-full"
                value={editBindingData.type}
                onChange={e => setEditBindingData({ ...editBindingData, type: e.target.value })}
              >
                <option value="bypassed">bypassed (Meloloskan Internet & Captive)</option>
                <option value="regular">regular (Wajib Login Hotspot)</option>
                <option value="passthrough">passthrough (Bypass Login saja)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Komentar</label>
            <input
              type="text"
              className="input"
              placeholder="Catatan / Nama Perangkat (opsional)"
              value={editBindingData.comment}
              onChange={e => setEditBindingData({ ...editBindingData, comment: e.target.value })}
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
            <button className="btn btn-danger" onClick={handleDeleteBinding} disabled={deletingBinding}>
              {deletingBinding && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{deletingBinding ? 'Menghapus...' : 'Hapus Binding'}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Yakin ingin menghapus IP Binding untuk MAC <strong className="mono text-slate-100">"{confirmDeleteBinding?.mac_address || confirmDeleteBinding?.address}"</strong>?
        </p>
      </Modal>
    </>
  );
}
