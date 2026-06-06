import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab: 'config' | 'audit'
  const [activeTab, setActiveTab] = useState('config');

  // States
  const [settings, setSettings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [newConfig, setNewConfig] = useState({
    category: 'General',
    key: '',
    value: ''
  });

  // Test Email SMTP State
  const [testEmail, setTestEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchSettingsData();
  }, [user, activeTab]);

  const fetchSettingsData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'config') {
        const res = await erpApi.settings.getAll();
        setSettings(res.data || []);
      } else {
        const res = await erpApi.settings.auditLogs();
        setAuditLogs(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch settings parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      // Parse JSON if possible to support complex configurations
      let parsedValue = newConfig.value;
      try {
        parsedValue = JSON.parse(newConfig.value);
      } catch (e) {
        // Keep as string
      }

      await erpApi.settings.update({
        category: newConfig.category,
        key: newConfig.key,
        value: parsedValue
      });

      setSuccess(`Setting configuration '${newConfig.key}' saved successfully`);
      setNewConfig({ category: 'General', key: '', value: '' });
      fetchSettingsData();
    } catch (err) {
      setError(err.message || 'Failed to save configuration settings');
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSendingEmail(true);
    try {
      await erpApi.settings.testEmail({ email: testEmail });
      setSuccess(`SMTP verification test email sent to ${testEmail}`);
      setTestEmail('');
    } catch (err) {
      setError(err.message || 'Failed to dispatch test mail through SMTP server');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleNavigate = (item) => {
    if (item.id === 'dashboard') {
      navigate('/dashboard');
    } else {
      navigate(`/${item.id}`);
    }
  };

  return (
    <EnterpriseErpLayout
      user={user}
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
    >
      <div className="erp-breadcrumbs">
        <span className="erp-breadcrumbs__item">ERP Dashboard</span>
        <span className="erp-breadcrumbs__separator">/</span>
        <span className="erp-breadcrumbs__current">System Settings</span>
      </div>

      <div className="erp-content">
        {error && <div className="erp-alert erp-alert--danger">{error}</div>}
        {success && <div className="erp-alert erp-alert--success">{success}</div>}

        {/* TABS */}
        <div className="erp-tabs">
          <button 
            className={`erp-tab ${activeTab === 'config' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('config'); }}
          >
            App Configuration
          </button>
          <button 
            className={`erp-tab ${activeTab === 'audit' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('audit'); }}
          >
            Security & Audit Logs
          </button>
        </div>

        {/* APP CONFIGURATION VIEW */}
        {activeTab === 'config' && (
          <div className="erp-grid-2" style={{ alignItems: 'start' }}>
            {/* System config listing */}
            <section className="erp-card">
              <div className="erp-card__header">
                <div>
                  <h3 className="erp-card__title">App Configurations</h3>
                  <p className="erp-card__subtitle">Variables and system keys saved in the parameters store.</p>
                </div>
              </div>
              <div className="erp-card__body">
                {loading ? (
                  <p style={{ color: 'var(--erp-text-muted)' }}>Loading parameters...</p>
                ) : settings.length === 0 ? (
                  <p style={{ color: 'var(--erp-text-muted)' }}>No configurations set yet. Use the right form to add keys.</p>
                ) : (
                  <div className="erp-table-wrapper">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Key</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settings.map((s, idx) => (
                          <tr key={idx}>
                            <td><span className="erp-badge erp-badge--info">{s.category}</span></td>
                            <td><strong>{s.key}</strong></td>
                            <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                              {typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Set settings form */}
            <div style={{ display: 'grid', gap: '20px' }}>
              <section className="erp-card">
                <div className="erp-card__header">
                  <h3 className="erp-card__title">Update System Parameters</h3>
                </div>
                <div className="erp-card__body">
                  <form className="erp-form" onSubmit={handleUpdateSetting}>
                    <div className="erp-form-group">
                      <label className="erp-label">Category Group</label>
                      <select 
                        className="erp-select"
                        value={newConfig.category} 
                        onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                      >
                        <option value="General">General App Settings</option>
                        <option value="Email">Email SMTP Settings</option>
                        <option value="Finance">Finance Tolerance Settings</option>
                        <option value="Security">Security Policies</option>
                      </select>
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Config key</label>
                      <input 
                        type="text" 
                        className="erp-input"
                        placeholder="e.g. TAX_PERCENT"
                        value={newConfig.key} 
                        onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                        required
                      />
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Value (JSON or String)</label>
                      <textarea 
                        className="erp-textarea"
                        placeholder="e.g. 18 or { 'active': true }"
                        value={newConfig.value} 
                        onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                        required
                      />
                    </div>

                    <button type="submit" className="erp-btn erp-btn--primary">
                      Save Variable
                    </button>
                  </form>
                </div>
              </section>

              {/* SMTP test email */}
              <section className="erp-card">
                <div className="erp-card__header">
                  <h3 className="erp-card__title">Test SMTP Email</h3>
                  <p className="erp-card__subtitle">Validate SMTP server configurations by sending a test dispatch.</p>
                </div>
                <div className="erp-card__body">
                  <form className="erp-form" onSubmit={handleSendTestEmail}>
                    <div className="erp-form-group">
                      <label className="erp-label">Recipient Address</label>
                      <input 
                        type="email" 
                        className="erp-input"
                        placeholder="admin@enterprise.com"
                        value={testEmail} 
                        onChange={(e) => setTestEmail(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="erp-btn erp-btn--outline" disabled={sendingEmail}>
                      {sendingEmail ? 'Sending...' : 'Send Test Email'}
                    </button>
                  </form>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* SECURITY AUDIT LOGS VIEW */}
        {activeTab === 'audit' && (
          <section className="erp-card">
            <div className="erp-card__header">
              <div>
                <h3 className="erp-card__title">Security Access Log</h3>
                <p className="erp-card__subtitle">Immutable records of API calls, route triggers, and IP addresses.</p>
              </div>
            </div>
            <div className="erp-card__body">
              {loading ? (
                <p style={{ color: 'var(--erp-text-muted)' }}>Loading audit log...</p>
              ) : auditLogs.length === 0 ? (
                <p style={{ color: 'var(--erp-text-muted)' }}>No audit events logged yet.</p>
              ) : (
                <div className="erp-table-wrapper">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Module</th>
                        <th>User ID</th>
                        <th>Client IP</th>
                        <th>Event Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td><strong>{log.action}</strong></td>
                          <td><span className="erp-badge erp-badge--info">{log.module}</span></td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--erp-text-muted)' }}>{log.user_id}</td>
                          <td>{log.ip_address || '127.0.0.1'}</td>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </EnterpriseErpLayout>
  );
};

export default SettingsPage;
