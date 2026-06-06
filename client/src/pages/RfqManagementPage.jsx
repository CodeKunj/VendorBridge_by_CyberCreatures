import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../api/rfqApi';
import { vendorApi } from '../api/vendorApi';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Paperclip,
  X,
  AlertCircle
} from 'lucide-react';

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
    try {
      const response = await vendorApi.list({ limit: 100, status: 'active' });
      setVendors(response.data || []);
    } catch (err) {
      console.warn('Failed to load active vendors:', err);
    }
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
    loadVendors();
    loadRfqs(1);
  }, []);

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
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
    setError('');
    try {
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
    } catch (err) {
      if (err.payload && err.payload.errors) {
        const details = err.payload.errors.map((e) => `${e.field}: ${e.message}`).join(', ');
        setError(`Validation failed - ${details}`);
      } else {
        setError(err.message || 'Failed to save RFQ');
      }
    }
  };

  const deleteRfq = async (rfqId) => {
    if (!window.confirm('Are you sure you want to delete this RFQ?')) {
      return;
    }
    try {
      await rfqApi.remove(rfqId);
      await loadRfqs(meta.page || 1);
    } catch (err) {
      setError(err.message || 'Failed to delete RFQ');
    }
  };

  const publishRfq = async (rfqId) => {
    try {
      await rfqApi.publish(rfqId);
      await loadRfqs(meta.page || 1);
    } catch (err) {
      setError(err.message || 'Failed to publish RFQ');
    }
  };

  const closeRfq = async (rfqId) => {
    try {
      await rfqApi.close(rfqId);
      await loadRfqs(meta.page || 1);
    } catch (err) {
      setError(err.message || 'Failed to close RFQ');
    }
  };

  const paginationButtons = Array.from({ length: meta.totalPages || 1 }, (_, index) => index + 1);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="rfqs"
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
      <div className="erp-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 className="erp-title">RFQ Management</h1>
            <p className="erp-subtitle">Create, publish, and assign request documents for bidding.</p>
          </div>
          <button className="erp-btn erp-btn--primary" onClick={openCreate}>
            <Plus size={16} /> Create RFQ
          </button>
        </div>

        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}

        {/* Filters Bar */}
        <section className="erp-card" style={{ marginBottom: '20px' }}>
          <div className="erp-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
            <div className="erp-form-group" style={{ margin: 0 }}>
              <label className="erp-label">Search Query</label>
              <input 
                className="erp-input" 
                placeholder="Search RFQs..." 
                value={filters.search} 
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} 
              />
            </div>
            
            <div className="erp-form-group" style={{ margin: 0 }}>
              <label className="erp-label">Status Filter</label>
              <select 
                className="erp-select" 
                value={filters.status} 
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Statuses' : option.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <button 
              className="erp-btn erp-btn--outline" 
              style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }} 
              onClick={() => loadRfqs(1)}
            >
              <Filter size={14} /> Apply Filters
            </button>
          </div>
        </section>

        {/* RFQ Table */}
        <section className="erp-card">
          <div className="erp-card__body" style={{ padding: 0 }}>
            <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>RFQ Number</th>
                    <th>Title</th>
                    <th>Deadline</th>
                    <th>Products</th>
                    <th>Vendors</th>
                    <th>Attachments</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-outline)' }}>Loading RFQs...</td></tr>
                  ) : rfqs.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-outline)' }}>No RFQs found.</td></tr>
                  ) : rfqs.map((rfq) => (
                    <tr key={rfq.id}>
                      <td><span className="erp-badge erp-badge--draft">{rfq.rfq_number}</span></td>
                      <td style={{ fontWeight: 600 }}>{rfq.title}</td>
                      <td>{rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : '-'}</td>
                      <td><span className="erp-badge erp-badge--info">{rfq.rfq_items?.length || 0} items</span></td>
                      <td><span className="erp-badge erp-badge--draft">{rfq.rfq_vendor_assignments?.length || 0} vendors</span></td>
                      <td>
                        {rfq.rfq_attachments?.length > 0 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--erp-primary)' }}>
                            <Paperclip size={12} /> {rfq.rfq_attachments.length}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`erp-badge erp-badge--${
                          rfq.status === 'published' ? 'success' : 
                          rfq.status === 'closed' ? 'danger' : 
                          rfq.status === 'draft' ? 'draft' : 'warning'
                        }`}>
                          {rfq.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button 
                            className="erp-btn erp-btn--outline" 
                            style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }} 
                            onClick={() => navigate(`/compare/${rfq.id}`)}
                          >
                            <Eye size={12} /> Compare
                          </button>
                          <button 
                            className="erp-btn erp-btn--outline" 
                            style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }} 
                            onClick={() => openEdit(rfq)}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          {rfq.status === 'draft' && (
                            <button 
                              className="erp-btn erp-btn--primary" 
                              style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }} 
                              onClick={() => publishRfq(rfq.id)}
                            >
                              Publish
                            </button>
                          )}
                          {rfq.status === 'published' && (
                            <button 
                              className="erp-btn erp-btn--danger" 
                              style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }} 
                              onClick={() => closeRfq(rfq.id)}
                            >
                              Close
                            </button>
                          )}
                          <button 
                            className="erp-btn erp-btn--danger" 
                            style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }} 
                            onClick={() => deleteRfq(rfq.id)}
                          >
                            <Trash2 size={12} /> Delete
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

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '10px' }}>
            {paginationButtons.map((pageNumber) => (
              <button 
                key={pageNumber} 
                className={`erp-btn ${meta.page === pageNumber ? 'erp-btn--primary' : 'erp-btn--outline'}`} 
                style={{ height: '32px', width: '32px', padding: 0 }}
                onClick={() => loadRfqs(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
        )}

      {/* Edit Form Modal */}
      {formOpen && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ width: 'min(800px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="erp-modal__header">
              <h3 className="erp-card__title">{editId ? 'Edit RFQ Details' : 'Create New RFQ'}</h3>
              <button style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => setFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitForm}>
              <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div className="erp-form-group">
                    <label className="erp-label">RFQ Number</label>
                    <input className="erp-input" value={editId ? '' : 'Auto-generated'} disabled />
                  </div>
                  <div className="erp-form-group">
                    <label className="erp-label">Title</label>
                    <input className="erp-input" placeholder="RFQ Title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
                  </div>
                  <div className="erp-form-group">
                    <label className="erp-label">Deadline</label>
                    <input className="erp-input" type="datetime-local" value={form.deadline} onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))} required />
                  </div>
                  <div className="erp-form-group">
                    <label className="erp-label">Status</label>
                    <select className="erp-select" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                      <option value="awarded">Awarded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">RFQ Description</label>
                  <textarea className="erp-textarea" placeholder="Detail specifications here..." value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>

                {/* Vendor Assignment */}
                <div className="erp-form-group">
                  <label className="erp-label">Assign Suppliers</label>
                  <select 
                    className="erp-select" 
                    multiple 
                    value={form.vendor_ids} 
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      vendor_ids: Array.from(event.target.selectedOptions).map((option) => option.value),
                    }))} 
                    style={{ minHeight: '100px' }}
                  >
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_code} - {vendor.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Products section */}
                <div className="erp-form-group">
                  <label className="erp-label">Line Items</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {form.items.map((item, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '8px', alignItems: 'center' }}>
                        <input className="erp-input" placeholder="Product Name" value={item.product_name} onChange={(event) => updateItem(index, 'product_name', event.target.value)} required />
                        <input className="erp-input" placeholder="Qty" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                        <input className="erp-input" placeholder="Unit (e.g. Kg)" value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} />
                        <input className="erp-input" placeholder="Notes" value={item.notes} onChange={(event) => updateItem(index, 'notes', event.target.value)} />
                        <button className="erp-btn erp-btn--danger" style={{ height: '36px', padding: '0 10px' }} type="button" onClick={() => removeItem(index)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="erp-btn erp-btn--outline" type="button" style={{ marginTop: '8px', width: 'fit-content' }} onClick={addItem}>
                    <Plus size={13} /> Add Item Line
                  </button>
                </div>

                {/* Attachments */}
                <div className="erp-form-group">
                  <label className="erp-label">Documents & Specifications</label>
                  <input className="erp-input" type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} style={{ padding: '8px' }} />
                  {attachments.length > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--erp-outline)' }}>{attachments.length} files selected</span>}
                </div>
              </div>

              <div className="erp-modal__footer">
                <button className="erp-btn erp-btn--outline" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
                <button className="erp-btn erp-btn--primary" type="submit">Save RFQ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EnterpriseErpLayout>
  );
};

export default RfqManagementPage;