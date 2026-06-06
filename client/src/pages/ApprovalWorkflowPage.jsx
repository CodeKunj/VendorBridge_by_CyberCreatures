import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  AlertCircle, 
  Check, 
  X, 
  Clock, 
  UserCheck, 
  History,
  ChevronRight
} from 'lucide-react';
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

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Approval Workflows' }
  ]), []);

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
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const renderTimeline = (timelineSteps) => {
    if (!timelineSteps) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px', margin: '20px 0' }}>
        <div 
          style={{ 
            position: 'absolute', 
            left: '8px', 
            top: '8px', 
            bottom: '8px', 
            width: '2px', 
            background: 'var(--erp-outline-variant)' 
          }} 
        />
        {timelineSteps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
            <div 
              style={{ 
                position: 'absolute', 
                left: '-22px', 
                top: '4px', 
                width: '14px', 
                height: '14px', 
                borderRadius: '50%', 
                background: step.completed ? 'var(--erp-success)' : 'var(--erp-surface-container-highest)',
                border: step.completed ? 'none' : '2px solid var(--erp-outline-variant)',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {step.completed && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
            </div>

            <div>
              <div style={{ fontWeight: 600, color: step.completed ? 'var(--erp-on-surface)' : 'var(--erp-outline)' }}>
                {step.state}
              </div>
              {step.completed && step.date && (
                <div style={{ fontSize: '0.72rem', color: 'var(--erp-outline)', marginTop: '2px' }}>
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
      activeNavId="approvals"
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
      <h1 className="erp-title">Approval Workflows</h1>
      <p className="erp-subtitle">Review, authorize and trace step approvals for procurement tenders.</p>

      {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="erp-alert erp-alert--success"><Check size={15} /> {success}</div>}

      <div className="erp-grid-2" style={{ alignItems: 'start' }}>
        
        {/* LEFT PANEL: ACTIVE APPROVALS & HISTORY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* PENDING APPROVALS */}
          <section className="erp-card">
            <div className="erp-card__header">
              <h2 className="erp-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} /> Pending Authorization
              </h2>
            </div>
            <div className="erp-card__body">
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--erp-outline)', padding: '20px' }}>Loading approvals...</p>
              ) : activePendings.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-outline)' }}>
                  No pending approval requests.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activePendings.map(app => (
                    <article 
                      key={app.id} 
                      className="erp-card" 
                      style={{ 
                        padding: '16px', 
                        margin: 0, 
                        border: '1px solid var(--erp-outline-variant)',
                        cursor: 'pointer',
                        background: selectedApp?.id === app.id ? 'var(--erp-surface-container)' : 'var(--erp-surface)'
                      }}
                      onClick={() => setSelectedApp(app)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{app.rfqs?.title || 'RFQ Bid Review'}</h4>
                          <p style={{ margin: '4px 0', fontSize: '0.82rem', color: 'var(--erp-outline)' }}>
                            RFQ: {app.rfqs?.rfq_number || 'N/A'} | Supplier: {app.quotations?.vendors?.company_name || 'N/A'}
                          </p>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--erp-primary)' }}>
                            Amount: {formatCurrency(app.quotations?.total_amount)}
                          </span>
                        </div>
                        
                        {(user?.role === 'manager' || user?.role === 'admin') ? (
                          <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                            <button 
                              className="erp-btn erp-btn--primary" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                              onClick={() => openDecisionModal(app, 'approved')}
                            >
                              Approve
                            </button>
                            <button 
                              className="erp-btn erp-btn--danger" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
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
              <h2 className="erp-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} /> Approval logs history
              </h2>
            </div>
            <div className="erp-card__body">
              {activeDecideds.length === 0 ? (
                <p style={{ color: 'var(--erp-outline)', textAlign: 'center' }}>No historical workflow actions found.</p>
              ) : (
                <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Target File</th>
                        <th>Auditor</th>
                        <th>Verification Status</th>
                        <th>Auditor Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDecideds.map(app => (
                        <tr key={app.id}>
                          <td>
                            <strong>{app.rfqs?.title}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--erp-outline)' }}>
                              Supplier: {app.quotations?.vendors?.company_name}
                            </div>
                          </td>
                          <td>{app.users?.name || 'Manager'}</td>
                          <td>
                            <span className={`erp-badge erp-badge--${app.status === 'approved' ? 'success' : 'danger'}`}>
                              {app.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{app.comments || 'No remarks provided'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT PANEL: SELECTED ITEM WORKFLOW INSPECTOR */}
        <div>
          {selectedApp ? (
            <section className="erp-card" style={{ position: 'sticky', top: '90px' }}>
              <div className="erp-card__header">
                <h3 className="erp-card__title">Workflow Inspector</h3>
                <span className={`erp-badge erp-badge--${selectedApp.status === 'approved' ? 'success' : selectedApp.status === 'rejected' ? 'danger' : 'warning'}`}>
                  {selectedApp.status.toUpperCase()}
                </span>
              </div>
              <div className="erp-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', textTransform: 'uppercase', fontWeight: 600 }}>Tender / Proposal Title</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--erp-on-surface)' }}>{selectedApp.rfqs?.title}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', fontWeight: 600 }}>RFQ ID</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedApp.rfqs?.rfq_number || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', fontWeight: 600 }}>Supplier</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedApp.quotations?.vendors?.company_name || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--erp-surface-container-low)', padding: '14px', borderRadius: '8px', border: '1px dashed var(--erp-outline-variant)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', fontWeight: 600 }}>Total Quoted Value</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--erp-primary)', marginTop: '4px' }}>
                    {formatCurrency(selectedApp.quotations?.total_amount)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Steps Verification Trailing
                  </div>
                  {renderTimeline(selectedApp.timeline)}
                </div>

                {(selectedApp.status === 'pending' && (user?.role === 'manager' || user?.role === 'admin')) && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button 
                      className="erp-btn erp-btn--primary" 
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => openDecisionModal(selectedApp, 'approved')}
                    >
                      Sign off Approval
                    </button>
                    <button 
                      className="erp-btn erp-btn--danger" 
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => openDecisionModal(selectedApp, 'rejected')}
                    >
                      Reject Tender
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div style={{ 
              border: '2px dashed var(--erp-outline-variant)', 
              borderRadius: 'var(--erp-radius-lg)', 
              padding: '40px', 
              textAlign: 'center', 
              color: 'var(--erp-outline)' 
            }}>
              Select any pending request from the registry panel to inspect its workflow history details.
            </div>
          )}
        </div>

      </div>

      {/* Decision Modal */}
      {decisionModalOpen && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ width: '450px' }}>
            <div className="erp-modal__header">
              <h3 className="erp-card__title">Workflow Validation sign</h3>
              <button style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => setDecisionModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleDecisionSubmit}>
              <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: 'var(--erp-outline)', fontSize: '0.85rem', margin: 0 }}>
                  Provide sign-off remarks or reasons to authorize this action.
                </p>
                <div className="erp-form-group">
                  <label className="erp-label">Authorization Remarks</label>
                  <textarea 
                    className="erp-textarea"
                    placeholder="Workflow log comments..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="erp-modal__footer">
                <button 
                  type="button" 
                  className="erp-btn erp-btn--outline"
                  onClick={() => setDecisionModalOpen(false)}
                  disabled={submittingDecision}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`erp-btn erp-btn--${decisionType === 'approved' ? 'primary' : 'danger'}`}
                  disabled={submittingDecision}
                >
                  {submittingDecision ? 'Submitting...' : `Confirm ${decisionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </EnterpriseErpLayout>
  );
};

export default ApprovalWorkflowPage;
