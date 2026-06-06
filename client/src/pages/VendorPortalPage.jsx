import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../api/rfqApi';
import { quotationApi } from '../api/quotationApi';
import { 
  AlertCircle, 
  Check, 
  Send, 
  FileText, 
  Trash2, 
  Edit2, 
  Plus, 
  RefreshCw, 
  Paperclip,
  X 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const createQuotationItem = (productName = '', quantity = '') => ({
  product_name: productName,
  quantity,
  unit_price: '',
  delivery_time: '',
  notes: '',
});

const defaultQuotationForm = {
  rfq_id: '',
  total_amount: '',
  delivery_days: '',
  notes: '',
  items: [createQuotationItem()],
};

const tabOptions = ['rfqs', 'quotations'];

const VendorPortalPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rfqs');
  const [assignedRfqs, setAssignedRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [quotationForm, setQuotationForm] = useState(defaultQuotationForm);
  const [attachments, setAttachments] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [rfqResponse, quotationResponse] = await Promise.all([
        rfqApi.list({ limit: 100, status: 'published' }),
        quotationApi.list({ limit: 100 }),
      ]);

      setAssignedRfqs(rfqResponse.data || []);
      setQuotations(quotationResponse.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load vendor portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNavigate = (item) => {
    navigate(item.id === 'vendor-portal' ? '/vendor-portal' : `/${item.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const openNewQuotation = async (rfq) => {
    try {
      const response = await rfqApi.getById(rfq.id);
      const rfqDetails = response.data || response;
      const firstItems = (rfqDetails.rfq_items || []).length > 0
        ? rfqDetails.rfq_items.map((item) => createQuotationItem(item.product_name, item.quantity))
        : [createQuotationItem()];

      setSelectedRfq(rfqDetails);
      setEditingQuotationId(null);
      setQuotationForm({
        rfq_id: rfqDetails.id,
        total_amount: '',
        delivery_days: '',
        notes: '',
        items: firstItems,
      });
      setAttachments([]);
      setQuotationModalOpen(true);
    } catch (err) {
      setError('Failed to fetch RFQ details.');
    }
  };

  const openEditQuotation = async (quotation) => {
    try {
      const response = await quotationApi.getById(quotation.id);
      const details = response.data || response;

      setSelectedRfq(details.rfqs);
      setEditingQuotationId(details.id);
      setQuotationForm({
        rfq_id: details.rfq_id,
        total_amount: details.total_amount || '',
        delivery_days: details.delivery_days || '',
        notes: details.notes || '',
        items: (details.quotation_items || []).length > 0
          ? details.quotation_items.map((item) => ({
              product_name: item.product_name || '',
              quantity: item.quantity || '',
              unit_price: item.unit_price || '',
              delivery_time: item.delivery_time || '',
              notes: item.notes || '',
            }))
          : [createQuotationItem()],
      });
      setAttachments([]);
      setQuotationModalOpen(true);
    } catch (err) {
      setError('Failed to load quotation details.');
    }
  };

  const updateItem = (index, field, value) => {
    setQuotationForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setQuotationForm((prev) => ({ ...prev, items: [...prev.items, createQuotationItem()] }));
  };

  const removeItem = (index) => {
    setQuotationForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, itemIndex) => itemIndex !== index) : prev.items,
    }));
  };

  const submitQuotation = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('rfq_id', quotationForm.rfq_id);
    formData.append('total_amount', quotationForm.total_amount);
    formData.append('delivery_days', quotationForm.delivery_days);
    formData.append('notes', quotationForm.notes);
    formData.append('items', JSON.stringify(quotationForm.items));

    attachments.forEach((file) => formData.append('attachments', file));

    try {
      if (editingQuotationId) {
        await quotationApi.update(editingQuotationId, formData);
      } else {
        await quotationApi.create(formData);
      }
      setQuotationModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to submit quotation bid');
    }
  };

  const withdrawQuotation = async (quotationId) => {
    if (!window.confirm('Withdraw this quotation?')) {
      return;
    }

    try {
      await quotationApi.withdraw(quotationId);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to withdraw quotation');
    }
  };

  const portalStats = useMemo(() => ({
    assignedRfqs: assignedRfqs.length,
    openRfqs: assignedRfqs.filter((rfq) => rfq.status === 'published').length,
    myQuotations: quotations.length,
    submittedQuotations: quotations.filter((quotation) => quotation.status === 'submitted').length,
  }), [assignedRfqs, quotations]);

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Vendor Portal' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="vendor-portal"
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/vendor-portal')}
      onSettings={() => navigate('/vendor-portal')}
      breadcrumbs={breadcrumbs}
    >
        <div className="erp-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 className="erp-title">Vendor Portal</h1>
            <p className="erp-subtitle">View assigned RFQs, submit quotations, upload attachments, and track bid status.</p>
          </div>
          <button className="erp-btn erp-btn--outline" type="button" onClick={loadData}>
            <RefreshCw size={14} /> Refresh Portal
          </button>
        </div>

        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}

        {/* Stats Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <article className="erp-card">
            <div className="erp-card__body">
              <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Assigned RFQs</p>
              <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-primary)', fontWeight: 700 }}>{portalStats.assignedRfqs}</h3>
            </div>
          </article>
          <article className="erp-card">
            <div className="erp-card__body">
              <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Open RFQs</p>
              <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-primary)', fontWeight: 700 }}>{portalStats.openRfqs}</h3>
            </div>
          </article>
          <article className="erp-card">
            <div className="erp-card__body">
              <p className="erp-card__subtitle" style={{ marginTop: 0 }}>My Quotations</p>
              <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-secondary)', fontWeight: 700 }}>{portalStats.myQuotations}</h3>
            </div>
          </article>
          <article className="erp-card">
            <div className="erp-card__body">
              <p className="erp-card__subtitle" style={{ marginTop: 0 }}>Submitted Bids</p>
              <h3 className="erp-card__title" style={{ fontSize: '1.8rem', color: 'var(--erp-success)', fontWeight: 700 }}>{portalStats.submittedQuotations}</h3>
            </div>
          </article>
        </div>

        {/* Tab Controls */}
        <div className="erp-tabs" style={{ marginBottom: '20px' }}>
          <button 
            className={`erp-tab ${activeTab === 'rfqs' ? 'is-active' : ''}`} 
            onClick={() => setActiveTab('rfqs')}
          >
            Assigned RFQ List
          </button>
          <button 
            className={`erp-tab ${activeTab === 'quotations' ? 'is-active' : ''}`} 
            onClick={() => setActiveTab('quotations')}
          >
            My Submitted Bids
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'rfqs' ? (
          <section className="erp-card">
            <div className="erp-card__body" style={{ padding: 0 }}>
              <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>RFQ Number</th>
                      <th>RFQ Title</th>
                      <th>Submission Deadline</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-outline)' }}>Loading assigned RFQs...</td></tr>
                    ) : assignedRfqs.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-outline)' }}>No assigned RFQs available.</td></tr>
                    ) : assignedRfqs.map((rfq) => (
                      <tr key={rfq.id}>
                        <td><span className="erp-badge erp-badge--draft">{rfq.rfq_number}</span></td>
                        <td style={{ fontWeight: 600 }}>{rfq.title}</td>
                        <td>{rfq.deadline ? new Date(rfq.deadline).toLocaleString() : '-'}</td>
                        <td>
                          <span className="erp-badge erp-badge--info">
                            {rfq.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="erp-btn erp-btn--primary" 
                            type="button" 
                            style={{ padding: '4px 10px', height: '28px', fontSize: '0.75rem' }} 
                            onClick={() => openNewQuotation(rfq)}
                          >
                            <Send size={12} /> Submit Bid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          <section className="erp-card">
            <div className="erp-card__body" style={{ padding: 0 }}>
              <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>RFQ Reference</th>
                      <th>Quoted Total</th>
                      <th>Delivery Days</th>
                      <th>Bid Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-outline)' }}>Loading quotations...</td></tr>
                    ) : quotations.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-outline)' }}>No quotations submitted yet.</td></tr>
                    ) : quotations.map((quotation) => (
                      <tr key={quotation.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{quotation.rfqs?.rfq_number}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--erp-outline)' }}>{quotation.rfqs?.title}</div>
                        </td>
                        <td><strong>{formatCurrency(quotation.total_amount)}</strong></td>
                        <td>{quotation.delivery_days ? `${quotation.delivery_days} days` : '-'}</td>
                        <td>
                          <span className={`erp-badge erp-badge--${
                            quotation.status === 'approved' ? 'success' : quotation.status === 'rejected' ? 'danger' : 'warning'
                          }`}>
                            {quotation.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              className="erp-btn erp-btn--outline" 
                              style={{ padding: '4px 8px', height: '28px', fontSize: '0.75rem' }} 
                              onClick={() => openEditQuotation(quotation)}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button 
                              className="erp-btn erp-btn--danger" 
                              style={{ padding: '4px 8px', height: '28px', fontSize: '0.75rem' }} 
                              onClick={() => withdrawQuotation(quotation.id)}
                            >
                              <Trash2 size={12} /> Withdraw
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

      {/* SUBMIT QUOTATION MODAL */}
      {quotationModalOpen && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ width: 'min(900px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="erp-modal__header">
              <h3 className="erp-card__title">{editingQuotationId ? 'Modify Bid Offer' : 'Submit Quotation Bid'}</h3>
              <button style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => setQuotationModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={submitQuotation}>
              <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--erp-outline)' }}>
                  RFQ: <strong>{selectedRfq?.rfq_number} - {selectedRfq?.title}</strong>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label">Total Bid Amount</label>
                    <input 
                      className="erp-input" 
                      placeholder="e.g. 2400" 
                      type="number" 
                      min="0" 
                      value={quotationForm.total_amount} 
                      onChange={(e) => setQuotationForm((prev) => ({ ...prev, total_amount: e.target.value }))} 
                      required
                    />
                  </div>
                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label">Delivery Completion (Days)</label>
                    <input 
                      className="erp-input" 
                      placeholder="e.g. 7" 
                      type="number" 
                      min="1" 
                      value={quotationForm.delivery_days} 
                      onChange={(e) => setQuotationForm((prev) => ({ ...prev, delivery_days: e.target.value }))} 
                      required
                    />
                  </div>
                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={13} /> Attach Proposal Documents
                    </label>
                    <input 
                      className="erp-input" 
                      type="file" 
                      multiple 
                      onChange={(e) => setAttachments(Array.from(e.target.files || []))} 
                    />
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Scope Notes / Remarks</label>
                  <textarea 
                    className="erp-textarea" 
                    placeholder="Provide additional terms, shipping conditions, etc..." 
                    value={quotationForm.notes} 
                    onChange={(e) => setQuotationForm((prev) => ({ ...prev, notes: e.target.value }))} 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Quoted Items List</h4>
                  {quotationForm.items.map((item, index) => (
                    <div key={`${index}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr auto', gap: '8px', alignItems: 'center' }}>
                      <input className="erp-input" placeholder="Product" value={item.product_name} onChange={(e) => updateItem(index, 'product_name', e.target.value)} required />
                      <input className="erp-input" placeholder="Qty" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required />
                      <input className="erp-input" placeholder="Unit $" type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} required />
                      <input className="erp-input" placeholder="Days" type="number" min="1" value={item.delivery_time} onChange={(e) => updateItem(index, 'delivery_time', e.target.value)} />
                      <input className="erp-input" placeholder="Item Remarks" value={item.notes} onChange={(e) => updateItem(index, 'notes', e.target.value)} />
                      <button className="erp-btn erp-btn--danger" style={{ height: '36px', padding: '0 10px' }} type="button" onClick={() => removeItem(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button className="erp-btn erp-btn--outline" type="button" style={{ width: 'fit-content' }} onClick={addItem}>
                    <Plus size={13} /> Add Item Line
                  </button>
                </div>
              </div>

              <div className="erp-modal__footer">
                <button type="button" className="erp-btn erp-btn--outline" onClick={() => setQuotationModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn--primary">
                  Submit Bid Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EnterpriseErpLayout>
  );
};

export default VendorPortalPage;