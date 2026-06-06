import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  Check, 
  FileText,
  PieChart as PieChartIcon
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const chartColors = ['#264dd9', '#6647c3', '#006a38', '#4568f3', '#9c7ffd'];

const ReportsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('spending'); // 'spending' | 'performance' | 'procurement'

  // Live analytics data from backend APIs
  const [spendingData, setSpendingData] = useState({ totalSpend: 0, vendorSpending: [], monthlyTrend: [], allPOs: [] });
  const [vendorPerfData, setVendorPerfData] = useState([]);
  const [procurementData, setProcurementData] = useState({ totalRfqs: 0, totalBids: 0, totalItems: 0, avgBidsPerRfq: 0, poConversionRate: 0, statusCounts: {} });

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [spendRes, vendorRes, rfqRes] = await Promise.all([
        erpApi.reports.spending(),
        erpApi.reports.vendorPerformance(),
        erpApi.reports.rfqStatistics()
      ]);

      if (spendRes && spendRes.data) setSpendingData(spendRes.data);
      if (vendorRes && vendorRes.data) setVendorPerfData(vendorRes.data);
      if (rfqRes && rfqRes.data) setProcurementData(rfqRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load reports and analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleExport = async (type, format) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('vendorbridge.accessToken');
      const response = await fetch(`http://localhost:5000/api/reports/export?type=${type}&format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Could not generate document export on the server.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type}_report_${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setSuccess(`Successfully exported ${type.toUpperCase()} report as ${format.toUpperCase()}!`);
    } catch (err) {
      setError(err.message || 'Failed to download report.');
    }
  };

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Reports & Analytics' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="reports"
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
        <div className="erp-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 className="erp-title">Reports & Analytics</h1>
            <p className="erp-subtitle">Examine corporate procurement trends, capital expenditure analysis, and supplier performance metrics.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="erp-btn erp-btn--outline" 
              onClick={() => handleExport(activeTab, 'xlsx')}
              disabled={loading}
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>
            <button 
              className="erp-btn erp-btn--primary" 
              onClick={() => handleExport(activeTab, 'pdf')}
              disabled={loading}
            >
              <Download size={15} /> Export PDF
            </button>
          </div>
        </div>

        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}
        {success && <div className="erp-alert erp-alert--success"><Check size={15} /> {success}</div>}

        {/* Tabs */}
        <div className="erp-tabs" style={{ marginBottom: '20px' }}>
          <button 
            className={`erp-tab ${activeTab === 'spending' ? 'is-active' : ''}`} 
            onClick={() => { setActiveTab('spending'); setSuccess(''); }}
          >
            <TrendingUp size={14} /> Spending & Expenditure
          </button>
          <button 
            className={`erp-tab ${activeTab === 'performance' ? 'is-active' : ''}`} 
            onClick={() => { setActiveTab('performance'); setSuccess(''); }}
          >
            <Award size={14} /> Supplier Performance
          </button>
          <button 
            className={`erp-tab ${activeTab === 'procurement' ? 'is-active' : ''}`} 
            onClick={() => { setActiveTab('procurement'); setSuccess(''); }}
          >
            <BarChart3 size={14} /> Procurement Stats
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--erp-outline)' }}>
            Loading analytics calculations...
          </div>
        ) : (
          <>
            {/* Spending Tab */}
            {activeTab === 'spending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="erp-grid-3">
                  <article className="erp-card">
                    <div className="erp-card__body">
                      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Total Capital Spend</p>
                      <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-primary)', fontWeight: 700 }}>
                        {formatCurrency(spendingData.totalSpend)}
                      </h3>
                      <p className="erp-card__subtitle" style={{ fontSize: '0.8rem' }}>Sum of active Purchase Orders</p>
                    </div>
                  </article>

                  <article className="erp-card">
                    <div className="erp-card__body">
                      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Active POs Count</p>
                      <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-on-surface)', fontWeight: 700 }}>
                        {spendingData.allPOs?.length || 0}
                      </h3>
                      <p className="erp-card__subtitle" style={{ fontSize: '0.8rem' }}>Excludes draft or cancelled POs</p>
                    </div>
                  </article>

                  <article className="erp-card">
                    <div className="erp-card__body">
                      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Average PO Value</p>
                      <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-on-surface)', fontWeight: 700 }}>
                        {spendingData.allPOs?.length > 0 
                          ? formatCurrency(spendingData.totalSpend / spendingData.allPOs.length) 
                          : formatCurrency(0)}
                      </h3>
                      <p className="erp-card__subtitle" style={{ fontSize: '0.8rem' }}>Mean transaction cost</p>
                    </div>
                  </article>
                </div>

                <div className="erp-grid-2">
                  <section className="erp-card">
                    <div className="erp-card__header">
                      <h3 className="erp-card__title">Monthly Outflow Trend</h3>
                    </div>
                    <div className="erp-card__body">
                      <div style={{ width: '100%', height: 300 }}>
                        {spendingData.monthlyTrend?.length === 0 ? (
                          <p style={{ color: 'var(--erp-outline)', textAlign: 'center', paddingTop: '100px' }}>No monthly data logged</p>
                        ) : (
                          <ResponsiveContainer>
                            <AreaChart data={spendingData.monthlyTrend}>
                              <defs>
                                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--erp-primary)" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="var(--erp-primary)" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-outline-variant)" vertical={false} />
                              <XAxis dataKey="month" stroke="var(--erp-outline)" style={{ fontSize: '0.75rem' }} />
                              <YAxis stroke="var(--erp-outline)" style={{ fontSize: '0.75rem' }} />
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                              <Area type="monotone" dataKey="amount" stroke="var(--erp-primary)" strokeWidth={2} fillOpacity={1} fill="url(#spendGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="erp-card">
                    <div className="erp-card__header">
                      <h3 className="erp-card__title">Expenditure by Supplier</h3>
                    </div>
                    <div className="erp-card__body">
                      <div style={{ width: '100%', height: 300 }}>
                        {spendingData.vendorSpending?.length === 0 ? (
                          <p style={{ color: 'var(--erp-outline)', textAlign: 'center', paddingTop: '100px' }}>No vendor records logged</p>
                        ) : (
                          <ResponsiveContainer>
                            <BarChart data={spendingData.vendorSpending.slice(0, 5)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-outline-variant)" vertical={false} />
                              <XAxis dataKey="name" stroke="var(--erp-outline)" style={{ fontSize: '0.75rem' }} />
                              <YAxis stroke="var(--erp-outline)" style={{ fontSize: '0.75rem' }} />
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                              <Bar dataKey="amount" fill="var(--erp-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* Vendor Performance Tab */}
            {activeTab === 'performance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Supplier Performance Index</h3>
                    <p className="erp-card__subtitle">Calculated based on bid response rates, tender win rates, and delivery speeds.</p>
                  </div>
                  <div className="erp-card__body" style={{ padding: 0 }}>
                    {vendorPerfData.length === 0 ? (
                      <p style={{ color: 'var(--erp-outline)', padding: '20px' }}>No performance index calculated.</p>
                    ) : (
                      <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
                        <table className="erp-table">
                          <thead>
                            <tr>
                              <th>Supplier Name</th>
                              <th>Vendor Code</th>
                              <th style={{ textAlign: 'center' }}>Participation</th>
                              <th style={{ textAlign: 'center' }}>Win Rate</th>
                              <th style={{ textAlign: 'center' }}>Delivery Speed</th>
                              <th>Total Spend</th>
                              <th style={{ textAlign: 'right' }}>Performance Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorPerfData.map(v => (
                              <tr key={v.id}>
                                <td style={{ fontWeight: 600 }}>{v.name}</td>
                                <td><span className="erp-badge erp-badge--draft">{v.code}</span></td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <span style={{ minWidth: '35px', fontSize: '0.82rem' }}>{v.participationRate}%</span>
                                    <div style={{ width: '60px', height: '6px', background: 'var(--erp-surface-container-high)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${v.participationRate}%`, height: '100%', background: 'var(--erp-primary)' }} />
                                    </div>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <span style={{ minWidth: '35px', fontSize: '0.82rem' }}>{v.winRate}%</span>
                                    <div style={{ width: '60px', height: '6px', background: 'var(--erp-surface-container-high)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${v.winRate}%`, height: '100%', background: 'var(--erp-success)' }} />
                                    </div>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 500, fontSize: '0.82rem' }}>
                                  {v.avgDeliveryDays > 0 ? `${v.avgDeliveryDays} days` : 'N/A'}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {formatCurrency(v.totalSpend)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span 
                                    className="erp-badge" 
                                    style={{
                                      background: v.score >= 80 ? 'var(--erp-success-container)' : v.score >= 50 ? 'var(--erp-warning-container)' : '#fee2e2',
                                      color: v.score >= 80 ? 'var(--erp-success)' : v.score >= 50 ? 'var(--erp-warning)' : '#b91c1c',
                                      fontWeight: '800'
                                    }}
                                  >
                                    {v.score} / 100
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Procurement Stats Tab */}
            {activeTab === 'procurement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="erp-grid-3">
                  <article className="erp-card">
                    <div className="erp-card__body">
                      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Sourcing Events (RFQs)</p>
                      <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-primary)', fontWeight: 700 }}>
                        {procurementData.totalRfqs || 0}
                      </h3>
                      <p className="erp-card__subtitle" style={{ fontSize: '0.8rem' }}>Total active RFQ events</p>
                    </div>
                  </article>

                  <article className="erp-card">
                    <div className="erp-card__body">
                      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Bids Density</p>
                      <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-success)', fontWeight: 700 }}>
                        {procurementData.avgBidsPerRfq || 0}
                      </h3>
                      <p className="erp-card__subtitle" style={{ fontSize: '0.8rem' }}>Average bid proposals per RFQ</p>
                    </div>
                  </article>

                  <article className="erp-card">
                    <div className="erp-card__body">
                      <p className="erp-card__subtitle" style={{ marginTop: 0 }}>PO Conversion Rate</p>
                      <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-secondary)', fontWeight: 700 }}>
                        {procurementData.poConversionRate || 0}%
                      </h3>
                      <p className="erp-card__subtitle" style={{ fontSize: '0.8rem' }}>Percentage of RFQs leading to PO releases</p>
                    </div>
                  </article>
                </div>

                <section className="erp-card" style={{ width: '100%' }}>
                  <div className="erp-card__header">
                    <h3 className="erp-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PieChartIcon size={18} /> RFQ Status Distribution
                    </h3>
                  </div>
                  <div className="erp-card__body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
                    <div style={{ width: '100%', maxWidth: '400px', height: 260 }}>
                      {Object.keys(procurementData.statusCounts || {}).length === 0 ? (
                        <p style={{ color: 'var(--erp-outline)', textAlign: 'center', paddingTop: '80px' }}>No status logs found</p>
                      ) : (
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={Object.entries(procurementData.statusCounts).map(([key, val]) => ({ name: key.toUpperCase(), value: val }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {Object.keys(procurementData.statusCounts).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
    </EnterpriseErpLayout>
  );
};

export default ReportsPage;
