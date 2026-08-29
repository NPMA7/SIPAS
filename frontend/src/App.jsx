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
import PortalLogin from './pages/Portal/Login';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalLogin />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="user-hotspot" element={<Users />} />
          <Route path="users" element={<Navigate to="/admin/user-hotspot" replace />} />
          <Route path="blocked-sites" element={<BlockedSites />} />
          <Route path="routers" element={<Routers />} />
          <Route path="hotspot/*" element={<Hotspot />} />
          <Route path="queues" element={<Queues />} />
          <Route path="dhcp-leases" element={<DhcpLeases />} />
          <Route path="dhcp" element={<Navigate to="/admin/dhcp-leases" replace />} />
          <Route path="manage-users" element={<AdminUsers />} />
          <Route path="admins" element={<Navigate to="/admin/manage-users" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
