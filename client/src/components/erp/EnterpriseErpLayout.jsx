import React, { useMemo, useState, useEffect } from 'react';
import './erp-layout.css';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Breadcrumbs from './Breadcrumbs';
import NotificationPanel from './NotificationPanel';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../context/AuthContext';

const defaultNavItems = [
  { id: 'dashboard', label: 'Dashboard', caption: 'Overview and KPIs', icon: 'D' },
  { id: 'vendor-portal', label: 'Vendor Portal', caption: 'Assigned RFQs and bids', icon: 'VP' },
  { id: 'rfqs', label: 'RFQs', caption: 'Requests for quotation', icon: 'Q' },
  { id: 'compare', label: 'Compare Bids', caption: 'Quotation compare matrix', icon: 'C' },
  { id: 'approvals', label: 'Approvals', caption: 'Workflow approvals', icon: 'A' },
  { id: 'purchase-orders', label: 'Purchase Orders', caption: 'Official PO documents', icon: 'PO' },
  { id: 'vendors', label: 'Vendors', caption: 'Supplier records', icon: 'V' },
  { id: 'invoices', label: 'Invoices', caption: 'Billing operations', icon: 'I' },
  { id: 'reports', label: 'Reports', caption: 'Analytics and exports', icon: 'R' },
  { id: 'activity-logs', label: 'Activity Logs', caption: 'System audit logs', icon: 'L', adminOnly: true },
  { id: 'settings', label: 'Settings', caption: 'System configuration', icon: 'S', adminOnly: true },
];

const EnterpriseErpLayout = ({
  breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Operations' },
  ],
  activeNavId = 'dashboard',
  onNavigate,
  onLogout,
  onProfile,
  onSettings,
  children,
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const resolvedUser = useMemo(() => ({
    ...user,
    roleLabel: user?.roleLabel || user?.role || 'ERP User',
  }), [user]);

  // Filter Nav Items based on user role
  const navItems = useMemo(() => {
    if (!user) return [];

    // Define exact allowed menu items per role
    const roleAllowedItems = {
      admin: ['dashboard', 'vendors', 'rfqs', 'compare', 'approvals', 'purchase-orders', 'invoices', 'reports', 'activity-logs', 'settings'],
      procurement_officer: ['dashboard', 'vendors', 'rfqs', 'compare', 'purchase-orders', 'invoices'],
      manager: ['dashboard', 'vendors', 'compare', 'approvals', 'purchase-orders', 'invoices', 'reports'],
      vendor: ['vendor-portal', 'purchase-orders'],
    };

    const allowedIds = roleAllowedItems[user.role] || [];
    return defaultNavItems.filter(item => allowedIds.includes(item.id));
  }, [user]);

  // Fetch notifications helper
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

  // Poll notifications in the background for real-time alerts
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 10000); // Poll every 10 seconds
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