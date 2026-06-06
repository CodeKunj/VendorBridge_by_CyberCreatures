import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { vendorApi } from '../api/vendorApi';
import { 
  AlertCircle, 
  Check, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Filter,
  Building, 
  Mail, 
  Phone, 
  User, 
  Globe,
  X
} from 'lucide-react';

const defaultForm = {
  vendor_code: '',
  company_name: '',
  gst_number: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  category: '',
  status: 'pending_verification',
};

const statusOptions = ['all', 'active', 'inactive', 'pending_verification', 'suspended'];
const categoryOptions = ['all', 'Raw Material', 'Services', 'Logistics', 'IT', 'Manufacturing', 'Packaging'];

const VendorManagementPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all', category: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const loadVendors = async (nextPage = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await vendorApi.list({
        page: nextPage,
        limit: meta.limit,
        search: filters.search,
        status: filters.status === 'all' ? '' : filters.status,
        category: filters.category === 'all' ? '' : filters.category,
      });

      setVendors(response.data || []);
      setMeta(response.meta || meta);
    } catch (err) {
      setError(err.message || 'Unable to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setFormOpen(true);
  };

  const openEdit = async (vendor) => {
    setEditId(vendor.id);
    setForm({
      vendor_code: vendor.vendor_code,
      company_name: vendor.company_name || '',
      gst_number: vendor.gst_number || '',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      category: vendor.category || '',
      status: vendor.status || 'pending_verification',
    });
    setFormOpen(true);
  };

  const saveVendor = async (event) => {
    event.preventDefault();

    const payload = {
      company_name: form.company_name,
      gst_number: form.gst_number,
      contact_person: form.contact_person,
      email: form.email,
      phone: form.phone,
      address: form.address,
      category: form.category,
      status: form.status,
    };

    try {
      if (editId) {
        await vendorApi.update(editId, payload);
      } else {
        await vendorApi.create(payload);
      }
      setFormOpen(false);
      await loadVendors(meta.page || 1);
    } catch (err) {
      if (err.payload?.errors) {
        const fieldErrors = err.payload.errors.map(e => `${e.field}: ${e.message}`).join(', ');
        setError(`Validation failed - ${fieldErrors}`);
      } else if (err.payload?.message) {
        setError(err.payload.message);
      } else {
        setError(err.message || 'Failed to save vendor details');
      }
    }
  };

  const deleteVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    try {
      await vendorApi.remove(vendorId);
      await loadVendors(meta.page || 1);
    } catch (err) {
      setError(err.message || 'Failed to delete vendor');
    }
  };

  const paginationButtons = Array.from({ length: meta.totalPages || 1 }, (_, index) => index + 1);

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Vendor Registry' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="vendors"
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
        <div className="erp-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 className="erp-title">Vendor Management</h1>
            <p className="erp-subtitle">Add, edit, delete, search, filter, and track vendor status from one place.</p>
          </div>
          <button className="erp-btn erp-btn--primary" type="button" onClick={openCreate}>
            <Plus size={15} /> Add Vendor
          </button>
        </div>

        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}

        {/* Filter and Search Bar */}
        <section className="erp-card" style={{ marginBottom: '20px' }}>
          <div className="erp-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
            <div className="erp-form-group" style={{ margin: 0 }}>
              <label className="erp-label">Search Query</label>
              <input 
                className="erp-input" 
                placeholder="Name, code, or GST..." 
                value={filters.search} 
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} 
              />
            </div>
            
            <div className="erp-form-group" style={{ margin: 0 }}>
              <label className="erp-label">Filter Status</label>
              <select 
                className="erp-select" 
                value={filters.status} 
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Statuses' : option.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="erp-form-group" style={{ margin: 0 }}>
              <label className="erp-label">Filter Category</label>
              <select 
                className="erp-select" 
                value={filters.category} 
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Categories' : option}
                  </option>
                ))}
              </select>
            </div>

            <button 
              className="erp-btn erp-btn--outline" 
              type="button" 
              style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }} 
              onClick={() => loadVendors(1)}
            >
              <Filter size={14} /> Apply Filters
            </button>
          </div>
        </section>

        {/* Registry Table */}
        <section className="erp-card">
          <div className="erp-card__body" style={{ padding: 0 }}>
            <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Vendor Code</th>
                    <th>Company</th>
                    <th>GST Number</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-outline)' }}>Loading vendors registry...</td></tr>
                  ) : vendors.length === 0 ? (
                    <tr><td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-outline)' }}>No vendors found in registry.</td></tr>
                  ) : vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td><span className="erp-badge erp-badge--draft">{vendor.vendor_code}</span></td>
                      <td style={{ fontWeight: 600 }}>{vendor.company_name}</td>
                      <td>{vendor.gst_number || '-'}</td>
                      <td>{vendor.contact_person || '-'}</td>
                      <td>{vendor.email}</td>
                      <td>{vendor.phone || '-'}</td>
                      <td>{vendor.category || '-'}</td>
                      <td>
                        <span className={`erp-badge erp-badge--${
                          vendor.status === 'active' ? 'success' : vendor.status === 'suspended' ? 'danger' : 'warning'
                        }`}>
                          {vendor.status?.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="erp-btn erp-btn--outline" 
                            style={{ padding: '4px 8px', height: '28px', fontSize: '0.75rem' }} 
                            onClick={() => openEdit(vendor)}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button 
                            className="erp-btn erp-btn--danger" 
                            style={{ padding: '4px 8px', height: '28px', fontSize: '0.75rem' }} 
                            onClick={() => deleteVendor(vendor.id)}
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

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {paginationButtons.map((pageNumber) => (
              <button 
                key={pageNumber} 
                type="button" 
                className={`erp-btn ${meta.page === pageNumber ? 'erp-btn--primary' : 'erp-btn--outline'}`}
                style={{ padding: '4px 10px', minWidth: '32px', height: '32px' }}
                onClick={() => loadVendors(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
        )}

      {/* FORM MODAL DIALOG */}
      {formOpen && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ width: 'min(700px, 95vw)' }}>
            <div className="erp-modal__header">
              <h3 className="erp-card__title">{editId ? 'Edit Vendor Registry' : 'Register New Vendor'}</h3>
              <button style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => setFormOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={saveVendor}>
              <div className="erp-modal__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="erp-form-group">
                  <label className="erp-label">Vendor Code</label>
                  <input className="erp-input" value={editId ? form.vendor_code : 'Auto-generated'} disabled />
                </div>
                <div className="erp-form-group">
                  <label className="erp-label">Company Name</label>
                  <input className="erp-input" value={form.company_name} onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))} required />
                </div>
                <div className="erp-form-group">
                  <label className="erp-label">GSTIN / Tax Registration</label>
                  <input className="erp-input" value={form.gst_number} onChange={(e) => setForm((prev) => ({ ...prev, gst_number: e.target.value }))} required />
                </div>
                <div className="erp-form-group">
                  <label className="erp-label">Contact Person</label>
                  <input className="erp-input" value={form.contact_person} onChange={(e) => setForm((prev) => ({ ...prev, contact_person: e.target.value }))} required />
                </div>
                <div className="erp-form-group">
                  <label className="erp-label">Email Address</label>
                  <input className="erp-input" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div className="erp-form-group">
                  <label className="erp-label">Phone Number</label>
                  <input className="erp-input" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                </div>
                <div className="erp-form-group">
                  <label className="erp-label">Registry Category</label>
                  <input className="erp-input" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} required />
                </div>
                <div className="erp-form-group">
                  <label className="erp-label">Registry Status</label>
                  <select className="erp-select" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="pending_verification">Pending Verification</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="erp-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="erp-label">Office Location Address</label>
                  <textarea className="erp-textarea" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} required />
                </div>
              </div>

              <div className="erp-modal__footer">
                <button type="button" className="erp-btn erp-btn--outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn--primary">
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EnterpriseErpLayout>
  );
};

export default VendorManagementPage;