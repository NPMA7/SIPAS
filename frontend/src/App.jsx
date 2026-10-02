import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Routers from './pages/Routers';
import Hotspot from './pages/Hotspot';
import DhcpLeases from './pages/DhcpLeases';
import Queues from './pages/Queues';
import BlockedSites from './pages/BlockedSites';
import AdminUsers from './pages/AdminUsers';
import PortalCustomizer from './pages/PortalCustomizer';
import PortalLogin from './pages/Portal/Login';
import ApiDocs from './pages/ApiDocs';
import './index.css';

function RootEntry() {
  const isNocr = typeof window !== 'undefined' && (
    window.location.hostname.includes('nocrnetwork.com') ||
    window.location.port === '3005'
  );
  if (isNocr) {
    return <Navigate to="/dashboard" replace />;
  }
  return <PortalLogin />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootEntry />} />
          <Route path="/login" element={<Login />} />

          {/* Clean Top-Level Admin Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/user-hotspot" element={<Users />} />
            <Route path="/users" element={<Navigate to="/user-hotspot" replace />} />
            <Route path="/blocked-sites" element={<BlockedSites />} />
            <Route path="/routers" element={<Routers />} />
            <Route path="/hotspot/*" element={<Hotspot />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/dhcp-leases" element={<Navigate to="/hotspot/dhcp-leases" replace />} />
            <Route path="/dhcp" element={<Navigate to="/hotspot/dhcp-leases" replace />} />
            <Route path="/portal-settings" element={<PortalCustomizer />} />
            <Route path="/portal-customizer" element={<Navigate to="/portal-settings" replace />} />
            <Route path="/manage-users" element={<AdminUsers />} />
            <Route path="/admins" element={<Navigate to="/manage-users" replace />} />
            <Route path="/api" element={<ApiDocs />} />
            <Route path="/api-docs" element={<Navigate to="/api" replace />} />
          </Route>

          {/* Backward compatibility redirects for /manage/admin/* */}
          <Route path="/manage/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/manage/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/manage/admin/user-hotspot" element={<Navigate to="/user-hotspot" replace />} />
          <Route path="/manage/admin/users" element={<Navigate to="/user-hotspot" replace />} />
          <Route path="/manage/admin/blocked-sites" element={<Navigate to="/blocked-sites" replace />} />
          <Route path="/manage/admin/routers" element={<Navigate to="/routers" replace />} />
          <Route path="/manage/admin/hotspot/*" element={<Navigate to="/hotspot" replace />} />
          <Route path="/manage/admin/queues" element={<Navigate to="/queues" replace />} />
          <Route path="/manage/admin/dhcp-leases" element={<Navigate to="/hotspot/dhcp-leases" replace />} />
          <Route path="/manage/admin/dhcp" element={<Navigate to="/hotspot/dhcp-leases" replace />} />
          <Route path="/manage/admin/portal-settings" element={<Navigate to="/portal-settings" replace />} />
          <Route path="/manage/admin/portal-customizer" element={<Navigate to="/portal-settings" replace />} />
          <Route path="/manage/admin/manage-users" element={<Navigate to="/manage-users" replace />} />
          <Route path="/manage/admin/admins" element={<Navigate to="/manage-users" replace />} />
          <Route path="/manage/admin/api" element={<Navigate to="/api" replace />} />
          <Route path="/manage/admin/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/manage/api" element={<Navigate to="/api" replace />} />

          {/* Legacy /admin redirects */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/user-hotspot" element={<Navigate to="/user-hotspot" replace />} />
          <Route path="/admin/users" element={<Navigate to="/user-hotspot" replace />} />
          <Route path="/admin/blocked-sites" element={<Navigate to="/blocked-sites" replace />} />
          <Route path="/admin/routers" element={<Navigate to="/routers" replace />} />
          <Route path="/admin/hotspot/*" element={<Navigate to="/hotspot" replace />} />
          <Route path="/admin/queues" element={<Navigate to="/queues" replace />} />
          <Route path="/admin/dhcp-leases" element={<Navigate to="/hotspot/dhcp-leases" replace />} />
          <Route path="/admin/dhcp" element={<Navigate to="/hotspot/dhcp-leases" replace />} />
          <Route path="/admin/manage-users" element={<Navigate to="/manage-users" replace />} />
          <Route path="/admin/admins" element={<Navigate to="/manage-users" replace />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
