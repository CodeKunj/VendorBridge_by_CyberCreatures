import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../api/rfqApi';
import { vendorApi } from '../api/vendorApi';

const createEmptyItem = () => ({ product_name: '', quantity: '', unit: '', notes: '' });

const defaultForm = {
  title: '',
  description: '',
  deadline: '',
  status: 'draft',
  vendor_ids: [],
  items: [createEmptyItem()],
};

const statusOptions = ['all', 'draft', 'published', 'closed', 'awarded', 'cancelled'];

const RfqManagementPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [attachments, setAttachments] = useState([]);

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'RFQs' },
  ]), []);

  const loadVendors = async () => {
    const response = await vendorApi.list({ limit: 100, status: 'active' });
    setVendors(response.data || []);
  };

  const loadRfqs = async (nextPage = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await rfqApi.list({
        page: nextPage,
        limit: meta.limit,
        search: filters.search,
        status: filters.status === 'all' ? '' : filters.status,
      });

      setRfqs(response.data || []);
      setMeta(response.meta || meta);
    } catch (err) {
      setError(err.message || 'Unable to load RFQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadVendors(), loadRfqs(1)]).catch((err) => setError(err.message || 'Unable to load RFQs'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigate = (item) => {
    if (item.id === 'rfqs') {
      navigate('/rfqs');
      return;
    }

    navigate(`/${item.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setAttachments([]);
    setFormOpen(true);
  };

  const openEdit = (rfq) => {
    setEditId(rfq.id);
    setForm({
      title: rfq.title || '',
      description: rfq.description || '',
      deadline: rfq.deadline ? new Date(rfq.deadline).toISOString().slice(0, 16) : '',
      status: rfq.status || 'draft',
      vendor_ids: (rfq.rfq_vendor_assignments || []).map((assignment) => assignment.vendor_id),
      items: (rfq.rfq_items || []).length > 0
        ? rfq.rfq_items.map((item) => ({
            product_name: item.product_name || '',
            quantity: item.quantity || '',
            unit: item.unit || '',
            notes: item.notes || '',
          }))
        : [createEmptyItem()],
    });
    setAttachments([]);
    setFormOpen(true);
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, itemIndex) => itemIndex !== index) : prev.items,
    }));
  };

  const submitForm = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('deadline', form.deadline);
    formData.append('status', form.status);
    formData.append('items', JSON.stringify(form.items));
    formData.append('vendor_ids', JSON.stringify(form.vendor_ids));

    attachments.forEach((file) => formData.append('attachments', file));

    if (editId) {
      await rfqApi.update(editId, formData);
    } else {
      await rfqApi.create(formData);
    }

    setFormOpen(false);
    await loadRfqs(meta.page || 1);
  };

  const deleteRfq = async (rfqId) => {
    if (!window.confirm('Delete this RFQ?')) {
      return;
    }

    await rfqApi.remove(rfqId);
    await loadRfqs(meta.page || 1);
  };

  const publishRfq = async (rfqId) => {
    await rfqApi.publish(rfqId);
    await loadRfqs(meta.page || 1);
  };

  const closeRfq = async (rfqId) => {
    await rfqApi.close(rfqId);
    await loadRfqs(meta.page || 1);
  };

  const paginationButtons = Array.from({ length: meta.totalPages || 1 }, (_, index) => index + 1);

  return (
    <EnterpriseErpLayout
      user={user}
      breadcrumbs={breadcrumbs}
      activeNavId="rfqs"
      notifications={[]}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/dashboard')}
    >
      <section className="erp-card">
        <div className="erp-card__header">
          <div>
            <h1 className="erp-card__title">RFQ Management</h1>
            <p className="erp-card__subtitle">Create, edit, assign vendors, upload files, and manage RFQ deadlines.</p>
          </div>
          <button className="erp-icon-button" type="button" style={{ width: 'auto', padding: '0 16px' }} onClick={openCreate}>
            + Create RFQ
          </button>
        </div>

        <div className="erp-card__body" style={{ display: 'grid', gap: '18px' }}>
          {error ? <div className="erp-notification-item" style={{ borderColor: '#ef4444' }}>{error}</div> : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <input className="erp-search__input" placeholder="Search RFQs" value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} />
            <select className="erp-search__input" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              {statusOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All Statuses' : option}</option>)}
            </select>
            <button className="erp-icon-button" type="button" style={{ width: 'auto', padding: '0 16px' }} onClick={() => loadRfqs(1)}>
              Apply Filters
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '12px' }}>RFQ Number</th>
                  <th style={{ padding: '12px' }}>Title</th>
                  <th style={{ padding: '12px' }}>Deadline</th>
                  <th style={{ padding: '12px' }}>Products</th>
                  <th style={{ padding: '12px' }}>Vendors</th>
                  <th style={{ padding: '12px' }}>Attachments</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ padding: '16px' }}>Loading RFQs...</td></tr>
                ) : rfqs.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '16px' }}>No RFQs found.</td></tr>
                ) : rfqs.map((rfq) => (
                  <tr key={rfq.id} style={{ borderTop: '1px solid #e5eef8' }}>
                    <td style={{ padding: '12px' }}>{rfq.rfq_number}</td>
                    <td style={{ padding: '12px' }}>{rfq.title}</td>
                    <td style={{ padding: '12px' }}>{rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '12px' }}>{rfq.rfq_items?.length || 0}</td>
                    <td style={{ padding: '12px' }}>{rfq.rfq_vendor_assignments?.length || 0}</td>
                    <td style={{ padding: '12px' }}>{rfq.rfq_attachments?.length || 0}</td>
                    <td style={{ padding: '12px' }}>{rfq.status}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="erp-icon-button" type="button" onClick={() => navigate(`/compare/${rfq.id}`)}>Compare</button>
                      <button className="erp-icon-button" type="button" onClick={() => openEdit(rfq)}>Edit</button>
                      <button className="erp-icon-button" type="button" onClick={() => publishRfq(rfq.id)}>Publish</button>
                      <button className="erp-icon-button" type="button" onClick={() => closeRfq(rfq.id)}>Close</button>
                      <button className="erp-icon-button" type="button" onClick={() => deleteRfq(rfq.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {paginationButtons.map((pageNumber) => (
              <button key={pageNumber} type="button" className="erp-icon-button" onClick={() => loadRfqs(pageNumber)}>
                {pageNumber}
              </button>
            ))}
          </div>
        </div>
      </section>

      {formOpen ? <div className="erp-layout-overlay" onClick={() => setFormOpen(false)} aria-hidden="true" /> : null}

      {formOpen ? (
        <section className="erp-notification-panel" style={{ width: 'min(960px, calc(100vw - 32px))', right: '50%', transform: 'translateX(50%)', top: '40px' }}>
          <div className="erp-notification-panel__header">
            <div>
              <h2 className="erp-notification-panel__title">{editId ? 'Edit RFQ' : 'Create RFQ'}</h2>
              <p className="erp-card__subtitle">Add products, assign vendors, upload attachments, and select a deadline.</p>
            </div>
            <button className="erp-icon-button" type="button" onClick={() => setFormOpen(false)}>×</button>
          </div>

          <form onSubmit={submitForm} className="erp-notification-list" style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <input className="erp-search__input" placeholder="RFQ Number (auto-generated)" value={editId ? '' : 'Auto-generated'} disabled />
              <input className="erp-search__input" placeholder="Title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
              <input className="erp-search__input" placeholder="Deadline" type="datetime-local" value={form.deadline} onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))} required />
              <select className="erp-search__input" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="awarded">Awarded</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <textarea className="erp-search__input" style={{ minHeight: '96px', paddingTop: '12px' }} placeholder="Description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />

            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="erp-card__title" style={{ fontSize: '1rem' }}>Vendor Assignment</div>
              <select className="erp-search__input" multiple value={form.vendor_ids} onChange={(event) => setForm((prev) => ({
                ...prev,
                vendor_ids: Array.from(event.target.selectedOptions).map((option) => option.value),
              }))} style={{ minHeight: '140px' }}>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_code} - {vendor.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="erp-card__title" style={{ fontSize: '1rem' }}>Products</div>
              {form.items.map((item, index) => (
                <div key={`${index}-${item.product_name}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <input className="erp-search__input" placeholder="Product" value={item.product_name} onChange={(event) => updateItem(index, 'product_name', event.target.value)} required />
                  <input className="erp-search__input" placeholder="Quantity" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                  <input className="erp-search__input" placeholder="Unit" value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} />
                  <input className="erp-search__input" placeholder="Notes" value={item.notes} onChange={(event) => updateItem(index, 'notes', event.target.value)} />
                  <button className="erp-icon-button" type="button" onClick={() => removeItem(index)}>Remove</button>
                </div>
              ))}
              <button className="erp-icon-button" type="button" style={{ width: 'fit-content' }} onClick={addItem}>+ Add Product</button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="erp-card__title" style={{ fontSize: '1rem' }}>Attachments</div>
              <input className="erp-search__input" type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} />
              {attachments.length > 0 ? <div className="erp-card__subtitle">{attachments.length} file(s) selected</div> : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="erp-icon-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
              <button className="erp-icon-button" type="submit">Save RFQ</button>
            </div>
          </form>
        </section>
      ) : null}
    </EnterpriseErpLayout>
  );
};

export default RfqManagementPage;