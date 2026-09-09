import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Toast from '../ui/Toast';
import { useToast } from '../../hooks/useToast';
import { ToastContext } from '../../hooks/ToastContext';
import { apiFetch } from '../../api/client';

const TITLE_MAP = {
  '/manage/admin': 'Dashboard',
  '/manage/admin/': 'Dashboard',
  '/manage/admin/users': 'Pengguna Hotspot',
  '/manage/admin/user-hotspot': 'Pengguna Hotspot',
  '/manage/admin/blocked-sites': 'Situs Diblokir',
  '/manage/admin/routers': 'Manajemen Router',
  '/manage/admin/hotspot': 'Hotspot Router',
  '/manage/admin/queues': 'Simple Queues',
  '/manage/admin/dhcp': 'DHCP Leases',
  '/manage/admin/dhcp-leases': 'DHCP Leases',
  '/manage/admin/portal-settings': 'Kustomisasi Portal',
  '/manage/admin/portal-customizer': 'Kustomisasi Portal',
  '/manage/admin/admins': 'Pengelola Web',
  '/manage/admin/manage-users': 'Pengelola Web',
  '/admin': 'Dashboard',
  '/admin/user-hotspot': 'Pengguna Hotspot',
  '/admin/blocked-sites': 'Situs Diblokir',
  '/admin/routers': 'Manajemen Router',
  '/admin/hotspot': 'Hotspot Router',
  '/admin/queues': 'Simple Queues',
  '/admin/dhcp-leases': 'DHCP Leases',
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
    if (!token) navigate('/manage/admin/login');
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
      <div className="flex min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
            onClick={closeMobile}
          />
        )}

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={toggleSidebar}
          onCloseMobile={closeMobile}
          badges={badges}
        />

        <main className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'} ml-0`}>
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 h-15 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center gap-3">
            <button
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors focus:outline-hidden cursor-pointer"
              onClick={toggleSidebar}
              aria-label="Toggle Sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="flex items-center justify-between flex-1 min-w-0">
              <div className="text-base sm:text-lg font-bold text-slate-100 tracking-tight truncate">
                {pageTitle}
              </div>
              <div className="flex items-center gap-2">
                {headerAction}
              </div>
            </div>
          </header>

          {/* Page Content Body */}
          <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>

        <Toast toasts={toasts} />
      </div>
    </ToastContext.Provider>
  );
}
