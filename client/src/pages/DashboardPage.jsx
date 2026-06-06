import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';

const StatCard = ({ title, value, subtitle }) => (
  <article className="erp-card">
    <div className="erp-card__body">
      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>{title}</p>
      <h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>{value}</h3>
      <p className="erp-card__subtitle">{subtitle}</p>
    </div>
  </article>
);

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    vendors: 0,
    rfqs: 0,
    quotations: 0,
    purchaseOrders: 0,
    invoices: 0,
    notifications: 0
  });

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await erpApi.reports.dashboard();
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
      
      const notifRes = await erpApi.notifications.list({ limit: 10 });
      setNotifications(notifRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (item) => {
    if (item.id === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    navigate(`/${item.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const summaryCards = [
    { title: 'Purchase Orders', value: stats.purchaseOrders, subtitle: 'Total released' },
    { title: 'Open RFQs', value: stats.rfqs, subtitle: 'Sourcing campaigns' },
    { title: 'Active Vendors', value: stats.vendors, subtitle: 'Onboarded supplier count' },
    { title: 'Invoices Issued', value: stats.invoices, subtitle: 'Billing accounts' }
  ];

  return (
    <EnterpriseErpLayout
      user={user}
      notifications={notifications}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
    >
      <div className="erp-breadcrumbs">
        <span className="erp-breadcrumbs__item">ERP Portal</span>
        <span className="erp-breadcrumbs__separator">/</span>
        <span className="erp-breadcrumbs__current">Overview</span>
      </div>

      <div className="erp-content">
        <section className="erp-card">
          <div className="erp-card__header">
            <div>
              <h1 className="erp-card__title">ERP Operational Overview</h1>
              <p className="erp-card__subtitle">Real-time indicators of supply chain bids, POs, and invoicing.</p>
            </div>
            <div className="erp-card__subtitle">
              Role: <span className="erp-badge erp-badge--info">{user?.role}</span>
            </div>
          </div>
          <div className="erp-card__body" style={{ display: 'grid', gap: '18px' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                Loading overview statistics...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {summaryCards.map((card) => <StatCard key={card.title} {...card} />)}
              </div>
            )}

            <div className="erp-card" style={{ boxShadow: 'none' }}>
              <div className="erp-card__body">
                <h2 className="erp-card__title">Today's Focus</h2>
                <p className="erp-card__subtitle">
                  {user?.role === 'vendor' 
                    ? 'Review assigned RFQs, submit quotation bids, and check purchase order acceptance requests.'
                    : 'Analyze supplier bid comparisons, verify pending vendor profiles, and authorize purchase orders.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </EnterpriseErpLayout>
  );
};

export default DashboardPage;