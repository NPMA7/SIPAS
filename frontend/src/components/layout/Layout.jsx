import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Toast from '../ui/Toast';
import { useToast } from '../../hooks/useToast';
import { ToastContext } from '../../hooks/ToastContext';
import { apiFetch } from '../../api/client';

const TITLE_MAP = {
  '/admin': 'Dashboard',
  '/admin/': 'Dashboard',
  '/admin/users': 'Pengguna Hotspot',
  '/admin/blocked-sites': 'Situs Diblokir',
  '/admin/routers': 'Manajemen Router',
  '/admin/hotspot': 'Hotspot Router',
  '/admin/queues': 'Simple Queues',
  '/admin/dhcp': 'DHCP Leases',
  '/admin/admins': 'Pengelola Web',
  '/admin/manage-users': 'Pengelola Web',
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, addToast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [headerAction, setHeaderAction] = useState(null);
  const [badges, setBadges] = useState({});

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('hotspot_token');
    if (!token) navigate('/admin/login');
  }, [navigate]);

  // Load badge counts
  useEffect(() => {
    apiFetch('/dashboard/summary').then(data => {
      if (data?.success) {
        setBadges({ users: data.data.total_users });
      }
    }).catch(() => {});
  }, []);

  // Update page title & reset header action on route change
  useEffect(() => {
    const matchedTitle = TITLE_MAP[location.pathname];
    if (matchedTitle) {
      setPageTitle(matchedTitle);
    }
    setHeaderAction(null);
  }, [location.pathname]);

  const handleSetPageTitle = useCallback((title) => {
    setPageTitle(title);
  }, []);

  const handleSetHeaderAction = useCallback((action) => {
    setHeaderAction(action);
  }, []);

  const contextValue = useMemo(() => ({
    addToast,
    setPageTitle: handleSetPageTitle,
    setHeaderAction: handleSetHeaderAction,
  }), [addToast, handleSetPageTitle, handleSetHeaderAction]);

  function toggleSidebar() {
    if (window.innerWidth <= 900) {
      setMobileOpen(v => !v);
    } else {
      setCollapsed(v => !v);
    }
  }

  function closeMobile() { setMobileOpen(false); }

  return (
    <ToastContext.Provider value={contextValue}>
      <div className="app-layout">
        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
          onClick={closeMobile}
        />

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={toggleSidebar}
          onCloseMobile={closeMobile}
          badges={badges}
        />

        <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Top Header */}
          <header className="top-header">
            <button className="btn btn-ghost btn-icon btn-toggle-sidebar" onClick={toggleSidebar} aria-label="Toggle Sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 16 }}>
              <div className="header-title">{pageTitle}</div>
              {headerAction}
            </div>
          </header>

          {/* Page content */}
          <div className="page-content">
            <Outlet />
          </div>
        </main>

        <Toast toasts={toasts} />
      </div>
    </ToastContext.Provider>
  );
}
