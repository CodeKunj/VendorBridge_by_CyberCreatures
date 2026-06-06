import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { formatCurrency } from '../utils/currency';

const ApprovalWorkflowPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [approvals, setApprovals] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected details
  const [selectedApp, setSelectedApp] = useState(null);

  // Decision state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState('approved'); // approved or rejected
  const [remarks, setRemarks] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, [user]);

  const loadApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await erpApi.approvals.list({ limit: 100 });
      setApprovals(res.data || []);
      
      const histRes = await erpApi.approvals.history();
      setHistory(histRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load approvals workflow');
    } finally {
      setLoading(false);
    }
  };

  const openDecisionModal = (app, type) => {
    setSelectedApp(app);
    setDecisionType(type);
    setRemarks('');
    setDecisionModalOpen(true);
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSubmittingDecision(true);
    setError('');
    setSuccess('');
    try {
      await erpApi.approvals.decide({
        id: selectedApp.id,
        status: decisionType,
        comments: remarks
      });
      setSuccess(`Workflow request successfully ${decisionType}!`);
      setDecisionModalOpen(false);
      setSelectedApp(null);
      await loadApprovals();
    } catch (err) {
      setError(err.message || 'Failed to submit workflow decision');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleNavigate = (item) => {
    if (item.id === 'dashboard') {
      navigate('/dashboard');
    } else {
      navigate(`/${item.id}`);
    }
  };

  // Helper to render Timeline
  const renderTimeline = (timelineSteps) => {
    if (!timelineSteps) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px', margin: '20px 0' }}>
        {/* Vertical Line */}
        <div 
          style={{ 
            position: 'absolute', 
            left: '8px', 
            top: '8px', 
            bottom: '8px', 
            width: '2px', 
            background: 'var(--erp-border)' 
          }} 
        />
        {timelineSteps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
            {/* Step Dot */}
            <div 
              style={{ 
                position: 'absolute', 
                left: '-22px', 
                top: '4px', 
                width: '14px', 
                height: '14px', 
                borderRadius: '50%', 
                background: step.completed ? '#10b981' : 'var(--erp-border)',
                border: step.completed ? 'none' : '2px solid #cbd5e1',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {step.completed && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
            </div>

            {/* Content */}
            <div>
              <div style={{ fontWeight: 600, color: step.completed ? 'var(--erp-text)' : 'var(--erp-text-muted)' }}>
                {step.state}
              </div>
              {step.completed && step.date && (
                <div style={{ fontSize: '0.75rem', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
                  Completed: {new Date(step.date).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const activePendings = useMemo(() => {
    return approvals.filter(a => a.status === 'pending');
  }, [approvals]);

  const activeDecideds = useMemo(() => {
    return approvals.filter(a => a.status !== 'pending');
  }, [approvals]);

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
        <span className="erp-breadcrumbs__item">ERP Portal</span>
        <span className="erp-breadcrumbs__separator">/</span>
        <span className="erp-breadcrumbs__current">Approval Workflows</span>
      </div>

      <div className="erp-content">
        {error && <div className="erp-alert erp-alert--danger">{error}</div>}
        {success && <div className="erp-alert erp-alert--success">{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'start' }}>
          
          {/* LEFT PANEL: ACTIVE APPROVALS & HISTORY */}
          <div style={{ display: 'grid', gap: '16px' }}>
            
            {/* PENDING APPROVALS */}
            <section className="erp-card">
              <div className="erp-card__header">
                <h2 className="erp-card__title">Pending Sourcing Approvals</h2>
                <p className="erp-card__subtitle">Bids and campaigns awaiting Manager authorization.</p>
              </div>
              <div className="erp-card__body">
                {loading ? (
                  <p style={{ textAlign: 'center', color: 'var(--erp-text-muted)' }}>Loading approvals...</p>
                ) : activePendings.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                    No pending approvals awaiting review.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {activePendings.map(app => (
                      <article 
                        key={app.id} 
                        className="erp-card" 
                        style={{ 
                          padding: '16px', 
                          margin: 0, 
                          border: '1px solid var(--erp-border)',
                          cursor: 'pointer',
                          background: selectedApp?.id === app.id ? '#f8fafc' : '#fff'
                        }}
                        onClick={() => setSelectedApp(app)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.98rem' }}>{app.rfqs?.title || 'RFQ Bid Review'}</h4>
                            <p style={{ margin: '4px 0', fontSize: '0.88rem', color: 'var(--erp-text-muted)' }}>
                              RFQ: {app.rfqs?.rfq_number || 'N/A'} | Vendor: {app.quotations?.vendors?.company_name || 'N/A'}
                            </p>
                            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--erp-primary)' }}>
                              Total amount: {formatCurrency(app.quotations?.total_amount)}
                            </span>
                          </div>
                          
                          {/* Role check for Manager action */}
                          {(user?.role === 'manager' || user?.role === 'admin') ? (
                            <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                              <button 
                                className="erp-btn erp-btn--success" 
                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                onClick={() => openDecisionModal(app, 'approved')}
                              >
                                Approve
                              </button>
                              <button 
                                className="erp-btn erp-btn--danger" 
                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                onClick={() => openDecisionModal(app, 'rejected')}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="erp-badge erp-badge--warning">Pending Manager Decision</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* DECISION HISTORY */}
            <section className="erp-card">
              <div className="erp-card__header">
                <h2 className="erp-card__title">Completed Decisions History</h2>
                <p className="erp-card__subtitle">Logs of previously processed procurement workflows.</p>
              </div>
              <div className="erp-card__body">
                {activeDecideds.length === 0 ? (
                  <p style={{ color: 'var(--erp-text-muted)' }}>No completed decisions in log.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--erp-text-muted)', borderBottom: '1px solid var(--erp-border)' }}>
                          <th style={{ padding: '10px' }}>RFQ</th>
                          <th style={{ padding: '10px' }}>Vendor</th>
                          <th style={{ padding: '10px' }}>Amount</th>
                          <th style={{ padding: '10px' }}>Final Status</th>
                          <th style={{ padding: '10px' }}>Decided At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDecideds.map(app => (
                          <tr 
                            key={app.id} 
                            style={{ 
                              borderBottom: '1px solid var(--erp-border)', 
                              cursor: 'pointer',
                              background: selectedApp?.id === app.id ? '#f8fafc' : 'transparent' 
                            }}
                            onClick={() => setSelectedApp(app)}
                          >
                            <td style={{ padding: '10px' }}>{app.rfqs?.rfq_number}</td>
                            <td style={{ padding: '10px' }}>{app.quotations?.vendors?.company_name}</td>
                            <td style={{ padding: '10px' }}>{formatCurrency(app.quotations?.total_amount)}</td>
                            <td style={{ padding: '10px' }}>
                              <span className={`erp-badge erp-badge--${app.status === 'approved' ? 'success' : 'danger'}`}>
                                {app.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              {app.decided_at ? new Date(app.decided_at).toLocaleDateString() : '-'}
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

          {/* RIGHT PANEL: SELECTED WORKFLOW TIMELINE DETAILS */}
          <div style={{ position: 'sticky', top: '16px' }}>
            <section className="erp-card">
              <div className="erp-card__header">
                <h2 className="erp-card__title">Workflow Timeline Tracking</h2>
                <p className="erp-card__subtitle">Detailed lifecycle tracking of the selected procurement item.</p>
              </div>
              <div className="erp-card__body">
                {selectedApp ? (
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem' }}>{selectedApp.rfqs?.title}</h3>
                    <p style={{ color: 'var(--erp-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      RFQ ID: {selectedApp.rfqs?.rfq_number}
                    </p>

                    <div style={{ borderTop: '1px solid var(--erp-border)', margin: '14px 0', paddingTop: '14px' }}>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '0.88rem' }}>
                        <div><strong>Supplier:</strong> {selectedApp.quotations?.vendors?.company_name}</div>
                        <div><strong>Quotation Cost:</strong> {formatCurrency(selectedApp.quotations?.total_amount)}</div>
                        <div><strong>Current Approval Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{selectedApp.status}</span></div>
                        {selectedApp.comments && (
                          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--erp-primary)', marginTop: '8px' }}>
                            <strong>Manager Remarks:</strong> "{selectedApp.comments}"
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 style={{ margin: '18px 0 8px 0', fontSize: '0.92rem', textTransform: 'uppercase', color: 'var(--erp-text-muted)' }}>
                      Lifecycle Tracking
                    </h4>
                    {renderTimeline(selectedApp.timeline)}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--erp-text-muted)', padding: '40px 0' }}>
                    Select an approval or history item to inspect its complete workflow timeline.
                  </div>
                )}
              </div>
            </section>
          </div>

        </div>
      </div>

      {/* DECISION POPUP MODAL */}
      {decisionModalOpen && (
        <>
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0,0,0,0.4)', 
              zIndex: 999 
            }} 
            onClick={() => setDecisionModalOpen(false)}
          />
          <div 
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              width: 'min(500px, 90vw)', 
              background: '#fff', 
              borderRadius: '8px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
              zIndex: 1000, 
              padding: '24px' 
            }}
          >
            <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>
              Confirm {decisionType} Sourcing Bid
            </h3>
            <p style={{ color: 'var(--erp-text-muted)', fontSize: '0.9rem' }}>
              Please enter your workflow comments or authorization remarks below to finalize this decision.
            </p>
            <form onSubmit={handleDecisionSubmit}>
              <div className="erp-form-group">
                <label className="erp-label">Authorization Remarks</label>
                <textarea 
                  className="erp-input"
                  style={{ minHeight: '96px', paddingTop: '10px' }}
                  placeholder="Provide brief explanation for approval/rejection remarks..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="erp-btn erp-btn--secondary"
                  onClick={() => setDecisionModalOpen(false)}
                  disabled={submittingDecision}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`erp-btn erp-btn--${decisionType === 'approved' ? 'success' : 'danger'}`}
                  disabled={submittingDecision}
                >
                  {submittingDecision ? 'Submitting...' : `Submit ${decisionType}`}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

    </EnterpriseErpLayout>
  );
};

export default ApprovalWorkflowPage;
