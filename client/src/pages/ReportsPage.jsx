import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
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

const chartColors = ['#1f4f86', '#2d6bb3', '#5a8fcd', '#8eb4e8', '#c2daf8'];

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

  // Authorized binary document downloads
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
    navigate(`/${item.id}`);
  };

  return (
    <EnterpriseErpLayout
      activeNavId="reports"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reports & Business Intelligence' }
      ]}
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
    >
      <div className="erp-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="erp-page-title">Reports & Analytics</h1>
          <p className="erp-page-subtitle">Examine corporate procurement trends, capital expenditure analysis, and supplier performance metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="erp-button erp-button--secondary" 
            onClick={() => handleExport(activeTab, 'xlsx')}
            disabled={loading}
          >
            📊 Export Excel
          </button>
          <button 
            className="erp-button" 
            onClick={() => handleExport(activeTab, 'pdf')}
            disabled={loading}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {error && <div className="erp-alert erp-alert--danger" style={{ margin: '10px 0' }}>⚠️ {error}</div>}
      {success && <div className="erp-alert erp-alert--success" style={{ margin: '10px 0' }}>✅ {success}</div>}

      {/* Tabs */}
      <div className="erp-tabs" style={{ marginBottom: '20px' }}>
        <button 
          className={`erp-tab ${activeTab === 'spending' ? 'is-active' : ''}`} 
          onClick={() => { setActiveTab('spending'); setSuccess(''); }}
        >
          Spending & Expenditure
        </button>
        <button 
          className={`erp-tab ${activeTab === 'performance' ? 'is-active' : ''}`} 
          onClick={() => { setActiveTab('performance'); setSuccess(''); }}
        >
          Vendor Performance Matrix
        </button>
        <button 
          className={`erp-tab ${activeTab === 'procurement' ? 'is-active' : ''}`} 
          onClick={() => { setActiveTab('procurement'); setSuccess(''); }}
        >
          Procurement Statistics
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <span className="erp-spinner" />
          <p style={{ marginTop: '16px', color: 'var(--erp-text-muted)' }}>Loading analytics calculations...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Spending Analysis */}
          {activeTab === 'spending' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="erp-grid-3">
                <article className="erp-card">
                  <div className="erp-card__body">
                    <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Total Capital Spend</p>
                    <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-blue-900)' }}>
                      ${spendingData.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </h3>
                    <p className="erp-card__subtitle">Sum of active Purchase Orders</p>
                  </div>
                </article>

                <article className="erp-card">
                  <div className="erp-card__body">
                    <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Active POs Count</p>
                    <h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>
                      {spendingData.allPOs?.length || 0}
                    </h3>
                    <p className="erp-card__subtitle">Excludes draft or cancelled POs</p>
                  </div>
                </article>

                <article className="erp-card">
                  <div className="erp-card__body">
                    <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Average PO Value</p>
                    <h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>
                      ${spendingData.allPOs?.length > 0 
                        ? (spendingData.totalSpend / spendingData.allPOs.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                        : '0'}
                    </h3>
                    <p className="erp-card__subtitle">Mean transaction cost</p>
                  </div>
                </article>
              </div>

              <div className="erp-grid-2">
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Monthly Spending Trend</h3>
                    <p className="erp-card__subtitle">Capital outflow timeline</p>
                  </div>
                  <div className="erp-card__body">
                    <div style={{ width: '100%', height: 300 }}>
                      {spendingData.monthlyTrend?.length === 0 ? (
                        <p style={{ color: 'var(--erp-text-muted)', textAlign: 'center', paddingTop: '100px' }}>No monthly data available</p>
                      ) : (
                        <ResponsiveContainer>
                          <AreaChart data={spendingData.monthlyTrend}>
                            <defs>
                              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1f4f86" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#1f4f86" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                            <Area type="monotone" dataKey="amount" stroke="#1f4f86" strokeWidth={2} fillOpacity={1} fill="url(#spendGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </section>

                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Expenditure by Vendor</h3>
                    <p className="erp-card__subtitle">Distribution of PO value across suppliers</p>
                  </div>
                  <div className="erp-card__body">
                    <div style={{ width: '100%', height: 300 }}>
                      {spendingData.vendorSpending?.length === 0 ? (
                        <p style={{ color: 'var(--erp-text-muted)', textAlign: 'center', paddingTop: '100px' }}>No vendor spending logged</p>
                      ) : (
                        <ResponsiveContainer>
                          <BarChart data={spendingData.vendorSpending.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                            <Bar dataKey="amount" fill="#2d6bb3" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB 2: Vendor Performance */}
          {activeTab === 'performance' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <section className="erp-card">
                <div className="erp-card__header">
                  <div>
                    <h3 className="erp-card__title">Vendor Scorecard Matrix</h3>
                    <p className="erp-card__subtitle">Calculated based on bid participation, win rates, and average delivery speeds.</p>
                  </div>
                </div>
                <div className="erp-card__body" style={{ padding: 0 }}>
                  {vendorPerfData.length === 0 ? (
                    <p style={{ color: 'var(--erp-text-muted)', padding: '20px' }}>No vendor metrics calculated.</p>
                  ) : (
                    <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
                      <table className="erp-table">
                        <thead>
                          <tr>
                            <th>Supplier Name</th>
                            <th>Code</th>
                            <th style={{ textAlign: 'center' }}>Participation</th>
                            <th style={{ textAlign: 'center' }}>Win Rate</th>
                            <th style={{ textAlign: 'center' }}>Avg Delivery Speed</th>
                            <th>Total Spend ($)</th>
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
                                  <span style={{ minWidth: '35px' }}>{v.participationRate}%</span>
                                  <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${v.participationRate}%`, height: '100%', background: '#1f4f86' }} />
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                  <span style={{ minWidth: '35px' }}>{v.winRate}%</span>
                                  <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${v.winRate}%`, height: '100%', background: '#10b981' }} />
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 500 }}>
                                {v.avgDeliveryDays > 0 ? `${v.avgDeliveryDays} days` : 'N/A'}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                ${v.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span 
                                  className="erp-badge" 
                                  style={{
                                    background: v.score >= 80 ? '#dcfce7' : v.score >= 50 ? '#fef9c3' : '#fee2e2',
                                    color: v.score >= 80 ? '#15803d' : v.score >= 50 ? '#a16207' : '#b91c1c',
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

          {/* TAB 3: Procurement Statistics */}
          {activeTab === 'procurement' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="erp-grid-3">
                <article className="erp-card">
                  <div className="erp-card__body">
                    <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Total Sourcing Campaigns (RFQs)</p>
                    <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-blue-900)' }}>
                      {procurementData.totalRfqs || 0}
                    </h3>
                    <p className="erp-card__subtitle">Created RFQ events</p>
                  </div>
                </article>

                <article className="erp-card">
                  <div className="erp-card__body">
                    <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Average Bids Per RFQ</p>
                    <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: '#10b981' }}>
                      {procurementData.avgBidsPerRfq || 0}
                    </h3>
                    <p className="erp-card__subtitle">Supplier bidding density</p>
                  </div>
                </article>

                <article className="erp-card">
                  <div className="erp-card__body">
                    <p className="erp-card__subtitle" style={{ marginTop: 0 }}>RFQ to PO Conversion Rate</p>
                    <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: '#a16207' }}>
                      {procurementData.poConversionRate || 0}%
                    </h3>
                    <p className="erp-card__subtitle">Percentage of RFQs leading to POs</p>
                  </div>
                </article>
              </div>

              <section className="erp-card">
                <div className="erp-card__header">
                  <h3 className="erp-card__title">RFQ Campaigns Status Breakdown</h3>
                  <p className="erp-card__subtitle">Distribution of sourcing events by state</p>
                </div>
                <div className="erp-card__body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '100%', maxWidth: '400px', height: 250 }}>
                    {Object.keys(procurementData.statusCounts || {}).length === 0 ? (
                      <p style={{ color: 'var(--erp-text-muted)', textAlign: 'center', paddingTop: '80px' }}>No statistics logged</p>
                    ) : (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={Object.entries(procurementData.statusCounts).map(([key, val]) => ({ name: key.toUpperCase(), value: val }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
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
