import React, { useMemo, useState } from 'react';
import './erp-layout.css';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Breadcrumbs from './Breadcrumbs';
import NotificationPanel from './NotificationPanel';

const defaultNavItems = [
  { id: 'dashboard', label: 'Dashboard', caption: 'Overview and KPIs', icon: 'D' },
  { id: 'vendor-portal', label: 'Vendor Portal', caption: 'Assigned RFQs and quotations', icon: 'VP' },
  { id: 'rfqs', label: 'RFQs', caption: 'Requests for quotation', icon: 'Q' },
  { id: 'vendors', label: 'Vendors', caption: 'Supplier records', icon: 'V' },
  { id: 'invoices', label: 'Invoices', caption: 'Billing operations', icon: 'I' },
  { id: 'reports', label: 'Reports', caption: 'Analytics and exports', icon: 'R' },
  { id: 'settings', label: 'Settings', caption: 'System configuration', icon: 'S' },
];

const EnterpriseErpLayout = ({
  user,
  navItems = defaultNavItems,
  breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Operations' },
  ],
  notifications = [],
  activeNavId = 'dashboard',
  onNavigate,
  onLogout,
  onProfile,
  onSettings,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const resolvedUser = useMemo(() => ({
    ...user,
    roleLabel: user?.roleLabel || user?.role || 'ERP User',
  }), [user]);

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
            notificationCount={notifications.length}
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
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
};

export default EnterpriseErpLayout;