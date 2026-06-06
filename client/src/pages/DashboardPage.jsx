import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/dashboardApi';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from 'recharts';

const chartColors = ['#1f4f86', '#2d6bb3', '#5a8fcd', '#8eb4e8'];

const StatCard = ({ title, value, subtitle }) => (
  <article className="erp-card">
    <div className="erp-card__body">
      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>{title}</p>
      <h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>{value}</h3>
      <p className="erp-card__subtitle">{subtitle}</p>
    </div>
  </article>
);

const SectionCard = ({ title, subtitle, children, actions = null }) => (
  <section className="erp-card">
    <div className="erp-card__header">
      <div>
        <h2 className="erp-card__title">{title}</h2>
        {subtitle ? <p className="erp-card__subtitle">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
    <div className="erp-card__body">{children}</div>
  </section>
);

const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(value || 0);

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await dashboardApi.getDashboard();
      setDashboard(response.data);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

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

  const summaryCards = useMemo(() => ([
    { title: 'Total Vendors', value: dashboard?.overview?.vendors ?? 0, subtitle: 'Approved suppliers in the system' },
    { title: 'Active RFQs', value: dashboard?.overview?.activeRfqs ?? 0, subtitle: 'Open procurement requests' },
    { title: 'Pending Approvals', value: dashboard?.overview?.pendingApprovals ?? 0, subtitle: 'Awaiting decision' },
    { title: 'Purchase Orders', value: dashboard?.overview?.purchaseOrders ?? 0, subtitle: 'Raised purchase orders' },
    { title: 'Invoices', value: dashboard?.overview?.invoices ?? 0, subtitle: 'Processed invoices' },
  ]), [dashboard]);

  const quickActions = dashboard?.sections?.quickActions || [];
  const notifications = dashboard?.sections?.notifications || [];
  const recentActivities = dashboard?.sections?.recentActivities || [];
  const monthlyTrend = dashboard?.charts?.monthlyTrend || [];
  const vendorPerformance = dashboard?.charts?.vendorPerformance || [];
  const spendingSummary = dashboard?.charts?.spendingSummary || [];

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      notifications={notifications}
      breadcrumbs={breadcrumbs}
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
              <h1 className="erp-card__title">ERP Operational Dashboard</h1>
              <p className="erp-card__subtitle">Overview of sourcing campaigns, approvals, and transaction tracking.</p>
            </div>
            <div className="erp-card__subtitle">
              Role: <span className="erp-badge erp-badge--info">{user?.role}</span>
            </div>
          </div>
          <div className="erp-card__body" style={{ display: 'grid', gap: '18px' }}>
            {error ? <div className="erp-alert erp-alert--danger">{error}</div> : null}
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                Loading dashboard metrics...
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
                  {summaryCards.map((card) => <StatCard key={card.title} {...card} />)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  <SectionCard title="Monthly Procurement Trend" subtitle="Purchase orders and invoices across recent months">
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <AreaChart data={monthlyTrend}>
                          <defs>
                            <linearGradient id="colorPo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2d6bb3" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#2d6bb3" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5eef8" />
                          <XAxis dataKey="month" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="purchaseOrders" name="Purchase Orders" stroke="#1f4f86" fillOpacity={1} fill="url(#colorPo)" />
                          <Area type="monotone" dataKey="invoices" name="Invoices" stroke="#5a8fcd" fillOpacity={1} fill="#dbeafe" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  <SectionCard title="Vendor Performance" subtitle="Top vendor score snapshot">
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <BarChart data={vendorPerformance} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5eef8" />
                          <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                          <YAxis type="category" dataKey="name" stroke="#64748b" width={110} />
                          <Tooltip />
                          <Bar dataKey="score" fill="#2d6bb3" radius={[0, 10, 10, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  <SectionCard title="Spending Summary" subtitle="Monthly spend trends">
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <LineChart data={spendingSummary}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5eef8" />
                          <XAxis dataKey="month" stroke="#64748b" />
                          <YAxis tickFormatter={(value) => `$${value / 1000}k`} stroke="#64748b" />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Line type="monotone" dataKey="spent" stroke="#1f4f86" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  <SectionCard title="Quick Actions" subtitle="One-click shortcuts">
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {quickActions.map((action) => (
                        <button key={action.id} type="button" className="erp-btn erp-btn--secondary" style={{ width: '100%', justifyContent: 'flex-start', padding: '0 16px' }} onClick={() => navigate(action.href)}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  <SectionCard title="Recent Activities" subtitle="Latest operational events">
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {recentActivities.length === 0 ? <div className="erp-alert erp-alert--info">No recent activity available.</div> : recentActivities.map((activity) => (
                        <article key={activity.id} className="erp-card" style={{ padding: '12px', margin: 0, border: '1px solid var(--erp-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--erp-text-muted)', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{activity.title}</span>
                            <span>{activity.time ? new Date(activity.time).toLocaleDateString() : 'Now'}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>{activity.message}</p>
                        </article>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title="Notifications" subtitle="System and workflow alerts">
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {notifications.length === 0 ? <div className="erp-alert erp-alert--info">No notifications available.</div> : notifications.map((notification) => (
                        <article key={notification.id} className="erp-card" style={{ padding: '12px', margin: 0, border: '1px solid var(--erp-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--erp-text-muted)', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{notification.category}</span>
                            <span>{notification.time ? new Date(notification.time).toLocaleDateString() : 'Now'}</span>
                          </div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem' }}>{notification.title}</h4>
                          <p style={{ margin: 0, fontSize: '0.88rem' }}>{notification.message}</p>
                        </article>
                      ))}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard title="Vendor Performance Overview" subtitle="Breakdown of supplier quality and reliability">
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={vendorPerformance.slice(0, 4)} dataKey="score" nameKey="name" innerRadius={70} outerRadius={120} paddingAngle={4}>
                          {vendorPerformance.slice(0, 4).map((entry, index) => (
                            <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </>
            )}
          </div>
        </section>
      </div>
    </EnterpriseErpLayout>
  );
};

export default DashboardPage;