import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './erp-layout.css';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Breadcrumbs from './Breadcrumbs';
import NotificationPanel from './NotificationPanel';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../context/AuthContext';
import ProcurementAssistant from '../ai/ProcurementAssistant';
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
  Settings,
  UserCog,
} from 'lucide-react';

const defaultNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vendor-portal', label: 'Vendor Portal', icon: Globe },
  { id: 'rfqs', label: 'RFQs', icon: FileText },
  { id: 'compare', label: 'Compare Bids', icon: Scale },
  { id: 'approvals', label: 'Approvals', icon: CheckSquare },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: FileSpreadsheet },
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'activity-logs',    label: 'Activity Logs',    icon: History,  adminOnly: true },
  { id: 'user-management',  label: 'User Management',  icon: UserCog,  adminOnly: true },
  { id: 'settings',         label: 'Settings',          icon: Settings, adminOnly: true },
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
  searchValue: parentSearchValue,
  onSearchChange: parentOnSearchChange,
  children,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [localSearchValue, setLocalSearchValue] = useState('');

  const searchValue = parentSearchValue !== undefined ? parentSearchValue : localSearchValue;
  const setSearchValue = parentOnSearchChange !== undefined ? parentOnSearchChange : setLocalSearchValue;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const resolvedUser = useMemo(() => ({
    ...user,
    roleLabel: user?.roleLabel || user?.role || 'ERP User',
  }), [user]);

  const navItems = useMemo(() => {
    if (!user) return [];

    // Define exact allowed menu items per role
    const roleAllowedItems = {
      admin: ['dashboard', 'vendors', 'rfqs', 'compare', 'approvals', 'purchase-orders', 'invoices', 'reports', 'activity-logs', 'user-management', 'settings'],
      procurement_officer: ['dashboard', 'vendors', 'rfqs', 'compare', 'purchase-orders', 'invoices'],
      manager: ['dashboard', 'vendors', 'compare', 'approvals', 'purchase-orders', 'invoices', 'reports'],
      vendor: ['vendor-portal', 'purchase-orders'],
    };

    const allowedIds = roleAllowedItems[user.role] || [];
    return defaultNavItems.filter(item => allowedIds.includes(item.id));
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
            onProfile={() => navigate('/profile')}
            onSettings={() => navigate('/settings')}
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

      <ProcurementAssistant />
    </div>
  );
};

export default EnterpriseErpLayout;