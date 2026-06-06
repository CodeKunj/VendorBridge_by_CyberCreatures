import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { vendorApi } from '../api/vendorApi';

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

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Vendors' },
  ]), []);

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
    if (item.id === 'vendors') {
      navigate('/vendors');
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

    if (editId) {
      await vendorApi.update(editId, payload);
    } else {
      await vendorApi.create(payload);
    }

    setFormOpen(false);
    await loadVendors(meta.page || 1);
  };

  const deleteVendor = async (vendorId) => {
    if (!window.confirm('Delete this vendor?')) {
      return;
    }

    await vendorApi.remove(vendorId);
    await loadVendors(meta.page || 1);
  };

  const paginationButtons = Array.from({ length: meta.totalPages || 1 }, (_, index) => index + 1);

  return (
    <EnterpriseErpLayout
      user={user}
      breadcrumbs={breadcrumbs}
      activeNavId="vendors"
      notifications={[]}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/dashboard')}
    >
      <section className="erp-card">
        <div className="erp-card__header">
          <div>
            <h1 className="erp-card__title">Vendor Management</h1>
            <p className="erp-card__subtitle">Add, edit, delete, search, filter, and track vendor status from one place.</p>
          </div>
          <button className="erp-icon-button" type="button" style={{ width: 'auto', padding: '0 16px' }} onClick={openCreate}>
            + Add Vendor
          </button>
        </div>

        <div className="erp-card__body" style={{ display: 'grid', gap: '18px' }}>
          {error ? <div className="erp-notification-item" style={{ borderColor: '#ef4444' }}>{error}</div> : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <input className="erp-search__input" placeholder="Search vendors" value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} />
            <select className="erp-search__input" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              {statusOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All Statuses' : option.replaceAll('_', ' ')}</option>)}
            </select>
            <select className="erp-search__input" value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}>
              {categoryOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All Categories' : option}</option>)}
            </select>
            <button className="erp-icon-button" type="button" style={{ width: 'auto', padding: '0 16px' }} onClick={() => loadVendors(1)}>
              Apply Filters
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '12px' }}>Vendor Code</th>
                  <th style={{ padding: '12px' }}>Company</th>
                  <th style={{ padding: '12px' }}>GST</th>
                  <th style={{ padding: '12px' }}>Contact</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Phone</th>
                  <th style={{ padding: '12px' }}>Category</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ padding: '16px' }}>Loading vendors...</td></tr>
                ) : vendors.length === 0 ? (
                  <tr><td colSpan="9" style={{ padding: '16px' }}>No vendors found.</td></tr>
                ) : vendors.map((vendor) => (
                  <tr key={vendor.id} style={{ borderTop: '1px solid #e5eef8' }}>
                    <td style={{ padding: '12px' }}>{vendor.vendor_code}</td>
                    <td style={{ padding: '12px' }}>{vendor.company_name}</td>
                    <td style={{ padding: '12px' }}>{vendor.gst_number}</td>
                    <td style={{ padding: '12px' }}>{vendor.contact_person}</td>
                    <td style={{ padding: '12px' }}>{vendor.email}</td>
                    <td style={{ padding: '12px' }}>{vendor.phone}</td>
                    <td style={{ padding: '12px' }}>{vendor.category}</td>
                    <td style={{ padding: '12px' }}>{vendor.status?.replaceAll('_', ' ')}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      <button className="erp-icon-button" type="button" onClick={() => openEdit(vendor)}>Edit</button>
                      <button className="erp-icon-button" type="button" onClick={() => deleteVendor(vendor.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {paginationButtons.map((pageNumber) => (
              <button key={pageNumber} type="button" className="erp-icon-button" onClick={() => loadVendors(pageNumber)}>
                {pageNumber}
              </button>
            ))}
          </div>
        </div>
      </section>

      {formOpen ? (
        <div className="erp-layout-overlay" onClick={() => setFormOpen(false)} aria-hidden="true" />
      ) : null}

      {formOpen ? (
        <section className="erp-notification-panel" style={{ width: 'min(760px, calc(100vw - 32px))', right: '50%', transform: 'translateX(50%)' }}>
          <div className="erp-notification-panel__header">
            <div>
              <h2 className="erp-notification-panel__title">{editId ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <p className="erp-card__subtitle">Fill in the vendor master details.</p>
            </div>
            <button className="erp-icon-button" type="button" onClick={() => setFormOpen(false)}>×</button>
          </div>

          <form className="erp-notification-list" onSubmit={saveVendor} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', display: 'grid', gap: '12px' }}>
            <input className="erp-search__input" placeholder="Vendor Code" value={editId ? form.vendor_code : 'Auto-generated'} disabled />
            <input className="erp-search__input" placeholder="Company Name" value={form.company_name} onChange={(event) => setForm((prev) => ({ ...prev, company_name: event.target.value }))} required />
            <input className="erp-search__input" placeholder="GST Number" value={form.gst_number} onChange={(event) => setForm((prev) => ({ ...prev, gst_number: event.target.value }))} required />
            <input className="erp-search__input" placeholder="Contact Person" value={form.contact_person} onChange={(event) => setForm((prev) => ({ ...prev, contact_person: event.target.value }))} required />
            <input className="erp-search__input" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
            <input className="erp-search__input" placeholder="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} required />
            <input className="erp-search__input" placeholder="Address" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} required />
            <input className="erp-search__input" placeholder="Category" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} required />
            <select className="erp-search__input" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="pending_verification">Pending Verification</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', gridColumn: '1 / -1' }}>
              <button className="erp-icon-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
              <button className="erp-icon-button" type="submit">Save Vendor</button>
            </div>
          </form>
        </section>
      ) : null}
    </EnterpriseErpLayout>
  );
};

export default VendorManagementPage;