import { useState, useEffect, useCallback, useContext } from 'react';
import { apiFetch } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import { Loader, EmptyState, Badge } from '../components/ui/index';
import Modal from '../components/ui/Modal';

function formatRate(val) {
  if (!val || val === '0' || val === '0/0') return '0 bps';
  if (typeof val === 'string' && (val.includes('k') || val.includes('M') || val.includes('G') || val.includes('bps'))) {
    return val;
  }
  const n = typeof val === 'number' ? val : (parseInt(val) || 0);
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + ' Gbps';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + ' Mbps';
  if (n >= 1000) return (n / 1000).toFixed(1) + ' kbps';
  return n + ' bps';
}

function formatPairRate(pairStr) {
  if (!pairStr || pairStr === '0/0') return { ul: '0 bps', dl: '0 bps' };
  const parts = pairStr.split('/');
  return {
    ul: formatRate(parts[0]),
    dl: formatRate(parts[1] || parts[0]),
  };
}

export default function Queues() {
  const ctx = useContext(ToastContext);
  const [routers, setRouters] = useState([]);
  const [routerId, setRouterId] = useState('');
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('hotspot_admin') || '{}'); } catch { return {}; }
  })();
  const isVisitor = currentAdmin?.role === 'visitor';

  useEffect(() => { ctx?.setPageTitle?.('Limit Kecepatan'); }, [ctx]);

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

  const loadQueues = useCallback(async (rId, isSilent = false) => {
    if (!rId) return;
    if (!isSilent) setLoading(true);
    try {
      const d = await apiFetch(`/queues/${rId}`);
      if (d?.success) {
        const raw = d.data || [];
        const valid = raw.filter(q => (q.name && q.name.trim() !== '') || (q.target && q.target.trim() !== ''));
        setQueues(valid);
      } else {
        ctx?.addToast?.('warning', d?.message || 'Gagal memuat limit kecepatan');
      }
    } catch (err) {
      ctx?.addToast?.('danger', err.message);
    } finally {
      setLoading(false);
    }
  }, [ctx]);

  useEffect(() => {
    if (routerId) {
      loadQueues(routerId, false);
    }
  }, [routerId, loadQueues]);

  // Connect to Global Auto-Refresh in Header
  useEffect(() => {
    if (routerId) {
      ctx?.registerAutoRefresh?.(() => loadQueues(routerId, true));
    }
    return () => ctx?.registerAutoRefresh?.(null);
  }, [ctx, routerId, loadQueues]);

  async function handleQueueAction(queueId, action) {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/queues/${routerId}/action`, {
        method: 'POST',
        body: JSON.stringify({ queue_id: queueId, action }),
      });
      if (res?.success) {
        ctx?.addToast?.('success', res.message || 'Aksi berhasil');
        loadQueues(routerId, true);
      } else {
        ctx?.addToast?.('danger', res?.message || 'Gagal mengeksekusi aksi');
      }
    } catch (err) {
      ctx?.addToast?.('danger', err.message);
    } finally {
      setActionLoading(false);
      setConfirmDelete(null);
    }
  }

  const filtered = queues.filter(q => {
    const term = search.toLowerCase();
    return (
      (q.name || '').toLowerCase().includes(term) ||
      (q.target || '').toLowerCase().includes(term) ||
      (q.comment || '').toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span>Limit Kecepatan</span>
            <Badge variant="primary">{filtered.length}</Badge>
          </div>
          <div className="card-actions">
            <select
              className="select min-w-44"
              value={routerId}
              onChange={e => {
                setRouterId(e.target.value);
                setQueues([]);
              }}
            >
              {routers.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.ip_address})</option>
              ))}
            </select>
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Cari queue / IP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => loadQueues(routerId, true)} disabled={loading}>
              {loading ? (
                <div className="loader-ring" style={{ width: 13, height: 13, borderWidth: 2 }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                </svg>
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {loading && queues.length === 0 ? (
            <Loader />
          ) : filtered.length === 0 ? (
            <EmptyState text="Tidak ada Simple Queue ditemukan." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Queue</th>
                  <th>Target IP / Subnet</th>
                  <th>Max Limit (UL / DL)</th>
                  <th>Status</th>
                  {!isVisitor && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, i) => {
                  const limits = formatPairRate(q.max_limit);
                  let displayName = q.name || '';
                  if (isVisitor && displayName.startsWith('hotspot-') && displayName.length > 12) {
                    const nipPart = displayName.replace('hotspot-', '');
                    displayName = `hotspot-${nipPart.substring(0, 4)}****${nipPart.substring(nipPart.length - 3)}`;
                  }
                  return (
                    <tr key={i} className={q.disabled ? 'opacity-60' : ''}>
                      <td className="font-semibold text-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${q.disabled ? 'bg-slate-500' : 'bg-emerald-500'}`} />
                          <span>{displayName}</span>
                        </div>
                      </td>
                      <td className="mono font-semibold text-slate-300">{q.target || '—'}</td>
                      <td>
                        <span className="text-sky-400 font-semibold mr-2">↑ {limits.ul}</span>
                        <span className="text-emerald-400 font-semibold">↓ {limits.dl}</span>
                      </td>
                      <td>
                        <Badge variant={q.disabled ? 'neutral' : 'success'}>
                          {q.disabled ? 'Disabled' : 'Active'}
                        </Badge>
                      </td>
                      {!isVisitor && (
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              className={`btn btn-xs ${q.disabled ? 'btn-success' : 'btn-warning'}`}
                              onClick={() => handleQueueAction(q.id, q.disabled ? 'enable' : 'disable')}
                              disabled={actionLoading}
                            >
                              {q.disabled ? 'Enable' : 'Disable'}
                            </button>
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={() => setConfirmDelete(q)}
                              disabled={actionLoading}
                            >
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
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => !actionLoading && setConfirmDelete(null)}
        title="Konfirmasi Hapus Queue"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)} disabled={actionLoading}>Batal</button>
            <button
              className="btn btn-danger"
              onClick={() => handleQueueAction(confirmDelete?.id, 'remove')}
              disabled={actionLoading}
            >
              {actionLoading && <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              <span>{actionLoading ? 'Menghapus...' : 'Ya, Hapus'}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Apakah Anda yakin ingin menghapus Simple Queue <strong className="text-slate-100">{confirmDelete?.name}</strong> ({confirmDelete?.target}) dari router?
        </p>
      </Modal>
    </>
  );
}
