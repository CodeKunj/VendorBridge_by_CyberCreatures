import React, { useMemo, useState, useEffect } from 'react';
import './erp-layout.css';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Breadcrumbs from './Breadcrumbs';
import NotificationPanel from './NotificationPanel';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Globe,
  FileText,
  Scale,
  CheckSquare,
  FileSpreadsheet,
  Users,
  Receipt,
  BarChart3,
  History,
  Settings
} from 'lucide-react';

const defaultNavItems = [
  { id: 'dashboard', label: 'Dashboard', caption: 'Overview', icon: LayoutDashboard },
  { id: 'vendor-portal', label: 'Vendor Portal', caption: 'Active bids', icon: Globe },
  { id: 'rfqs', label: 'RFQs', caption: 'Quotations', icon: FileText },
  { id: 'compare', label: 'Compare Bids', caption: 'Comparison', icon: Scale },
  { id: 'approvals', label: 'Approvals', caption: 'Workflow', icon: CheckSquare },
  { id: 'purchase-orders', label: 'Purchase Orders', caption: 'POs', icon: FileSpreadsheet },
  { id: 'vendors', label: 'Vendors', caption: 'Directory', icon: Users },
  { id: 'invoices', label: 'Invoices', caption: 'Billing', icon: Receipt },
  { id: 'reports', label: 'Reports', caption: 'Analytics', icon: BarChart3 },
  { id: 'activity-logs', label: 'Activity Logs', caption: 'Audit trail', icon: History, adminOnly: true },
  { id: 'settings', label: 'Settings', caption: 'System config', icon: Settings },
];

const EnterpriseErpLayout = ({
  breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  activeNavId = 'dashboard',
  onNavigate,
  onLogout,
  onProfile,
  onSettings,
  children,
}) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const resolvedUser = useMemo(() => ({
    ...user,
    roleLabel: user?.roleLabel || user?.role || 'ERP User',
  }), [user]);

  const navItems = useMemo(() => {
    return defaultNavItems.filter(item => {
      if (item.adminOnly && user?.role !== 'admin') {
        return false;
      }
      if (user?.role === 'vendor' && ['dashboard', 'vendors', 'compare', 'reports', 'activity-logs'].includes(item.id)) {
        return false;
      }
      return true;
    });
  }, [user]);

  const loadNotifications = async () => {
    try {
      if (!user) return;
      const res = await erpApi.notifications.list({ limit: 50 });
      if (res && res.data) {
        setNotifications(res.data);
        const unread = res.data.filter(n => !n.read_at).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      await erpApi.notifications.markRead(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await erpApi.notifications.markAllRead();
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await erpApi.notifications.delete(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <div className={`erp-shell${sidebarOpen ? ' erp-shell--sidebar-open' : ''}`}>
      {sidebarOpen ? <button className="erp-layout-overlay" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar overlay" /> : null}

      <div className="erp-shell__frame">
        <Sidebar
          items={navItems}
          activeId={activeNavId}
          onNavigate={(item) => {
            onNavigate?.(item);
            setSidebarOpen(false);
          }}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="erp-main">
          <TopNavbar
            user={resolvedUser}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onToggleSidebar={() => setSidebarOpen((value) => !value)}
            onToggleNotifications={() => setNotificationsOpen((value) => !value)}
            onLogout={onLogout}
            onProfile={onProfile}
            onSettings={onSettings}
            notificationCount={unreadCount}
          />

          <Breadcrumbs items={breadcrumbs} />

          <div className="erp-content">
            {children}
          </div>
        </main>
      </div>

      <NotificationPanel
        open={notificationsOpen}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDeleteNotification}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
};

export default EnterpriseErpLayout;