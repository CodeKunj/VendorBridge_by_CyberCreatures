import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  Plus, 
  Check, 
  X, 
  FileText, 
  Layers, 
  TrendingUp, 
  Clock, 
  Briefcase, 
  Users, 
  Eye, 
  AlertCircle 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const ProcurementPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab State: 'rfqs' | 'approvals'
  const [activeTab, setActiveTab] = useState('rfqs');

  // Lists state
  const [rfqs, setRfqs] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Item details
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [rfqItems, setRfqItems] = useState([]);
  const [assignedVendors, setAssignedVendors] = useState([]);
  const [submittedQuotations, setSubmittedQuotations] = useState([]);
  const [comparison, setComparison] = useState(null);

  // New RFQ State
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [newRfq, setNewRfq] = useState({
    title: '',
    description: '',
    deadline: '',
    items: [{ item_name: '', description: '', quantity: 1, uom: 'units' }],
    vendorIds: []
  });

  // New Quotation State (for Vendor role)
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [newQuotation, setNewQuotation] = useState({
    delivery_days: 5,
    notes: '',
    items: [] // array of { rfq_item_id, item_name, quantity, unit_price: 0, total_price: 0 }
  });

  // Approval Decision State (for Manager role)
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decision, setDecision] = useState({
    approvalId: '',
    status: 'approved',
    comments: ''
  });

  const isProcurement = user?.role === 'procurement_officer' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isVendor = user?.role === 'vendor';

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const rfqsRes = await erpApi.rfqs.list();
      setRfqs(rfqsRes.data || []);

      if (isProcurement) {
        const vendorsRes = await erpApi.vendors.list();
        setVendors((vendorsRes.data || []).filter(v => v.status === 'active'));
      }

      if (isManager) {
        const appRes = await erpApi.approvals.list();
        setApprovals(appRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load procurement data');
    } finally {
      setLoading(false);
    }
  };

  const loadRfqDetails = async (rfq) => {
    setError('');
    setSelectedRfq(rfq);
    setComparison(null);
    setSubmittedQuotations([]);
    try {
      const res = await erpApi.rfqs.getById(rfq.id);
      const rfqData = res.data || {};
      
      const items = (rfqData.rfq_items || []).map(item => ({
        id: item.id,
        item_name: item.item_name || item.product_name || '',
        description: item.description || item.notes || '',
        quantity: item.quantity || 1,
        uom: item.uom || item.unit || 'units'
      }));
      setRfqItems(items);

      const vendorsAssigned = (rfqData.rfq_vendor_assignments || [])
        .map(assign => assign.vendors)
        .filter(Boolean);
      setAssignedVendors(vendorsAssigned);

      if (isProcurement || isManager) {
        const qRes = await erpApi.quotations.list({ rfq_id: rfq.id });
        setSubmittedQuotations(qRes.data || []);

        try {
          const compRes = await erpApi.quotations.compare(rfq.id);
          setComparison(compRes.data);
        } catch (cErr) {
          // Suppress if no comparison
        }
      }
    } catch (err) {
      setError('Failed to load RFQ items and bids details');
    }
  };

  const handleAddRfqItemRow = () => {
    setNewRfq({
      ...newRfq,
      items: [...newRfq.items, { item_name: '', description: '', quantity: 1, uom: 'units' }]
    });
  };

  const handleRemoveRfqItemRow = (index) => {
    const list = [...newRfq.items];
    list.splice(index, 1);
    setNewRfq({ ...newRfq, items: list });
  };

  const handleRfqItemChange = (index, field, value) => {
    const list = [...newRfq.items];
    list[index][field] = value;
    setNewRfq({ ...newRfq, items: list });
  };

  const handleToggleVendorSelect = (vendorId) => {
    const current = [...newRfq.vendorIds];
    const index = current.indexOf(vendorId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(vendorId);
    }
    setNewRfq({ ...newRfq, vendorIds: current });
  };

  const handleCreateRfq = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newRfq.items.length === 0 || !newRfq.items[0].item_name) {
      setError('Please add at least one line item');
      return;
    }
    if (newRfq.vendorIds.length === 0) {
      setError('Please assign at least one active vendor');
      return;
    }

    try {
      const payload = {
        title: newRfq.title,
        description: newRfq.description,
        deadline: newRfq.deadline,
        items: newRfq.items,
        vendorIds: newRfq.vendorIds
      };
      await erpApi.rfqs.create(payload);
      setSuccess('RFQ created successfully');
      setShowRfqModal(false);
      setNewRfq({
        title: '',
        description: '',
        deadline: '',
        items: [{ item_name: '', description: '', quantity: 1, uom: 'units' }],
        vendorIds: []
      });
      fetchInitialData();
    } catch (err) {
      if (err.payload && err.payload.errors) {
        const details = err.payload.errors.map((e) => `${e.field}: ${e.message}`).join(', ');
        setError(`Validation failed - ${details}`);
      } else {
        setError(err.message || 'Failed to create RFQ');
      }
    }
  };

  const handlePublishRfq = async (rfqId) => {
    setError('');
    setSuccess('');
    try {
      await erpApi.rfqs.publish(rfqId);
      setSuccess('RFQ published successfully and dispatched to vendors');
      fetchInitialData();
      setSelectedRfq(null);
    } catch (err) {
      setError(err.message || 'Failed to publish RFQ');
    }
  };

  const handleOpenQuotationForm = () => {
    const formItems = rfqItems.map(item => ({
      rfq_item_id: item.id,
      item_name: item.item_name,
      quantity: parseFloat(item.quantity || 1),
      unit_price: 0,
      total_price: 0
    }));
    setNewQuotation({
      delivery_days: 7,
      notes: '',
      items: formItems
    });
    setShowQuotationModal(true);
  };

  const handleQuotePriceChange = (index, val) => {
    const list = [...newQuotation.items];
    const unitPrice = parseFloat(val) || 0;
    list[index].unit_price = unitPrice;
    list[index].total_price = unitPrice * list[index].quantity;
    setNewQuotation({ ...newQuotation, items: list });
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const totalAmount = newQuotation.items.reduce((sum, item) => sum + item.total_price, 0);
      const payload = {
        rfq_id: selectedRfq.id,
        delivery_days: parseInt(newQuotation.delivery_days),
        notes: newQuotation.notes,
        total_amount: totalAmount,
        items: newQuotation.items.map(i => ({
          item_name: i.item_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price
        }))
      };

      await erpApi.quotations.create(payload);
      setSuccess('Quotation submitted successfully');
      setShowQuotationModal(false);
      loadRfqDetails(selectedRfq);
    } catch (err) {
      setError(err.message || 'Failed to submit quotation');
    }
  };

  const handleSubmitForApproval = async (quotationId) => {
    setError('');
    setSuccess('');
    try {
      await erpApi.approvals.decide({
        id: quotationId,
        rfq_id: selectedRfq.id,
        quotation_id: quotationId,
        status: 'pending',
        level: 1
      });
      setSuccess('Quotation submitted to management for approval');
      loadRfqDetails(selectedRfq);
    } catch (err) {
      try {
        await erpApi.approvals.decide({
          id: quotationId,
          status: 'pending'
        });
        setSuccess('Submitted for review');
      } catch (err2) {
        setError(err.message || 'Failed to submit approval workflow');
      }
    }
  };

  const handleOpenDecisionModal = (approvalId) => {
    setDecision({
      approvalId,
      status: 'approved',
      comments: ''
    });
    setShowDecisionModal(true);
  };

  const handleSaveDecision = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await erpApi.approvals.decide({
        id: decision.approvalId,
        status: decision.status,
        comments: decision.comments
      });
      setSuccess('Approval decision saved successfully');
      setShowDecisionModal(false);
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to record approval decision');
    }
  };

  const handleGeneratePO = async (rfqId, quotationId) => {
    setError('');
    setSuccess('');
    try {
      const quote = submittedQuotations.find(q => q.id === quotationId);
      const res = await erpApi.purchaseOrders.create({
        rfq_id: rfqId,
        quotation_id: quotationId,
        vendor_id: quote?.vendor_id,
        total_amount: quote?.total_amount
      });
      setSuccess(`Purchase Order created successfully: ${res.po_number || 'PO-OK'}`);
      loadRfqDetails(selectedRfq);
    } catch (err) {
      setError(err.message || 'Failed to create Purchase Order');
    }
  };

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Procurement' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="rfqs"
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}
        {success && <div className="erp-alert erp-alert--success"><Check size={15} /> {success}</div>}

        {/* ROLE TABS */}
        {isManager && (
          <div className="erp-tabs" style={{ marginBottom: '16px' }}>
            <button 
              className={`erp-tab ${activeTab === 'rfqs' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('rfqs'); setSelectedRfq(null); }}
            >
              <FileText size={14} /> Requests for Quotation (RFQs)
            </button>
            <button 
              className={`erp-tab ${activeTab === 'approvals' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('approvals'); setSelectedRfq(null); }}
            >
              <Layers size={14} /> Pending Approval Workflows
            </button>
          </div>
        )}

        <div className="erp-grid-2" style={{ alignItems: 'start', gap: '20px' }}>
          {/* RFQ MAIN PANEL */}
          {activeTab === 'rfqs' && (
            <section className="erp-card">
              <div className="erp-card__header">
                <div>
                  <h2 className="erp-card__title">Requests for Quotations</h2>
                  <p className="erp-card__subtitle">Procure supplies by inviting bids from verified suppliers.</p>
                </div>
                {isProcurement && (
                  <button className="erp-btn erp-btn--primary" onClick={() => setShowRfqModal(true)}>
                    <Plus size={16} /> New RFQ
                  </button>
                )}
              </div>

              <div className="erp-card__body">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-outline)' }}>
                    Loading RFQs...
                  </div>
                ) : rfqs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-outline)' }}>
                    No RFQs available.
                  </div>
                ) : (
                  <div className="erp-table-wrapper">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>RFQ Number</th>
                          <th>Title</th>
                          <th>Deadline</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfqs.map(rfq => (
                          <tr 
                            key={rfq.id} 
                            onClick={() => loadRfqDetails(rfq)}
                            style={{ cursor: 'pointer', background: selectedRfq?.id === rfq.id ? 'var(--erp-surface-container)' : '' }}
                          >
                            <td><strong>{rfq.rfq_number}</strong></td>
                            <td>{rfq.title}</td>
                            <td>{new Date(rfq.deadline).toLocaleDateString()}</td>
                            <td>
                              <span className={`erp-badge erp-badge--${
                                rfq.status === 'published' ? 'success' : 
                                rfq.status === 'closed' ? 'danger' : 'draft'
                              }`}>
                                {rfq.status}
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
          )}

          {/* APPROVALS MAIN PANEL */}
          {activeTab === 'approvals' && (
            <section className="erp-card">
              <div className="erp-card__header">
                <div>
                  <h2 className="erp-card__title">Pending Sign-offs</h2>
                  <p className="erp-card__subtitle">Authorize quotation bids and release purchase orders.</p>
                </div>
              </div>

              <div className="erp-card__body">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-outline)' }}>
                    Loading approvals...
                  </div>
                ) : approvals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-outline)' }}>
                    No pending approval requests.
                  </div>
                ) : (
                  <div className="erp-table-wrapper">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>RFQ Code</th>
                          <th>Level</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvals.map(app => (
                          <tr key={app.id}>
                            <td><strong>RFQ Approval Request</strong></td>
                            <td>Level {app.level}</td>
                            <td>
                              <span className={`erp-badge erp-badge--${
                                app.status === 'approved' ? 'success' : 
                                app.status === 'rejected' ? 'danger' : 'warning'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td>{new Date(app.created_at).toLocaleDateString()}</td>
                            <td>
                              {app.status === 'pending' && (
                                <button 
                                  className="erp-btn erp-btn--primary"
                                  style={{ height: '30px', padding: '0 8px', fontSize: '0.8rem' }}
                                  onClick={() => handleOpenDecisionModal(app.id)}
                                >
                                  Review
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* DETAIL SUB-PANEL */}
          <section className="erp-card">
            <div className="erp-card__header">
              <h2 className="erp-card__title">
                {selectedRfq ? `Details: ${selectedRfq.rfq_number}` : 'Selection Panel'}
              </h2>
            </div>
            <div className="erp-card__body">
              {selectedRfq ? (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 600 }}>{selectedRfq.title}</h3>
                    <p style={{ color: 'var(--erp-on-surface-variant)', fontSize: '0.88rem', margin: 0 }}>{selectedRfq.description}</p>
                    <div style={{ marginTop: '12px', fontSize: '0.82rem', display: 'flex', gap: '16px', color: 'var(--erp-outline)' }}>
                      <span><strong>Deadline:</strong> {new Date(selectedRfq.deadline).toLocaleString()}</span>
                      <span>
                        <strong>Status:</strong>{' '}
                        <span className={`erp-badge erp-badge--${
                          selectedRfq.status === 'published' ? 'success' : 'draft'
                        }`}>{selectedRfq.status}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--erp-outline)' }}>Line Items</h4>
                    <div className="erp-table-wrapper">
                      <table className="erp-table">
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>UOM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rfqItems.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td>{item.item_name}</td>
                              <td>{item.description || '-'}</td>
                              <td>{item.quantity}</td>
                              <td>{item.uom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* VENDOR ASSIGNMENTS FOR OFFICERS */}
                  {isProcurement && (
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--erp-outline)' }}>Assigned Suppliers</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {assignedVendors.map(av => (
                          <span key={av.id} className="erp-badge erp-badge--info">
                            {av.company_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VENDOR BIDDING ACTION */}
                  {isVendor && selectedRfq.status === 'published' && (
                    <div style={{ background: 'var(--erp-surface-container-low)', padding: '16px', borderRadius: '12px', border: '1px solid var(--erp-outline-variant)' }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 600 }}>Submit Quote Proposal</p>
                      <button className="erp-btn erp-btn--primary" onClick={handleOpenQuotationForm}>
                        Submit Bid Quotation
                      </button>
                    </div>
                  )}

                  {/* PROCUREMENT OFFICERS QUOTATION COMPARISON PANEL */}
                  {(isProcurement || isManager) && (
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--erp-outline)' }}>Bids & Quotations</h4>
                      {submittedQuotations.length === 0 ? (
                        <p style={{ color: 'var(--erp-outline)', fontSize: '0.85rem' }}>No quotation bids submitted yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div className="erp-table-wrapper">
                            <table className="erp-table">
                              <thead>
                                <tr>
                                  <th>Vendor</th>
                                  <th>Amount</th>
                                  <th>Timeline</th>
                                  <th>Status</th>
                                  <th>PO Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {submittedQuotations.map(quote => (
                                  <tr key={quote.id}>
                                    <td>Quote Bid</td>
                                    <td><strong>{formatCurrency(quote.total_amount)}</strong></td>
                                    <td>{quote.delivery_days} days</td>
                                    <td>
                                      <span className={`erp-badge erp-badge--${
                                        quote.status === 'accepted' ? 'success' : 
                                        quote.status === 'rejected' ? 'danger' : 'warning'
                                      }`}>
                                        {quote.status}
                                      </span>
                                    </td>
                                    <td>
                                      {quote.status === 'accepted' && (
                                        <button 
                                          className="erp-btn erp-btn--primary"
                                          style={{ height: '30px', padding: '0 10px', fontSize: '0.75rem' }}
                                          onClick={() => handleGeneratePO(selectedRfq.id, quote.id)}
                                        >
                                          Release PO
                                        </button>
                                      )}
                                      {quote.status === 'submitted' && isProcurement && (
                                        <button 
                                          className="erp-btn erp-btn--secondary"
                                          style={{ height: '30px', padding: '0 10px', fontSize: '0.75rem' }}
                                          onClick={() => handleSubmitForApproval(quote.id)}
                                        >
                                          Submit For Approval
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* COMPARISON METRIC HIGHLIGHTS */}
                          {comparison && (
                            <div style={{ background: 'var(--erp-surface-dim)', border: '1px solid var(--erp-outline-variant)', borderRadius: '12px', padding: '14px' }}>
                              <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--erp-primary)' }}>
                                Quotation Compare Engine
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={12} /> CHEAPEST BID</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px', color: '#064e3b' }}>
                                    {formatCurrency(comparison.cheapest?.total_amount)}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#047857' }}>
                                    {comparison.cheapest?.delivery_days} days delivery
                                  </div>
                                </div>
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> FASTEST BID</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px', color: '#1e3a8a' }}>
                                    {comparison.fastest?.delivery_days} Days
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>
                                    Cost: {formatCurrency(comparison.fastest?.total_amount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GENERAL ACTIONS */}
                  {isProcurement && selectedRfq.status === 'draft' && (
                    <button className="erp-btn erp-btn--primary" onClick={() => handlePublishRfq(selectedRfq.id)}>
                      Publish RFQ to Suppliers
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--erp-outline)' }}>
                  Select a registered RFQ to examine line items, pricing matrices, and bid entries.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* CREATE RFQ MODAL */}
        {showRfqModal && (
          <div className="erp-modal-overlay">
            <div className="erp-modal" style={{ width: 'min(780px, 95vw)' }}>
              <div className="erp-modal__header">
                <h3 className="erp-card__title">Create Request for Quotation</h3>
                <button 
                  style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                  onClick={() => setShowRfqModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateRfq}>
                <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="erp-form">
                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">RFQ Title</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          placeholder="e.g. Procurement of Laptop Batches"
                          value={newRfq.title} 
                          onChange={(e) => setNewRfq({ ...newRfq, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Submission Deadline</label>
                        <input 
                          type="datetime-local" 
                          className="erp-input"
                          value={newRfq.deadline} 
                          onChange={(e) => setNewRfq({ ...newRfq, deadline: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Project Description</label>
                      <textarea 
                        className="erp-textarea"
                        placeholder="Detail procurement requirements, specifications, or compliance standards..."
                        value={newRfq.description} 
                        onChange={(e) => setNewRfq({ ...newRfq, description: e.target.value })}
                      />
                    </div>

                    {/* DYNAMIC ROW ITEMS */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="erp-label">Procured Items</label>
                        <button type="button" className="erp-btn erp-btn--secondary" style={{ height: '30px' }} onClick={handleAddRfqItemRow}>
                          + Add Line
                        </button>
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {newRfq.items.map((item, index) => (
                          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              className="erp-input" 
                              placeholder="Item Name" 
                              value={item.item_name}
                              onChange={(e) => handleRfqItemChange(index, 'item_name', e.target.value)}
                              required
                            />
                            <input 
                              type="text" 
                              className="erp-input" 
                              placeholder="Description" 
                              value={item.description}
                              onChange={(e) => handleRfqItemChange(index, 'description', e.target.value)}
                            />
                            <input 
                              type="number" 
                              className="erp-input" 
                              placeholder="Qty" 
                              value={item.quantity}
                              onChange={(e) => handleRfqItemChange(index, 'quantity', e.target.value)}
                              min="0.1" 
                              step="any"
                              required
                            />
                            <input 
                              type="text" 
                              className="erp-input" 
                              placeholder="UOM" 
                              value={item.uom}
                              onChange={(e) => handleRfqItemChange(index, 'uom', e.target.value)}
                              required
                            />
                            <button 
                              type="button" 
                              className="erp-btn erp-btn--danger"
                              style={{ height: '36px', width: '36px', padding: 0 }}
                              onClick={() => handleRemoveRfqItemRow(index)}
                              disabled={newRfq.items.length <= 1}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ASSIGN VENDORS */}
                    <div style={{ marginTop: '16px' }}>
                      <label className="erp-label">Assign Suppliers</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--erp-outline-variant)', padding: '10px', borderRadius: 'var(--erp-radius-default)', background: 'var(--erp-surface-container-lowest)' }}>
                        {vendors.map(v => (
                          <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox"
                              checked={newRfq.vendorIds.includes(v.id)}
                              onChange={() => handleToggleVendorSelect(v.id)}
                            />
                            {v.company_name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="erp-modal__footer">
                  <button type="button" className="erp-btn erp-btn--outline" onClick={() => setShowRfqModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary">
                    Create RFQ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VENDOR SUBMIT BID QUOTATION MODAL */}
        {showQuotationModal && (
          <div className="erp-modal-overlay">
            <div className="erp-modal" style={{ width: 'min(640px, 95vw)' }}>
              <div className="erp-modal__header">
                <h3 className="erp-card__title">Submit Quotation Bid</h3>
                <button 
                  style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                  onClick={() => setShowQuotationModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleQuoteSubmit}>
                <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="erp-form">
                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">Delivery Timeline (Days)</label>
                        <input 
                          type="number" 
                          className="erp-input"
                          value={newQuotation.delivery_days} 
                          onChange={(e) => setNewQuotation({ ...newQuotation, delivery_days: e.target.value })}
                          min="1"
                          required
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Estimated Bid Total</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={formatCurrency(newQuotation.items.reduce((sum, item) => sum + item.total_price, 0))}
                          disabled 
                        />
                      </div>
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Items Pricing Matrix</label>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {newQuotation.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '10px', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem' }}>{item.item_name} (Qty: {item.quantity})</div>
                            <input 
                              type="number" 
                              className="erp-input"
                              placeholder="Unit Price"
                              value={item.unit_price}
                              onChange={(e) => handleQuotePriceChange(idx, e.target.value)}
                              min="0"
                              step="any"
                              required
                            />
                            <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>
                              {formatCurrency(item.total_price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Additional Bid Terms / Notes</label>
                      <textarea 
                        className="erp-textarea"
                        placeholder="Detail warranties, supply contingencies, or billing terms..."
                        value={newQuotation.notes}
                        onChange={(e) => setNewQuotation({ ...newQuotation, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="erp-modal__footer">
                  <button type="button" className="erp-btn erp-btn--outline" onClick={() => setShowQuotationModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary">
                    Submit Quotation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* APPROVER DECISION MODAL */}
        {showDecisionModal && (
          <div className="erp-modal-overlay">
            <div className="erp-modal" style={{ width: 'min(500px, 95vw)' }}>
              <div className="erp-modal__header">
                <h3 className="erp-card__title">Sign off Decision</h3>
                <button 
                  style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                  onClick={() => setShowDecisionModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveDecision}>
                <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="erp-form">
                    <div className="erp-form-group">
                      <label className="erp-label">Decision Status</label>
                      <select 
                        className="erp-select"
                        value={decision.status}
                        onChange={(e) => setDecision({ ...decision, status: e.target.value })}
                      >
                        <option value="approved">Approve and Proceed</option>
                        <option value="rejected">Reject Bid</option>
                      </select>
                    </div>
                    <div className="erp-form-group">
                      <label className="erp-label">Remarks / Comments</label>
                      <textarea 
                        className="erp-textarea"
                        placeholder="Provide reasoning or conditions for approval/rejection..."
                        value={decision.comments}
                        onChange={(e) => setDecision({ ...decision, comments: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="erp-modal__footer">
                  <button type="button" className="erp-btn erp-btn--outline" onClick={() => setShowDecisionModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary">
                    Save Sign-off
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </EnterpriseErpLayout>
  );
};

export default ProcurementPage;
