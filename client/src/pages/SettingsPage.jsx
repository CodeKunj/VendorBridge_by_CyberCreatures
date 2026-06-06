import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  Building2, 
  Mail, 
  FileText, 
  Receipt, 
  Bell, 
  Workflow, 
  Key, 
  Bot,
  ShieldAlert, 
  Settings,
  AlertCircle, 
  Check,
  Send
} from 'lucide-react';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate(user.role === 'vendor' ? '/vendor-portal' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Primary Tabs: 'config' | 'audit'
  const [activeTab, setActiveTab] = useState('config');
  // Config Section Tabs
  const [activeConfigSection, setActiveConfigSection] = useState('company');

  // Load States
  const [settings, setSettings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Structured Config Form Fields
  const [formData, setFormData] = useState({
    company_name: '',
    company_gstin: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',

    template_rfq_subject: 'New Request for Quotation: {rfq_number}',
    template_rfq_body: 'Dear Supplier,\n\nYou have been invited to submit a quotation for {rfq_title}.\nPlease submit your bid before the deadline: {deadline}.\n\nBest regards,\nProcurement Team',
    template_po_subject: 'Purchase Order Issued: {po_number}',
    template_po_body: 'Dear Partner,\n\nPlease find attached the official Purchase Order {po_number} for total amount {total_amount}.\n\nBest regards,\nProcurement Manager',

    invoice_tax_percentage: '18',
    invoice_due_days: '30',
    invoice_prefix: 'INV-',

    notifications_enable_email: true,
    notifications_enable_sms: false,
    notifications_enable_push: true,

    workflow_po_auto_approve_threshold: '5000',
    workflow_require_multilevel_approvals: false,

    openai_api_key: '',
    gemini_api_key: '',
    whatsapp_api_key: '',
    sms_gateway_api_key: '',

    ai_enabled: true,
    ai_model: 'gemini-2.0-flash',
    ai_temperature: '0.4',
    ai_max_tokens: '1024',
  });

  // SMTP Verification Address
  const [testEmail, setTestEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchSettings = async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'config') {
        const res = await erpApi.settings.getAll();
        const settingsArray = res.data || [];
        setSettings(settingsArray);

        // Map database key-values onto our form state
        const dbFields = {};
        settingsArray.forEach(item => {
          dbFields[item.key] = item.value;
        });

        setFormData(prev => ({
          ...prev,
          ...dbFields
        }));
      } else {
        const res = await erpApi.settings.auditLogs();
        setAuditLogs(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch settings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user, activeTab]);

  const handleFieldChange = (key, val) => {
    setFormData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSaveSection = async (sectionKeys, sectionLabel) => {
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      let category = 'General';
      if (activeConfigSection === 'smtp' || activeConfigSection === 'templates') category = 'Email';
      else if (activeConfigSection === 'invoice') category = 'Finance';
      else if (activeConfigSection === 'workflow') category = 'Workflow';
      else if (activeConfigSection === 'apis' || activeConfigSection === 'ai') category = 'Security';

      await Promise.all(
        sectionKeys.map(key => {
          return erpApi.settings.update({
            category,
            key,
            value: formData[key]
          });
        })
      );

      setSuccess(`${sectionLabel} configurations saved successfully.`);
      fetchSettings();
    } catch (err) {
      setError(err.message || 'Failed to save settings variables.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSendingEmail(true);
    try {
      await erpApi.settings.testEmail({ email: testEmail });
      setSuccess(`SMTP verification test email successfully sent to ${testEmail}`);
      setTestEmail('');
    } catch (err) {
      setError(err.message || 'SMTP Server failed to dispatch test mail.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <span className="erp-spinner" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return null;
  }

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="settings"
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
    >
      <div className="erp-content">
        <h1 className="erp-title">System & Administrative Settings</h1>
        <p className="erp-subtitle">Manage company profiles, SMTP mail dispatchers, threshold workflows, audit lists, and secure API keys.</p>

        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}
        {success && <div className="erp-alert erp-alert--success"><Check size={15} /> {success}</div>}

        {/* Tabs */}
        <div className="erp-tabs" style={{ marginBottom: '20px' }}>
          <button 
            className={`erp-tab ${activeTab === 'config' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('config'); setSuccess(''); }}
          >
            <Settings size={14} /> App Settings
          </button>
          <button 
            className={`erp-tab ${activeTab === 'audit' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('audit'); setSuccess(''); }}
          >
            <ShieldAlert size={14} /> Security Audit Logs
          </button>
        </div>

        {loading && settings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--erp-outline)' }}>
            Loading parameters...
          </div>
        )}

        {/* App Configuration Tab layout */}
        {activeTab === 'config' && !loading && (
          <div className="erp-settings-layout">
            {/* Side Menu inside Card */}
            <div className="erp-card" style={{ padding: '8px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
                {[
                  { id: 'company', label: 'Company Details', icon: Building2 },
                  { id: 'smtp', label: 'SMTP Server', icon: Mail },
                  { id: 'templates', label: 'Email Templates', icon: FileText },
                  { id: 'invoice', label: 'Invoice Config', icon: Receipt },
                  { id: 'notifications', label: 'Alerts Settings', icon: Bell },
                  { id: 'workflow', label: 'Workflows', icon: Workflow },
                  { id: 'ai', label: 'AI Assistant', icon: Bot },
                  { id: 'apis', label: 'API Integrations', icon: Key }
                ].map(sec => {
                  const Icon = sec.icon;
                  return (
                    <li key={sec.id}>
                      <button
                        onClick={() => { setActiveConfigSection(sec.id); setSuccess(''); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 0,
                          background: activeConfigSection === sec.id ? 'var(--erp-surface-container)' : 'transparent',
                          color: activeConfigSection === sec.id ? 'var(--erp-primary)' : 'var(--erp-on-surface-variant)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          fontWeight: activeConfigSection === sec.id ? '600' : '500',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Icon size={16} />
                        {sec.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Form Content Area */}
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Company Details Form */}
              {activeConfigSection === 'company' && (
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Company Profile & Branding</h3>
                    <p className="erp-card__subtitle">Default details injected into POs and Invoices.</p>
                  </div>
                  <div className="erp-card__body" style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Corporate Registered Name</label>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={formData.company_name} 
                          onChange={(e) => handleFieldChange('company_name', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">GSTIN / Tax Reference</label>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={formData.company_gstin} 
                          onChange={(e) => handleFieldChange('company_gstin', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="erp-form-group" style={{ margin: 0 }}>
                      <label className="erp-label">Head Office Address</label>
                      <textarea 
                        className="erp-textarea" 
                        value={formData.company_address} 
                        onChange={(e) => handleFieldChange('company_address', e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Official Accounts Email</label>
                        <input 
                          type="email" 
                          className="erp-input" 
                          value={formData.company_email} 
                          onChange={(e) => handleFieldChange('company_email', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Corporate Contact Line</label>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={formData.company_phone} 
                          onChange={(e) => handleFieldChange('company_phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <button 
                      className="erp-btn erp-btn--primary" 
                      style={{ width: 'fit-content' }}
                      onClick={() => handleSaveSection(['company_name', 'company_gstin', 'company_address', 'company_email', 'company_phone'], 'Company Details')}
                    >
                      Save Company Profile
                    </button>
                  </div>
                </section>
              )}

              {/* SMTP Form */}
              {activeConfigSection === 'smtp' && (
                <>
                  <section className="erp-card">
                    <div className="erp-card__header">
                      <h3 className="erp-card__title">SMTP Mail Dispatch Configurations</h3>
                      <p className="erp-card__subtitle">Parameters used to send out RFQs, bidding invitations, POs, and Invoice approvals.</p>
                    </div>
                    <div className="erp-card__body" style={{ display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div className="erp-form-group" style={{ margin: 0 }}>
                          <label className="erp-label">SMTP Hostname</label>
                          <input 
                            type="text" 
                            className="erp-input" 
                            placeholder="smtp.mailgun.org"
                            value={formData.smtp_host} 
                            onChange={(e) => handleFieldChange('smtp_host', e.target.value)}
                          />
                        </div>
                        <div className="erp-form-group" style={{ margin: 0 }}>
                          <label className="erp-label">SMTP Port</label>
                          <input 
                            type="text" 
                            className="erp-input" 
                            placeholder="587"
                            value={formData.smtp_port} 
                            onChange={(e) => handleFieldChange('smtp_port', e.target.value)}
                          />
                        </div>
                        <div className="erp-form-group" style={{ margin: 0 }}>
                          <label className="erp-label">Sender Email (From)</label>
                          <input 
                            type="text" 
                            className="erp-input" 
                            placeholder="no-reply@enterprise.com"
                            value={formData.smtp_from_email} 
                            onChange={(e) => handleFieldChange('smtp_from_email', e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="erp-form-group" style={{ margin: 0 }}>
                          <label className="erp-label">SMTP Username</label>
                          <input 
                            type="text" 
                            className="erp-input" 
                            value={formData.smtp_username} 
                            onChange={(e) => handleFieldChange('smtp_username', e.target.value)}
                          />
                        </div>
                        <div className="erp-form-group" style={{ margin: 0 }}>
                          <label className="erp-label">SMTP Password</label>
                          <input 
                            type="password" 
                            className="erp-input" 
                            placeholder="••••••••••••••••"
                            value={formData.smtp_password} 
                            onChange={(e) => handleFieldChange('smtp_password', e.target.value)}
                          />
                        </div>
                      </div>
                      <button 
                        className="erp-btn erp-btn--primary" 
                        style={{ width: 'fit-content' }}
                        onClick={() => handleSaveSection(['smtp_host', 'smtp_port', 'smtp_from_email', 'smtp_username', 'smtp_password'], 'SMTP Mail Server')}
                      >
                        Save Mail Server Settings
                      </button>
                    </div>
                  </section>

                  {/* SMTP Test Card */}
                  <section className="erp-card">
                    <div className="erp-card__header">
                      <h3 className="erp-card__title">Test Mail Sender Integration</h3>
                      <p className="erp-card__subtitle">Send a secure verification test email utilizing the active transporter configs.</p>
                    </div>
                    <div className="erp-card__body">
                      <form onSubmit={handleSendTestEmail} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div className="erp-form-group" style={{ margin: 0, flexGrow: 1, maxWidth: '350px' }}>
                          <label className="erp-label">Recipient Email</label>
                          <input 
                            type="email" 
                            className="erp-input" 
                            placeholder="test-recipient@domain.com" 
                            value={testEmail} 
                            onChange={(e) => setTestEmail(e.target.value)} 
                            required
                          />
                        </div>
                        <button type="submit" className="erp-btn erp-btn--outline" disabled={sendingEmail} style={{ height: '38px' }}>
                          <Send size={14} /> {sendingEmail ? 'Sending...' : 'Send Test'}
                        </button>
                      </form>
                    </div>
                  </section>
                </>
              )}

              {/* Email Templates Form */}
              {activeConfigSection === 'templates' && (
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Custom Email Sourcing Templates</h3>
                    <p className="erp-card__subtitle">Tailor automated vendor communications and reminders.</p>
                  </div>
                  <div className="erp-card__body" style={{ display: 'grid', gap: '20px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 600 }}>Template: RFQ Invitation</h4>
                      <div className="erp-form-group">
                        <label className="erp-label">Email Subject</label>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={formData.template_rfq_subject} 
                          onChange={(e) => handleFieldChange('template_rfq_subject', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Email Body Content</label>
                        <textarea 
                          className="erp-textarea" 
                          value={formData.template_rfq_body} 
                          onChange={(e) => handleFieldChange('template_rfq_body', e.target.value)}
                          style={{ minHeight: '120px' }}
                        />
                      </div>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--erp-border)' }} />

                    <div>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 600 }}>Template: PO Dispatch Alert</h4>
                      <div className="erp-form-group">
                        <label className="erp-label">Email Subject</label>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={formData.template_po_subject} 
                          onChange={(e) => handleFieldChange('template_po_subject', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Email Body Content</label>
                        <textarea 
                          className="erp-textarea" 
                          value={formData.template_po_body} 
                          onChange={(e) => handleFieldChange('template_po_body', e.target.value)}
                          style={{ minHeight: '120px' }}
                        />
                      </div>
                    </div>

                    <button 
                      className="erp-btn erp-btn--primary" 
                      style={{ width: 'fit-content' }}
                      onClick={() => handleSaveSection(['template_rfq_subject', 'template_rfq_body', 'template_po_subject', 'template_po_body'], 'Email Templates')}
                    >
                      Save Email Templates
                    </button>
                  </div>
                </section>
              )}

              {/* Invoice Configuration Form */}
              {activeConfigSection === 'invoice' && (
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Billing & Invoice Parameters</h3>
                    <p className="erp-card__subtitle">Default rates, due cycles, and prefix masks.</p>
                  </div>
                  <div className="erp-card__body" style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Default Tax GST (%)</label>
                        <input 
                          type="number" 
                          className="erp-input" 
                          value={formData.invoice_tax_percentage} 
                          onChange={(e) => handleFieldChange('invoice_tax_percentage', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Default Due Period (Days)</label>
                        <input 
                          type="number" 
                          className="erp-input" 
                          value={formData.invoice_due_days} 
                          onChange={(e) => handleFieldChange('invoice_due_days', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Invoice Code Prefix</label>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={formData.invoice_prefix} 
                          onChange={(e) => handleFieldChange('invoice_prefix', e.target.value)}
                        />
                      </div>
                    </div>
                    <button 
                      className="erp-btn erp-btn--primary" 
                      style={{ width: 'fit-content' }}
                      onClick={() => handleSaveSection(['invoice_tax_percentage', 'invoice_due_days', 'invoice_prefix'], 'Invoice Settings')}
                    >
                      Save Invoice Configurations
                    </button>
                  </div>
                </section>
              )}

              {/* Notification Form */}
              {activeConfigSection === 'notifications' && (
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Global Notification Policies</h3>
                    <p className="erp-card__subtitle">Activate/deactivate dispatch channels for system triggers.</p>
                  </div>
                  <div className="erp-card__body" style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={Boolean(formData.notifications_enable_email)} 
                          onChange={(e) => handleFieldChange('notifications_enable_email', e.target.checked)}
                        />
                        <span>Enable SMTP transactional emails for RFQ/PO operations</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={Boolean(formData.notifications_enable_sms)} 
                          onChange={(e) => handleFieldChange('notifications_enable_sms', e.target.checked)}
                        />
                        <span>Enable SMS/WhatsApp transactional alerts on workflows</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={Boolean(formData.notifications_enable_push)} 
                          onChange={(e) => handleFieldChange('notifications_enable_push', e.target.checked)}
                        />
                        <span>Enable real-time notification sidebar updates for users</span>
                      </label>
                    </div>
                    <button 
                      className="erp-btn erp-btn--primary" 
                      style={{ width: 'fit-content' }}
                      onClick={() => handleSaveSection(['notifications_enable_email', 'notifications_enable_sms', 'notifications_enable_push'], 'Notification Settings')}
                    >
                      Save Notification Policies
                    </button>
                  </div>
                </section>
              )}

              {/* Workflow Form */}
              {activeConfigSection === 'workflow' && (
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Procurement Workflow Policies</h3>
                    <p className="erp-card__subtitle">Establish automatic validation thresholds and multilevel rules.</p>
                  </div>
                  <div className="erp-card__body" style={{ display: 'grid', gap: '16px' }}>
                    <div className="erp-form-group">
                      <label className="erp-label">Auto PO Approval Limit ($)</label>
                      <input 
                        type="number" 
                        className="erp-input" 
                        placeholder="5000"
                        value={formData.workflow_po_auto_approve_threshold} 
                        onChange={(e) => handleFieldChange('workflow_po_auto_approve_threshold', e.target.value)}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--erp-outline)' }}>POs generated under this amount are automatically approved. Higher amounts require manager oversight.</p>
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', marginTop: '10px' }}>
                        <input 
                          type="checkbox" 
                          checked={Boolean(formData.workflow_require_multilevel_approvals)} 
                          onChange={(e) => handleFieldChange('workflow_require_multilevel_approvals', e.target.checked)}
                        />
                        <span>Require multi-level board approvals for contract values exceeding $100k</span>
                      </label>
                    </div>

                    <button 
                      className="erp-btn erp-btn--primary" 
                      style={{ width: 'fit-content' }}
                      onClick={() => handleSaveSection(['workflow_po_auto_approve_threshold', 'workflow_require_multilevel_approvals'], 'Workflow Settings')}
                    >
                      Save Workflow Configurations
                    </button>
                  </div>
                </section>
              )}

              {/* AI Assistant Settings */}
              {activeConfigSection === 'ai' && (
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Procurement AI Assistant</h3>
                    <p className="erp-card__subtitle">Configure Gemini model, tokens, and enable the ERP copilot.</p>
                  </div>
                  <div className="erp-card__body" style={{ display: 'grid', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.ai_enabled)}
                        onChange={(e) => handleFieldChange('ai_enabled', e.target.checked)}
                      />
                      Enable AI Assistant for all ERP users
                    </label>

                    <div className="erp-form-group">
                      <label className="erp-label">Gemini API Key</label>
                      <input
                        type="password"
                        className="erp-input"
                        placeholder="AIzaSy••••••••••••"
                        value={formData.gemini_api_key}
                        onChange={(e) => handleFieldChange('gemini_api_key', e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">AI Model</label>
                        <input
                          type="text"
                          className="erp-input"
                          value={formData.ai_model}
                          onChange={(e) => handleFieldChange('ai_model', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Temperature</label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          className="erp-input"
                          value={formData.ai_temperature}
                          onChange={(e) => handleFieldChange('ai_temperature', e.target.value)}
                        />
                      </div>
                      <div className="erp-form-group" style={{ margin: 0 }}>
                        <label className="erp-label">Max Tokens</label>
                        <input
                          type="number"
                          min="256"
                          max="8192"
                          className="erp-input"
                          value={formData.ai_max_tokens}
                          onChange={(e) => handleFieldChange('ai_max_tokens', e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      className="erp-btn erp-btn--primary"
                      style={{ width: 'fit-content' }}
                      onClick={() => handleSaveSection(
                        ['ai_enabled', 'ai_model', 'ai_temperature', 'ai_max_tokens', 'gemini_api_key'],
                        'AI Assistant Settings',
                      )}
                    >
                      Save AI Configuration
                    </button>
                  </div>
                </section>
              )}

              {/* API Integrations Form */}
              {activeConfigSection === 'apis' && (
                <section className="erp-card">
                  <div className="erp-card__header">
                    <h3 className="erp-card__title">Secure API Gateway Integrations</h3>
                    <p className="erp-card__subtitle">Encrypted API credentials for LLMs and dispatch gateways.</p>
                  </div>
                  <div className="erp-card__body" style={{ display: 'grid', gap: '16px' }}>
                    <div className="erp-form-group">
                      <label className="erp-label">OpenAI API Key</label>
                      <input 
                        type="password" 
                        className="erp-input" 
                        placeholder="sk-••••••••••••••••"
                        value={formData.openai_api_key} 
                        onChange={(e) => handleFieldChange('openai_api_key', e.target.value)}
                      />
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Gemini AI API Key</label>
                      <input 
                        type="password" 
                        className="erp-input" 
                        placeholder="AIzaSy••••••••••••"
                        value={formData.gemini_api_key} 
                        onChange={(e) => handleFieldChange('gemini_api_key', e.target.value)}
                      />
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">WhatsApp Gateway Access Token</label>
                      <input 
                        type="password" 
                        className="erp-input" 
                        placeholder="EAAG••••••••••••"
                        value={formData.whatsapp_api_key} 
                        onChange={(e) => handleFieldChange('whatsapp_api_key', e.target.value)}
                      />
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">SMS Gateway API Credential</label>
                      <input 
                        type="password" 
                        className="erp-input" 
                        placeholder="SMS-KEY-••••••••••••"
                        value={formData.sms_gateway_api_key} 
                        onChange={(e) => handleFieldChange('sms_gateway_api_key', e.target.value)}
                      />
                    </div>

                    <button 
                      className="erp-btn erp-btn--primary" 
                      style={{ width: 'fit-content' }}
                      onClick={() => handleSaveSection(['openai_api_key', 'gemini_api_key', 'whatsapp_api_key', 'sms_gateway_api_key'], 'API Keys')}
                    >
                      Encrypt & Save API Credentials
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Security Audit Log View */}
        {activeTab === 'audit' && (
          <section className="erp-card">
            <div className="erp-card__header">
              <h3 className="erp-card__title">Administrative Activity Access Log</h3>
              <p className="erp-card__subtitle">Immutable records of login attempts, settings updates, and critical modifications.</p>
            </div>
            <div className="erp-card__body" style={{ padding: 0 }}>
              {auditLogs.length === 0 ? (
                <p style={{ color: 'var(--erp-outline)', padding: '20px', textAlign: 'center' }}>No audit events logged.</p>
              ) : (
                <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Admin User</th>
                        <th>Action Details</th>
                        <th>Target Module</th>
                        <th>Client IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                          <td style={{ fontWeight: 600 }}>{log.users?.name || 'Admin User'}</td>
                          <td>{log.action}</td>
                          <td><span className="erp-badge erp-badge--draft">{log.module}</span></td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.ip_address || '127.0.0.1'}</td>
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
