import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../api/rfqApi';
import { quotationApi } from '../api/quotationApi';
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

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Vendor Portal' },
  ]), []);

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
    if (item.id === 'vendor-portal') {
      navigate('/vendor-portal');
      return;
    }

    navigate(`/${item.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const openNewQuotation = async (rfq) => {
    const response = await rfqApi.getById(rfq.id);
    const rfqDetails = response.data;
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
  };

  const openEditQuotation = async (quotation) => {
    const response = await quotationApi.getById(quotation.id);
    const details = response.data;

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

    if (editingQuotationId) {
      await quotationApi.update(editingQuotationId, formData);
    } else {
      await quotationApi.create(formData);
    }

    setQuotationModalOpen(false);
    await loadData();
  };

  const withdrawQuotation = async (quotationId) => {
    if (!window.confirm('Withdraw this quotation?')) {
      return;
    }

    await quotationApi.withdraw(quotationId);
    await loadData();
  };

  const portalStats = useMemo(() => ({
    assignedRfqs: assignedRfqs.length,
    openRfqs: assignedRfqs.filter((rfq) => rfq.status === 'published').length,
    myQuotations: quotations.length,
    submittedQuotations: quotations.filter((quotation) => quotation.status === 'submitted').length,
  }), [assignedRfqs, quotations]);

  const actionItems = [
    { id: 'refresh', label: 'Refresh Portal', onClick: loadData },
    { id: 'rfqs', label: 'View RFQs', onClick: () => setActiveTab('rfqs') },
    { id: 'quotations', label: 'My Quotations', onClick: () => setActiveTab('quotations') },
  ];

  return (
    <EnterpriseErpLayout
      user={user}
      breadcrumbs={breadcrumbs}
      activeNavId="vendor-portal"
      notifications={[]}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/vendor-portal')}
      onSettings={() => navigate('/vendor-portal')}
    >
      <section className="erp-card">
        <div className="erp-card__header">
          <div>
            <h1 className="erp-card__title">Vendor Portal</h1>
            <p className="erp-card__subtitle">View assigned RFQs, submit quotations, edit before deadline, upload attachments, and track status.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {actionItems.map((item) => (
              <button key={item.id} type="button" className="erp-icon-button" style={{ width: 'auto', padding: '0 16px' }} onClick={item.onClick}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="erp-card__body" style={{ display: 'grid', gap: '18px' }}>
          {error ? <div className="erp-notification-item" style={{ borderColor: '#ef4444' }}>{error}</div> : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
            <article className="erp-card"><div className="erp-card__body"><p className="erp-card__subtitle" style={{ marginTop: 0 }}>Assigned RFQs</p><h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>{portalStats.assignedRfqs}</h3></div></article>
            <article className="erp-card"><div className="erp-card__body"><p className="erp-card__subtitle" style={{ marginTop: 0 }}>Open RFQs</p><h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>{portalStats.openRfqs}</h3></div></article>
            <article className="erp-card"><div className="erp-card__body"><p className="erp-card__subtitle" style={{ marginTop: 0 }}>My Quotations</p><h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>{portalStats.myQuotations}</h3></div></article>
            <article className="erp-card"><div className="erp-card__body"><p className="erp-card__subtitle" style={{ marginTop: 0 }}>Submitted</p><h3 className="erp-card__title" style={{ fontSize: '1.8rem' }}>{portalStats.submittedQuotations}</h3></div></article>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tabOptions.map((tab) => (
              <button key={tab} type="button" className="erp-icon-button" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setActiveTab(tab)}>
                {tab === 'rfqs' ? 'Assigned RFQs' : 'My Quotations'}
              </button>
            ))}
          </div>

          {activeTab === 'rfqs' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '12px' }}>RFQ Number</th>
                    <th style={{ padding: '12px' }}>Title</th>
                    <th style={{ padding: '12px' }}>Deadline</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" style={{ padding: '16px' }}>Loading assigned RFQs...</td></tr>
                  ) : assignedRfqs.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '16px' }}>No assigned RFQs available.</td></tr>
                  ) : assignedRfqs.map((rfq) => (
                    <tr key={rfq.id} style={{ borderTop: '1px solid #e5eef8' }}>
                      <td style={{ padding: '12px' }}>{rfq.rfq_number}</td>
                      <td style={{ padding: '12px' }}>{rfq.title}</td>
                      <td style={{ padding: '12px' }}>{rfq.deadline ? new Date(rfq.deadline).toLocaleString() : '-'}</td>
                      <td style={{ padding: '12px' }}>{rfq.status}</td>
                      <td style={{ padding: '12px' }}>
                        <button className="erp-icon-button" type="button" onClick={() => openNewQuotation(rfq)}>Submit Quotation</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '12px' }}>RFQ</th>
                    <th style={{ padding: '12px' }}>Total Amount (₹)</th>
                    <th style={{ padding: '12px' }}>Delivery</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" style={{ padding: '16px' }}>Loading quotations...</td></tr>
                  ) : quotations.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '16px' }}>No quotations submitted yet.</td></tr>
                  ) : quotations.map((quotation) => (
                    <tr key={quotation.id} style={{ borderTop: '1px solid #e5eef8' }}>
                      <td style={{ padding: '12px' }}>{quotation.rfqs?.rfq_number} - {quotation.rfqs?.title}</td>
                      <td style={{ padding: '12px' }}>{quotation.total_amount ? formatCurrency(quotation.total_amount) : '-'}</td>
                      <td style={{ padding: '12px' }}>{quotation.delivery_days ? `${quotation.delivery_days} days` : '-'}</td>
                      <td style={{ padding: '12px' }}>{quotation.status}</td>
                      <td style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="erp-icon-button" type="button" onClick={() => openEditQuotation(quotation)}>Edit</button>
                        <button className="erp-icon-button" type="button" onClick={() => withdrawQuotation(quotation.id)}>Withdraw</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {quotationModalOpen ? <div className="erp-layout-overlay" onClick={() => setQuotationModalOpen(false)} aria-hidden="true" /> : null}

      {quotationModalOpen ? (
        <section className="erp-notification-panel" style={{ width: 'min(980px, calc(100vw - 32px))', right: '50%', transform: 'translateX(50%)', top: '40px' }}>
          <div className="erp-notification-panel__header">
            <div>
              <h2 className="erp-notification-panel__title">{editingQuotationId ? 'Edit Quotation' : 'Submit Quotation'}</h2>
              <p className="erp-card__subtitle">
                {selectedRfq ? `${selectedRfq.rfq_number} - ${selectedRfq.title}` : 'Complete your pricing and delivery terms.'}
              </p>
            </div>
            <button className="erp-icon-button" type="button" onClick={() => setQuotationModalOpen(false)}>×</button>
          </div>

          <form onSubmit={submitQuotation} className="erp-notification-list" style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <input className="erp-search__input" value={quotationForm.rfq_id} disabled placeholder="RFQ" />
              <input className="erp-search__input" placeholder="Total Amount (₹)" type="number" min="0" value={quotationForm.total_amount} onChange={(event) => setQuotationForm((prev) => ({ ...prev, total_amount: event.target.value }))} />
              <input className="erp-search__input" placeholder="Delivery Time (days)" type="number" min="1" value={quotationForm.delivery_days} onChange={(event) => setQuotationForm((prev) => ({ ...prev, delivery_days: event.target.value }))} />
              <input className="erp-search__input" type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} />
            </div>

            <textarea className="erp-search__input" style={{ minHeight: '90px', paddingTop: '12px' }} placeholder="Notes" value={quotationForm.notes} onChange={(event) => setQuotationForm((prev) => ({ ...prev, notes: event.target.value }))} />

            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="erp-card__title" style={{ fontSize: '1rem' }}>Quotation Items</div>
              {quotationForm.items.map((item, index) => (
                <div key={`${index}-${item.product_name}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <input className="erp-search__input" placeholder="Product" value={item.product_name} onChange={(event) => updateItem(index, 'product_name', event.target.value)} required />
                  <input className="erp-search__input" placeholder="Quantity" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                  <input className="erp-search__input" placeholder="Unit Price (₹)" type="number" min="0" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} required />
                  <input className="erp-search__input" placeholder="Delivery Time" type="number" min="1" value={item.delivery_time} onChange={(event) => updateItem(index, 'delivery_time', event.target.value)} />
                  <input className="erp-search__input" placeholder="Item Notes" value={item.notes} onChange={(event) => updateItem(index, 'notes', event.target.value)} />
                  <button className="erp-icon-button" type="button" onClick={() => removeItem(index)}>Remove</button>
                </div>
              ))}
              <button className="erp-icon-button" type="button" style={{ width: 'fit-content' }} onClick={addItem}>+ Add Item</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="erp-icon-button" type="button" onClick={() => setQuotationModalOpen(false)}>Cancel</button>
              <button className="erp-icon-button" type="submit">Save Quotation</button>
            </div>
          </form>
        </section>
      ) : null}
    </EnterpriseErpLayout>
  );
};

export default VendorPortalPage;