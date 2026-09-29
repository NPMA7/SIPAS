import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Toast from '../ui/Toast';
import ThemeToggle from '../ui/ThemeToggle';
import { useToast } from '../../hooks/useToast';
import { ToastContext } from '../../hooks/ToastContext';
import { apiFetch } from '../../api/client';

const TITLE_MAP = {
  '/manage/admin': 'Dashboard',
  '/manage/admin/': 'Dashboard',
  '/manage/admin/users': 'Pengguna',
  '/manage/admin/user-hotspot': 'Pengguna',
  '/manage/admin/blocked-sites': 'Situs Diblokir',
  '/manage/admin/routers': 'Manajemen Router',
  '/manage/admin/hotspot': 'Pengaturan Hotspot',
  '/manage/admin/queues': 'Limit Kecepatan',
  '/manage/admin/dhcp': 'DHCP Leases',
  '/manage/admin/dhcp-leases': 'DHCP Leases',
  '/manage/admin/portal-settings': 'Kustomisasi Portal',
  '/manage/admin/portal-customizer': 'Kustomisasi Portal',
  '/manage/admin/admins': 'Pengelola Web',
  '/manage/admin/manage-users': 'Pengelola Web',
  '/manage/admin/api': 'Dokumentasi API',
  '/manage/api': 'Dokumentasi API',
  '/admin': 'Dashboard',
  '/admin/user-hotspot': 'Pengguna',
  '/admin/blocked-sites': 'Situs Diblokir',
  '/admin/routers': 'Manajemen Router',
  '/admin/hotspot': 'Pengaturan Hotspot',
  '/admin/queues': 'Limit Kecepatan',
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
  const [countdown, setCountdown] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const autoRefreshCallbackRef = useRef(null);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('hotspot_token');
    if (!token) navigate('/manage/admin/login');
  }, [navigate]);

  // Load badge counts
  const loadBadges = useCallback(() => {
    apiFetch('/dashboard/summary').then(data => {
      if (data?.success) {
        setBadges({ users: data.data.total_users });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  // Trigger manual or auto refresh
  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      loadBadges();
      if (typeof autoRefreshCallbackRef.current === 'function') {
        await autoRefreshCallbackRef.current();
      }
    } catch (_) {
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [loadBadges]);

  // Global 30s Auto Refresh Interval Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          triggerRefresh();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [triggerRefresh]);

  // Update page title & reset header action and callback on route change
  useEffect(() => {
    const matchedTitle = TITLE_MAP[location.pathname];
    if (matchedTitle) {
      setPageTitle(matchedTitle);
    }
    setHeaderAction(null);
    autoRefreshCallbackRef.current = null;
  }, [location.pathname]);

  const handleSetPageTitle = useCallback((title) => {
    setPageTitle(title);
  }, []);

  const handleSetHeaderAction = useCallback((action) => {
    setHeaderAction(action);
  }, []);

  const registerAutoRefresh = useCallback((fn) => {
    autoRefreshCallbackRef.current = fn;
  }, []);

  const contextValue = useMemo(() => ({
    addToast,
    setPageTitle: handleSetPageTitle,
    setHeaderAction: handleSetHeaderAction,
    registerAutoRefresh,
    triggerRefresh,
  }), [addToast, handleSetPageTitle, handleSetHeaderAction, registerAutoRefresh, triggerRefresh]);

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
      <div className="flex min-h-screen app-layout-wrapper overflow-x-hidden">
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
          <header className="sticky top-0 z-30 h-15 app-header backdrop-blur-md px-4 sm:px-6 flex items-center gap-3">
            <button
              className="p-2 -ml-2 rounded-lg header-toggle-btn transition-colors focus:outline-hidden cursor-pointer"
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
              <div className="text-base sm:text-lg font-bold header-title tracking-tight truncate">
                {pageTitle}
              </div>
              <div className="flex items-center gap-2">
                {/* Global Auto Refresh Badge */}
                <button
                  type="button"
                  onClick={() => {
                    setCountdown(30);
                    triggerRefresh();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-blue-500/40 rounded-full text-xs stat-card-label cursor-pointer transition-all active:scale-95 select-none"
                  title="Klik untuk refresh instan sekarang"
                >
                  <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'} shrink-0`} />
                  <span>
                    Auto Refresh: <strong className="text-blue-500 font-bold">{countdown}s</strong>
                  </span>
                </button>

                {headerAction}
                <ThemeToggle />
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
