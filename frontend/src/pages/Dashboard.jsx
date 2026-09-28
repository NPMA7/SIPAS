import { useState, useEffect, useCallback, useContext } from 'react';
import { apiFetch } from '../api/client';
import { ToastContext } from '../hooks/ToastContext';
import { StatCard, Loader, EmptyState, Badge } from '../components/ui/index';

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

function ResourceBar({ label, value, max, unit = '%', colorClass = 'bg-blue-500' }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = pct > 85 ? 'bg-rose-500' : pct > 65 ? 'bg-amber-500' : colorClass;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="font-bold text-slate-200">
          {value}
          <span className="text-[10px] text-slate-500 font-normal ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AutoRefreshBadge({ onRefresh }) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          onRefresh();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-400">
      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      <span>Auto Refresh: <strong className="text-blue-400 font-bold">{countdown}s</strong></span>
    </div>
  );
}

export default function Dashboard() {
  const ctx = useContext(ToastContext);
  const [routers, setRouters] = useState([]);
  const [routerId, setRouterId] = useState('');
  const [summary, setSummary] = useState(null);
  const [allStats, setAllStats] = useState({});
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { ctx?.setPageTitle?.('Dashboard'); }, [ctx]);

  const loadRoutersAndSummary = useCallback(async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        apiFetch('/routers'),
        apiFetch('/dashboard/summary'),
      ]);
      if (rRes?.success && rRes.data.length > 0) {
        setRouters(rRes.data);
        setRouterId(prev => prev || rRes.data[0].id);

        const statsMap = {};
        await Promise.all(
          rRes.data.map(async (r) => {
            try {
              const res = await apiFetch(`/dashboard/${r.id}/stats`);
              if (res?.success && res.data) {
                statsMap[r.id] = res.data;
              }
            } catch (_) {}
          })
        );
        setAllStats(statsMap);
      }
      if (sRes?.success) setSummary(sRes.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadRoutersAndSummary();
  }, [loadRoutersAndSummary]);

  const loadRouterData = useCallback(async (isSilent = false) => {
    if (!routerId) return;
    if (isSilent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const sessRes = await apiFetch(`/dashboard/${routerId}/sessions`);
      if (sessRes?.success) {
        const raw = sessRes.data || [];
        setSessions(raw.filter(s => s && s.user && String(s.user).trim() !== '' && String(s.user).trim() !== '—' && String(s.user).trim() !== 'undefined' && String(s.user).trim() !== 'null'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routerId]);

  useEffect(() => {
    if (routerId) {
      loadRouterData(false);
    }
  }, [routerId, loadRouterData]);

  const handleAutoRefresh = useCallback(() => {
    loadRoutersAndSummary();
    loadRouterData(true);
  }, [loadRoutersAndSummary, loadRouterData]);

  useEffect(() => {
    ctx?.setHeaderAction?.(<AutoRefreshBadge onRefresh={handleAutoRefresh} />);
  }, [ctx, handleAutoRefresh]);

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Total Pengguna"
          value={summary?.total_users ?? '—'}
          variant="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
        <StatCard
          label="Router Aktif"
          value={routers.length}
          variant="success"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01"/></svg>}
        />
        <StatCard
          label="Sesi Aktif (DB)"
          value={summary?.active_sessions_db ?? '—'}
          variant="info"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><circle cx="12" cy="20" r="1"/></svg>}
        />
        <StatCard
          label="User Diblokir"
          value={summary?.blocked_users ?? '—'}
          variant="warning"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
        />
      </div>

      {/* Resource Cards for ALL Routers */}
      <div className={`grid gap-4 ${routers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {routers.map(r => {
          const rStats = allStats[r.id];
          const isSingle = routers.length === 1;
          return (
            <div key={r.id} className="card">
              <div className="card-header">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <span className="truncate">{r.name} — Sumber Daya</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={r.router_type === 'external' ? 'warning' : 'info'}>
                    {r.router_type === 'external' ? 'Eksternal' : 'Internal'}
                  </Badge>
                  <Badge variant={rStats ? "success" : "danger"}>
                    {rStats ? "Online" : "Offline / Auth Error"}
                  </Badge>
                </div>
              </div>
              <div className="card-body">
                {rStats ? (
                  <>
                    <div className={isSingle ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "space-y-1"}>
                      <ResourceBar label="CPU Load" value={parseFloat(rStats.cpu_load) || 0} max={100} unit="%" colorClass="bg-blue-500" />
                      <ResourceBar label={`RAM (Free: ${rStats.free_memory_mb} MB)`} value={parseFloat(rStats.memory_percent) || 0} max={100} unit="%" colorClass="bg-cyan-500" />
                      <ResourceBar label={`HDD (Free: ${rStats.free_hdd_mb} MB)`} value={parseFloat(rStats.hdd_percent) || 0} max={100} unit="%" colorClass="bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                      <span>IP: <strong className="text-slate-200">{r.ip_address}</strong></span>
                      <span>Uptime: <strong className="text-slate-200">{rStats.uptime || '—'}</strong></span>
                      <span>Ver: <strong className="text-slate-200">{rStats.version || '—'}</strong></span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-rose-400 py-3 flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shrink-0">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Gagal koneksi API Mikrotik (periksa IP / kredensial router).</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Hotspot Sessions Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <span>Sesi Aktif Sekarang</span>
            <Badge variant="primary">{sessions.length}</Badge>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              className="select"
              value={routerId}
              onChange={e => {
                setRouterId(e.target.value);
                setSessions([]);
              }}
            >
              {routers.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.ip_address})</option>
              ))}
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                loadRoutersAndSummary();
                if (routerId) loadRouterData(true);
              }}
              disabled={refreshing || loading}
            >
              {refreshing ? (
                <div className="loader-ring" style={{ width: 14, height: 14, borderWidth: 2 }} />
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
          {loading && sessions.length === 0 ? (
            <Loader />
          ) : sessions.length === 0 ? (
            <EmptyState text="Tidak ada sesi aktif saat ini." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Uptime</th>
                  <th>Traffic Realtime (DL / UL)</th>
                  <th>Total Kuota Kumulatif</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
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
                      <span className="text-emerald-400 font-semibold mr-2.5">
                        ↓ {formatSpeed(s.tx_rate || s['tx-rate'])}
                      </span>
                      <span className="text-sky-400 font-semibold">
                        ↑ {formatSpeed(s.rx_rate || s['rx-rate'])}
                      </span>
                    </td>
                    <td>
                      <span className="text-slate-200 font-medium">
                        ↓ {formatBytes(s.bytes_out || s['bytes-out'])}
                      </span>
                      <span className="text-slate-500 text-xs ml-2">
                        (↑ {formatBytes(s.bytes_in || s['bytes-in'])})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
