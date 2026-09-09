import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import SipasLogo from '../ui/SipasLogo';

const NAV = [
  {
    group: 'Monitoring',
    items: [
      {
        to: '/manage/admin',
        end: true,
        label: 'Dashboard',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Manajemen',
    items: [
      {
        to: '/manage/admin/user-hotspot',
        label: 'Pengguna Hotspot',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        ),
      },
      {
        to: '/manage/admin/blocked-sites',
        label: 'Situs Diblokir',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        ),
      },
      {
        to: '/manage/admin/hotspot',
        label: 'Hotspot Router',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="1"/>
          </svg>
        ),
      },
      {
        to: '/manage/admin/queues',
        label: 'Simple Queues',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        ),
      },
      {
        to: '/manage/admin/dhcp-leases',
        label: 'DHCP Leases',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        ),
      },
      {
        to: '/manage/admin/routers',
        label: 'Manajemen Router',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M6 12h.01M10 12h.01M14 12h.01"/><path d="M8 6V4m8 2V4"/>
          </svg>
        ),
      },
      {
        to: '/manage/admin/manage-users',
        label: 'Pengelola Web',
        superAdminOnly: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <circle cx="12" cy="9" r="3"/>
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Sistem',
    items: [
      {
        to: '/manage/admin/portal-settings',
        label: 'Kustomisasi Portal',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        ),
      },
      {
        to: '/manage/admin/api',
        label: 'Dokumentasi API',
        superAdminOnly: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        ),
      },
      {
        to: '/',
        label: 'Captive Portal',
        external: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, onToggle, onCloseMobile, badges = {} }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem('hotspot_admin') || 'null');
      setAdmin(a);
    } catch (_) {}
  }, []);

  function logout() {
    localStorage.removeItem('hotspot_token');
    localStorage.removeItem('hotspot_admin');
    navigate('/manage/admin/login');
  }

  const initial = admin?.username?.[0]?.toUpperCase() || 'A';

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 overflow-hidden ${
        collapsed ? 'w-16' : 'w-60'
      } ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="h-15 flex items-center justify-between px-3.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 flex items-center justify-center shrink-0" title="SIPAS v1.0.0 by: npma">
            <SipasLogo size={36} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-100 tracking-wide">SIPAS</span>
                <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded-full border border-blue-500/30">
                  v1.0.0
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                by: npma
              </span>
            </div>
          )}
        </div>

        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden space-y-4">
        {NAV.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || admin?.role === 'superadmin'
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              {!collapsed && (
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.group}
                </div>
              )}
              {visibleItems.map((item) =>
                item.external ? (
                  <a
                    key={item.to}
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onCloseMobile}
                    className={`group relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-colors ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="shrink-0 text-slate-400 group-hover:text-blue-400 transition-colors">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-200 text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {item.label}
                      </span>
                    )}
                  </a>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20'
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/80'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className="truncate flex-1">{item.label}</span>
                        )}
                        {!collapsed && item.badgeKey && badges[item.badgeKey] ? (
                          <span className="ml-auto px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                            {badges[item.badgeKey]}
                          </span>
                        ) : null}
                        {collapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-200 text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer User & Logout */}
      <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-900/50 space-y-2">
        <div
          className={`flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={`${admin?.username || 'Admin'} (${admin?.role === 'superadmin' ? 'Superadmin' : admin?.role === 'visitor' ? 'Visitor' : 'Operator SIPAS'})`}
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-200 truncate">{admin?.username || 'Admin'}</div>
              <div className="text-[10px] text-slate-400 truncate">
                {admin?.role === 'superadmin' ? 'Super Administrator' : admin?.role === 'visitor' ? 'Visitor (Read-Only)' : 'Operator SIPAS'}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={`cursor-pointer w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Keluar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
