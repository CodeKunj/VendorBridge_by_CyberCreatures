import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';

const summaryCards = [
  { title: 'Purchase Orders', value: '128', subtitle: '+12% this month' },
  { title: 'Pending Approvals', value: '24', subtitle: '6 waiting today' },
  { title: 'Open RFQs', value: '17', subtitle: '3 urgent' },
  { title: 'Active Vendors', value: '84', subtitle: '97% verified' },
];

const notifications = [
  { id: 1, category: 'Approval', title: 'PO #PO-2041 needs sign-off', message: 'A procurement approval is awaiting manager review.', time: '5m ago' },
  { id: 2, category: 'Vendor', title: 'New vendor onboarding complete', message: 'Atlas Components has been approved and activated.', time: '18m ago' },
  { id: 3, category: 'Finance', title: 'Invoice mismatch detected', message: 'Invoice INV-8821 is out of tolerance and requires review.', time: '1h ago' },
];

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

  return (
    <EnterpriseErpLayout
      user={user}
      notifications={notifications}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/dashboard')}
    >
      <section className="erp-card">
        <div className="erp-card__header">
          <div>
            <h1 className="erp-card__title">ERP Overview</h1>
            <p className="erp-card__subtitle">Enterprise operations at a glance for procurement, finance, and vendors.</p>
          </div>
          <div className="erp-card__subtitle">Signed in as {user?.name || 'User'}</div>
        </div>
        <div className="erp-card__body" style={{ display: 'grid', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {summaryCards.map((card) => <StatCard key={card.title} {...card} />)}
          </div>

          <div className="erp-card" style={{ boxShadow: 'none' }}>
            <div className="erp-card__body">
              <h2 className="erp-card__title">Today's Focus</h2>
              <p className="erp-card__subtitle">Review approvals, process vendor updates, and clear invoice exceptions before noon.</p>
            </div>
          </div>
        </div>
      </section>
    </EnterpriseErpLayout>
  );
};

export default DashboardPage;