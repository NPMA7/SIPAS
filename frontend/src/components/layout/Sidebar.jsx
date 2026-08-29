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
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-icon" title="SIPAS v1.0.0 by: npma">
            <SipasLogo size={38} />
          </div>
          <div className="brand-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="brand-name">SIPAS</span>
              <span className="brand-tag">v1.0.0</span>
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              by: npma
            </span>
          </div>
        </div>
        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || admin?.role === 'superadmin'
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group}>
              <div className="nav-group-label">{group.group}</div>
              {visibleItems.map((item) =>
              item.external ? (
                <a 
                  key={item.to} 
                  href={item.to} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="nav-item" 
                  title={item.label}
                  onClick={onCloseMobile}
                >
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-tooltip">{item.label}</span>
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  onClick={onCloseMobile}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-tooltip">{item.label}</span>
                  {item.badgeKey && badges[item.badgeKey] ? (
                    <span className="nav-badge">{badges[item.badgeKey]}</span>
                  ) : null}
                </NavLink>
              )
            )}
            <div className="divider" />
          </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" title={`${admin?.username || 'Admin'} (${admin?.role === 'superadmin' ? 'Superadmin' : admin?.role === 'visitor' ? 'Visitor' : 'Operator SIPAS'})`}>
          <div className="user-avatar">{initial}</div>
          <div className="user-info">
            <div className="user-name">{admin?.username || 'Admin'}</div>
            <div className="user-role">
              {admin?.role === 'superadmin' ? 'Super Administrator' : admin?.role === 'visitor' ? 'Visitor (Read-Only)' : 'Operator SIPAS'}
            </div>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title="Keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
