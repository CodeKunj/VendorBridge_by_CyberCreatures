import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/dashboardApi';
import { formatCurrency, formatAxisINR } from '../utils/currency';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Pie, PieChart, LineChart, Line,
} from 'recharts';
import { 
  Building, 
  FileText, 
  Clock, 
  Package, 
  Receipt, 
  Award, 
  AlertCircle,
  HelpCircle,
  UserPlus
} from 'lucide-react';

/* ── Design tokens ────────────────────────────────────────────────── */
const T = {
  primary: '#264dd9',
  primaryContainer: '#4568f3',
  secondary: '#6647c3',
  secondaryContainer: '#9c7ffd',
  tertiary: '#008648',
  tertiaryContainer: '#5cde8d',
  error: '#ba1a1a',
  surface: '#ffffff',
  surfaceLow: '#f2f3f7',
  surfaceContainer: '#edeef2',
  onSurface: '#191c1f',
  onSurfaceVariant: '#444655',
  outline: '#747686',
  outlineVariant: '#c4c5d7',
  bg: '#f8f9fd',
};

const chartColors = [T.primaryContainer, T.secondaryContainer, T.tertiaryContainer, '#f4b840'];

/* ── Inline styles ────────────────────────────────────────────────── */
const css = {
  page: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: T.bg,
    minHeight: '100vh',
    padding: '0 0 40px',
  },

  /* hero greeting */
  hero: {
    background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryContainer} 60%, ${T.secondaryContainer} 100%)`,
    borderRadius: '1.5rem',
    padding: '32px 36px',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    boxShadow: '0 8px 32px rgba(38,77,217,0.22)',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  heroTitle: {
    margin: 0, fontSize: 28, fontWeight: 700,
    letterSpacing: '-0.02em', lineHeight: 1.25,
    color: "#fff",
  },
  heroSub: {
    margin: '6px 0 0', fontSize: 14, opacity: 0.82, lineHeight: 1.5,
  },
  rolePill: {
    display: 'inline-flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.22)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 9999,
    padding: '6px 16px',
    fontSize: 13, fontWeight: 600, color: '#fff',
    flexShrink: 0,
  },

  /* stat grid */
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: T.surface,
    borderRadius: '1rem',
    padding: '22px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    border: `1px solid ${T.outlineVariant}`,
    transition: 'transform 180ms ease, box-shadow 180ms ease',
    cursor: 'default',
  },
  statIcon: {
    width: 40, height: 40, borderRadius: '0.75rem',
    display: 'grid', placeItems: 'center',
    marginBottom: 14, fontSize: 18,
  },
  statValue: {
    margin: 0, fontSize: 30, fontWeight: 700,
    color: T.onSurface, letterSpacing: '-0.02em',
  },
  statLabel: {
    margin: '4px 0 0', fontSize: 12, fontWeight: 600,
    color: T.onSurfaceVariant, letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  statSub: {
    margin: '6px 0 0', fontSize: 12,
    color: T.outline,
  },

  /* section card */
  card: {
    background: T.surface,
    borderRadius: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    border: `1px solid ${T.outlineVariant}`,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '20px 24px 0',
    borderBottom: `1px solid ${T.surfaceContainer}`,
    paddingBottom: 16,
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12,
  },
  cardTitle: {
    margin: 0, fontSize: 16, fontWeight: 600,
    color: T.onSurface, letterSpacing: '-0.01em',
  },
  cardSub: {
    margin: '4px 0 0', fontSize: 13,
    color: T.onSurfaceVariant,
  },
  cardBody: { padding: '20px 24px 24px' },

  /* charts grid */
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },

  /* activity item */
  activityItem: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    padding: '12px 0',
    borderBottom: `1px solid ${T.surfaceContainer}`,
  },
  activityDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: T.primaryContainer, flexShrink: 0, marginTop: 6,
  },
  activityTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: T.onSurface },
  activityMsg: { margin: '3px 0 0', fontSize: 13, color: T.onSurfaceVariant, lineHeight: 1.5 },
  activityTime: { fontSize: 11, color: T.outline, marginTop: 4 },

  /* notification item */
  notifItem: {
    borderRadius: '0.75rem',
    padding: '14px 16px',
    background: T.surfaceLow,
    marginBottom: 10,
    borderLeft: `3px solid ${T.primaryContainer}`,
  },
  notifCategory: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: T.primary, marginBottom: 4,
  },
  notifTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: T.onSurface },
  notifMsg: { margin: '4px 0 0', fontSize: 13, color: T.onSurfaceVariant, lineHeight: 1.5 },

  /* quick action button */
  qaBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', border: 'none',
    background: T.surfaceLow,
    borderRadius: '0.75rem',
    padding: '13px 16px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
    color: T.onSurface, marginBottom: 10,
    transition: 'background 160ms ease, transform 160ms ease',
    textAlign: 'left',
  },
  qaIcon: {
    width: 34, height: 34, borderRadius: '0.5rem',
    background: `linear-gradient(135deg, ${T.primary}, ${T.primaryContainer})`,
    display: 'grid', placeItems: 'center', color: '#fff', fontSize: 15, flexShrink: 0,
  },

  /* loading */
  loading: {
    textAlign: 'center', padding: '60px 0',
    color: T.onSurfaceVariant, fontSize: 14, fontWeight: 500,
  },
  loadingDots: { letterSpacing: 4, fontSize: 20, color: T.primaryContainer },

  /* breadcrumb */
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '16px 0 20px', fontSize: 13,
    color: T.onSurfaceVariant,
  },
  breadSep: { color: T.outlineVariant },
  breadCurrent: { color: T.onSurface, fontWeight: 600 },

  /* bottom 2-col */
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },

  /* pie section */
  pieSection: { marginBottom: 24 },
};

/* ── Subcomponents ────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, color, bg, title, value, sub }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        ...css.statCard,
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? '0 10px 30px rgba(0,0,0,0.07)' : css.statCard.boxShadow,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ ...css.statIcon, background: bg, color }}>
        <Icon size={18} />
      </div>
      <p style={css.statValue}>{value}</p>
      <p style={css.statLabel}>{title}</p>
      {sub && <p style={css.statSub}>{sub}</p>}
    </div>
  );
};

const SectionCard = ({ title, sub, children, action }) => (
  <div style={css.card}>
    <div style={css.cardHeader}>
      <div>
        <h2 style={css.cardTitle}>{title}</h2>
        {sub && <p style={css.cardSub}>{sub}</p>}
      </div>
      {action}
    </div>
    <div style={css.cardBody}>{children}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.outlineVariant}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: T.onSurface }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? formatCurrency(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* qa icons map */
const QA_ICONS = {
  'new-rfq': FileText,
  'new-po': Package,
  'new-invoice': Receipt,
  'new-vendor': UserPlus,
};

/* ── Main page ────────────────────────────────────────────────────── */
const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError('');
        const res = await dashboardApi.getDashboard();
        setDashboard(res.data);
      } catch (e) {
        setError(e.message || 'Unable to load dashboard');
      } finally { setLoading(false); }
    })();
  }, []);

  const handleNavigate = (item) => navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const [searchQuery, setSearchQuery] = useState('');

  const notifications = dashboard?.sections?.notifications || [];
  const recentActivities = dashboard?.sections?.recentActivities || [];
  const quickActions = dashboard?.sections?.quickActions || [];
  const monthlyTrend = dashboard?.charts?.monthlyTrend || [];
  const vendorPerformance = dashboard?.charts?.vendorPerformance || [];
  const spendingSummary = dashboard?.charts?.spendingSummary || [];

  const filteredNotifications = useMemo(() => {
    if (!searchQuery) return notifications;
    const q = searchQuery.toLowerCase();
    return notifications.filter(n =>
      (n.category || '').toLowerCase().includes(q) ||
      (n.title || '').toLowerCase().includes(q) ||
      (n.message || '').toLowerCase().includes(q)
    );
  }, [notifications, searchQuery]);

  const filteredActivities = useMemo(() => {
    if (!searchQuery) return recentActivities;
    const q = searchQuery.toLowerCase();
    return recentActivities.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.message || '').toLowerCase().includes(q)
    );
  }, [recentActivities, searchQuery]);

  const statCards = useMemo(() => [
    { icon: Building, color: T.primary, bg: '#e8edff', title: 'Total Vendors', value: dashboard?.overview?.vendors ?? 0, sub: 'Approved suppliers' },
    { icon: FileText, color: '#6647c3', bg: '#ede8ff', title: 'Active RFQs', value: dashboard?.overview?.activeRfqs ?? 0, sub: 'Open requests' },
    { icon: Clock, color: '#b45309', bg: '#fef3c7', title: 'Pending Approvals', value: dashboard?.overview?.pendingApprovals ?? 0, sub: 'Awaiting decision' },
    { icon: Package, color: T.tertiary, bg: '#d1fae5', title: 'Purchase Orders', value: dashboard?.overview?.purchaseOrders ?? 0, sub: 'Raised POs' },
    { icon: Receipt, color: '#be185d', bg: '#fce7f3', title: 'Invoices', value: dashboard?.overview?.invoices ?? 0, sub: 'Processed' },
  ], [dashboard]);

  const breadcrumbs = useMemo(() => [{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/dashboard' }], []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .dash-qa-btn:hover { background: #e8edff !important; transform: translateX(3px) !important; }
        .dash-stat-card:hover { transform: translateY(-3px); }
      `}</style>
      <EnterpriseErpLayout
        user={user}
        activeNavId="dashboard"
        notifications={notifications}
        breadcrumbs={breadcrumbs}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onProfile={() => navigate('/dashboard')}
        onSettings={() => navigate('/settings')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {/* Hero */}
            <div style={css.hero}>
              <div style={css.heroBg} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, opacity: 0.8, fontWeight: 500 }}>
                  Good day, {user?.name?.split(' ')[0] || 'Manager'}
                </p>
                <h1 style={css.heroTitle}>Procurement Dashboard</h1>
                <p style={css.heroSub}>Overview of sourcing campaigns, approvals, and transaction tracking.</p>
              </div>
              <span style={css.rolePill}>
                <Award size={14} style={{ marginRight: '6px' }} />
                {user?.role || 'Procurement'}
              </span>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff1f2', border: '1px solid #fecdd3',
                borderRadius: '0.75rem', padding: '14px 18px', marginBottom: 20,
                color: T.error, fontSize: 14, fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}

            {loading ? (
              <div style={css.loading}>
                <div style={css.loadingDots}>• • •</div>
                <p style={{ marginTop: 12 }}>Loading dashboard metrics…</p>
              </div>
            ) : (
              <>
                {/* Stat Cards */}
                <div style={css.statGrid}>
                  {statCards.map((c) => <StatCard key={c.title} {...c} />)}
                </div>

                {/* Charts Row */}
                <div style={css.chartsGrid}>
                  <SectionCard title="Monthly Procurement Trend" sub="POs & invoices across recent months">
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={monthlyTrend}>
                        <defs>
                          <linearGradient id="gPO" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={T.primaryContainer} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={T.primaryContainer} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={T.secondaryContainer} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={T.secondaryContainer} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.surfaceContainer} />
                        <XAxis dataKey="month" stroke={T.outline} tick={{ fontSize: 12 }} />
                        <YAxis stroke={T.outline} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        <Area type="monotone" dataKey="purchaseOrders" name="Purchase Orders"
                          stroke={T.primaryContainer} fill="url(#gPO)" strokeWidth={2} dot={{ r: 3 }} />
                        <Area type="monotone" dataKey="invoices" name="Invoices"
                          stroke={T.secondaryContainer} fill="url(#gInv)" strokeWidth={2} dot={{ r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </SectionCard>

                  <SectionCard title="Vendor Performance" sub="Top vendor score snapshot">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={vendorPerformance} layout="vertical" margin={{ left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.surfaceContainer} />
                        <XAxis type="number" domain={[0, 100]} stroke={T.outline} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" stroke={T.outline} width={120} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                          {vendorPerformance.map((_, i) => (
                            <Cell key={i} fill={chartColors[i % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </SectionCard>

                  <SectionCard title="Spending Summary" sub="Monthly spend trends">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={spendingSummary}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.surfaceContainer} />
                        <XAxis dataKey="month" stroke={T.outline} tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={formatAxisINR} stroke={T.outline} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatCurrency(v)} content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="spent" stroke={T.primary}
                          strokeWidth={3} dot={{ r: 4, fill: T.primary }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </SectionCard>

                  {/* Quick Actions */}
                  <SectionCard title="Quick Actions" sub="One-click shortcuts">
                    {quickActions.length === 0
                      ? <p style={{ color: T.outline, fontSize: 14 }}>No actions available.</p>
                      : quickActions.map((a) => {
                          const IconComponent = QA_ICONS[a.id] || HelpCircle;
                          return (
                            <button key={a.id} className="dash-qa-btn" style={css.qaBtn} onClick={() => navigate(a.href)}>
                              <span style={css.qaIcon}>
                                <IconComponent size={16} />
                              </span>
                              {a.label}
                              <span style={{ marginLeft: 'auto', color: T.outline, fontSize: 18 }}>›</span>
                            </button>
                          );
                        })}
                  </SectionCard>
                </div>

                {/* Bottom: Activities + Notifications */}
                <div style={css.bottomGrid}>
                  <SectionCard title="Recent Activities" sub="Latest operational events">
                    {filteredActivities.length === 0
                      ? <p style={{ color: T.outline, fontSize: 14 }}>No recent activity.</p>
                      : filteredActivities.map((a) => (
                        <div key={a.id} style={css.activityItem}>
                          <div style={css.activityDot} />
                          <div>
                            <p style={css.activityTitle}>{a.title}</p>
                            <p style={css.activityMsg}>{a.message}</p>
                            <p style={css.activityTime}>
                              {a.time ? new Date(a.time).toLocaleDateString() : 'Just now'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </SectionCard>

                  <SectionCard title="Notifications" sub="System & workflow alerts">
                    {filteredNotifications.length === 0
                      ? <p style={{ color: T.outline, fontSize: 14 }}>No notifications.</p>
                      : filteredNotifications.map((n) => (
                        <div key={n.id} style={{
                          ...css.notifItem,
                          borderLeftColor: n.category === 'Alert' ? T.error
                            : n.category === 'Success' ? T.tertiary : T.primaryContainer,
                        }}>
                          <p style={css.notifCategory}>{n.category}</p>
                          <h4 style={css.notifTitle}>{n.title}</h4>
                          <p style={css.notifMsg}>{n.message}</p>
                        </div>
                      ))}
                  </SectionCard>
                </div>

                {/* Vendor Breakdown Pie */}
                <div style={css.pieSection}>
                  <SectionCard title="Vendor Performance Overview" sub="Breakdown of supplier quality and reliability">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={vendorPerformance.slice(0, 4)}
                          dataKey="score" nameKey="name"
                          innerRadius={75} outerRadius={120}
                          paddingAngle={4} strokeWidth={0}
                        >
                          {vendorPerformance.slice(0, 4).map((_, i) => (
                            <Cell key={i} fill={chartColors[i % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </SectionCard>
                </div>
              </>
            )}
      </EnterpriseErpLayout>
    </>
  );
};

export default DashboardPage;