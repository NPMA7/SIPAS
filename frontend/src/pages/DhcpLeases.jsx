import { useState, useEffect, useContext } from 'react';
import { apiFetch } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import { Badge, Loader, EmptyState } from '../components/ui/index';
import Modal from '../components/ui/Modal';

export default function DhcpLeases() {
  const ctx = useContext(ToastContext);
  const [routers, setRouters] = useState([]);
  const [routerId, setRouterId] = useState('');
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currentAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('hotspot_admin') || '{}'); } catch { return {}; }
  })();
  const isVisitor = currentAdmin?.role === 'visitor';

  useEffect(() => { ctx?.setPageTitle?.('DHCP Leases'); }, [ctx]);

  useEffect(() => {
    apiFetch('/routers').then(d => {
      if (d?.success && d.data.length > 0) {
        setRouters(d.data);
        setRouterId(d.data[0].id);
      }
    });
  }, []);

  useEffect(() => { if (routerId) load(); }, [routerId]);

  async function load() {
    if (!routerId) return;
    setLoading(true);
    const d = await apiFetch(`/dhcp/leases?router_id=${routerId}`);
    if (d?.success) {
      const rawLeases = d.data || [];
      setLeases(rawLeases.filter(l => l.address && l.mac_address));
    }
    setLoading(false);
  }

  async function deleteLease() {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    try {
      const { id, address } = confirmDel;
      const res = await apiFetch(`/dhcp/leases/${id}?router_id=${routerId}`, { method: 'DELETE' });
      if (res?.success) {
        ctx?.addToast('Berhasil', `Lease ${address} berhasil dihapus & koneksi diputuskan.`, 'success');
        setConfirmDel(null);
        load();
      } else {
        ctx?.addToast('Gagal', res?.message || 'Gagal menghapus lease.', 'error');
      }
    } finally {
      setDeleting(false);
    }
  }

  const filtered = leases.filter(l => {
    const matchSearch = !search || [l.address, l.mac_address, l.host_name, l.client_id].some(v => (v || '').toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statuses = [...new Set(leases.map(l => l.status).filter(Boolean))];

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>DHCP Leases</span>
            <Badge variant="primary">{filtered.length}</Badge>
          </div>
          <div className="card-actions">
            <select className="select min-w-40" value={routerId} onChange={e => setRouterId(e.target.value)}>
              {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="select min-w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Cari IP/MAC/host..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              {loading ? (
                <div className="loader-ring" style={{ width: 13, height: 13, borderWidth: 2 }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <Loader />
          ) : filtered.length === 0 ? (
            <EmptyState text="Tidak ada DHCP lease ditemukan." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Hostname</th>
                  <th>Server</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Type</th>
                  {!isVisitor && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i}>
                    <td className="mono font-semibold text-slate-200">{l.address || '—'}</td>
                    <td className="mono text-xs text-slate-400">{l.mac_address || '—'}</td>
                    <td className="text-slate-200">{l.host_name || '—'}</td>
                    <td className="text-slate-400">{l.server || '—'}</td>
                    <td>
                      <Badge variant={l.status === 'bound' ? 'success' : l.status === 'waiting' ? 'warning' : 'neutral'}>
                        {l.status || '—'}
                      </Badge>
                    </td>
                    <td className="text-xs text-slate-400">{l.expires_after || '—'}</td>
                    <td>
                      <Badge variant={l.dynamic === 'true' || l.dynamic === true ? 'info' : 'neutral'}>
                        {l.dynamic === 'true' || l.dynamic === true ? 'dynamic' : 'static'}
                      </Badge>
                    </td>
                    {!isVisitor && (
                      <td>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => setConfirmDel({ id: l.id, address: l.address })}
                        >
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Lease Confirm Modal */}
      <Modal
        open={!!confirmDel}
        onClose={() => !deleting && setConfirmDel(null)}
        title="Hapus DHCP Lease"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDel(null)} disabled={deleting}>Batal</button>
            <button className="btn btn-danger" onClick={deleteLease} disabled={deleting}>
              {deleting && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{deleting ? 'Memproses...' : 'Hapus & Putuskan'}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Yakin ingin menghapus DHCP lease untuk IP <strong className="text-slate-100">{confirmDel?.address}</strong>?
        </p>
        <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shrink-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Perangkat akan terputus dari jaringan dan harus meminta IP baru (reconnect).</span>
        </p>
      </Modal>
    </>
  );
}
