import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalLogin />} />
        
        {/* Manage Admin Routes */}
        <Route path="/manage/admin/login" element={<Login />} />
        <Route path="/manage/admin" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="user-hotspot" element={<Users />} />
          <Route path="users" element={<Navigate to="/manage/admin/user-hotspot" replace />} />
          <Route path="blocked-sites" element={<BlockedSites />} />
          <Route path="routers" element={<Routers />} />
          <Route path="hotspot/*" element={<Hotspot />} />
          <Route path="queues" element={<Queues />} />
          <Route path="dhcp-leases" element={<DhcpLeases />} />
          <Route path="dhcp" element={<Navigate to="/manage/admin/dhcp-leases" replace />} />
          <Route path="portal-settings" element={<PortalCustomizer />} />
          <Route path="portal-customizer" element={<Navigate to="/manage/admin/portal-settings" replace />} />
          <Route path="manage-users" element={<AdminUsers />} />
          <Route path="admins" element={<Navigate to="/manage/admin/manage-users" replace />} />
        </Route>

        {/* Legacy /admin redirects */}
        <Route path="/admin/login" element={<Navigate to="/manage/admin/login" replace />} />
        <Route path="/admin/user-hotspot" element={<Navigate to="/manage/admin/user-hotspot" replace />} />
        <Route path="/admin/users" element={<Navigate to="/manage/admin/user-hotspot" replace />} />
        <Route path="/admin/blocked-sites" element={<Navigate to="/manage/admin/blocked-sites" replace />} />
        <Route path="/admin/routers" element={<Navigate to="/manage/admin/routers" replace />} />
        <Route path="/admin/hotspot/*" element={<Navigate to="/manage/admin/hotspot" replace />} />
        <Route path="/admin/queues" element={<Navigate to="/manage/admin/queues" replace />} />
        <Route path="/admin/dhcp-leases" element={<Navigate to="/manage/admin/dhcp-leases" replace />} />
        <Route path="/admin/dhcp" element={<Navigate to="/manage/admin/dhcp-leases" replace />} />
        <Route path="/admin/manage-users" element={<Navigate to="/manage/admin/manage-users" replace />} />
        <Route path="/admin/admins" element={<Navigate to="/manage/admin/manage-users" replace />} />
        <Route path="/admin" element={<Navigate to="/manage/admin" replace />} />
        <Route path="/admin/*" element={<Navigate to="/manage/admin" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
