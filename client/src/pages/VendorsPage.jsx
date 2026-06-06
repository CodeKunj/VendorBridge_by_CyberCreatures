import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  Plus, 
  Search, 
  Check, 
  X, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle 
} from 'lucide-react';

const VendorsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [vendorUsers, setVendorUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    company_name: '',
    category: '',
    gst_number: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    user_id: ''
  });

  const [selectedVendor, setSelectedVendor] = useState(null);

  const isAdminOrProcurement = user?.role === 'admin' || user?.role === 'procurement_officer';

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAdminOrProcurement) {
        const res = await erpApi.vendors.list();
        setVendors(res.data || []);
        
        const usersRes = await erpApi.users.list();
        const availableVendorUsers = (usersRes.data || []).filter(u => u.role === 'vendor');
        setVendorUsers(availableVendorUsers);
      } else if (user?.role === 'vendor') {
        const res = await erpApi.vendors.list();
        const myProfile = (res.data || []).find(v => v.user_id === user.id);
        if (myProfile) {
          setSelectedVendor(myProfile);
        } else {
          setNewVendor(prev => ({ ...prev, email: user.email, company_name: user.name, user_id: user.id }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch vendor data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...newVendor,
        vendor_code: 'VND-' + Math.floor(1000 + Math.random() * 9000),
        user_id: newVendor.user_id || null
      };
      await erpApi.vendors.create(payload);
      setSuccess('Vendor onboarding submitted successfully');
      setShowCreateModal(false);
      setNewVendor({
        company_name: '',
        category: '',
        gst_number: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        user_id: ''
      });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to register vendor');
    }
  };

  const handleUpdateStatus = async (vendorId, status) => {
    setError('');
    setSuccess('');
    try {
      await erpApi.vendors.update(vendorId, { status });
      setSuccess(`Vendor status updated to ${status}`);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update vendor status');
    }
  };

  const handleUpdateSelfProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (selectedVendor?.id) {
        await erpApi.vendors.update(selectedVendor.id, selectedVendor);
        setSuccess('Profile updated successfully');
      } else {
        const payload = {
          ...newVendor,
          vendor_code: 'VND-' + Math.floor(1000 + Math.random() * 9000),
          status: 'pending_verification'
        };
        const res = await erpApi.vendors.create(payload);
        setSelectedVendor(res);
        setSuccess('Vendor profile created and sent for verification');
      }
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.vendor_code?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Vendors' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="vendors"
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

        {/* ADMIN OR PROCUREMENT VIEW */}
        {isAdminOrProcurement && (
          <section className="erp-card">
            <div className="erp-card__header">
              <div>
                <h1 className="erp-card__title">Vendor Directory</h1>
                <p className="erp-card__subtitle">Manage supplier accounts and approval statuses.</p>
              </div>
              <button className="erp-btn erp-btn--primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> Onboard Supplier
              </button>
            </div>

            <div className="erp-card__body" style={{ display: 'grid', gap: '16px' }}>
              <div className="erp-search" style={{ maxWidth: '360px' }}>
                <span className="erp-search__icon"><Search size={15} /></span>
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  className="erp-search__input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-outline)' }}>
                  Loading supplier directory...
                </div>
              ) : filteredVendors.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-outline)' }}>
                  No suppliers registered yet.
                </div>
              ) : (
                <div className="erp-table-wrapper">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Company Name</th>
                        <th>Category</th>
                        <th>Contact Person</th>
                        <th>Contact info</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor.id}>
                          <td><strong>{vendor.vendor_code}</strong></td>
                          <td>{vendor.company_name}</td>
                          <td><span className="erp-badge erp-badge--info">{vendor.category}</span></td>
                          <td>{vendor.contact_person || 'N/A'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.82rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {vendor.email}</span>
                              {vendor.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--erp-outline)' }}><Phone size={12} /> {vendor.phone}</span>}
                            </div>
                          </td>
                          <td>
                            <span className={`erp-badge erp-badge--${
                              vendor.status === 'active' ? 'success' : 
                              vendor.status === 'suspended' ? 'danger' : 'warning'
                            }`}>
                              {vendor.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {vendor.status !== 'active' && (
                                <button 
                                  className="erp-btn erp-btn--secondary" 
                                  style={{ height: '32px', padding: '0 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleUpdateStatus(vendor.id, 'active')}
                                >
                                  Approve
                                </button>
                              )}
                              {vendor.status !== 'suspended' && (
                                <button 
                                  className="erp-btn erp-btn--danger" 
                                  style={{ height: '32px', padding: '0 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleUpdateStatus(vendor.id, 'suspended')}
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
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

        {/* VENDOR SELF PROFILE VIEW */}
        {user?.role === 'vendor' && (
          <section className="erp-card">
            <div className="erp-card__header">
              <div>
                <h1 className="erp-card__title">Vendor Profile</h1>
                <p className="erp-card__subtitle">Update your business details and credentials.</p>
              </div>
              <div>
                {selectedVendor ? (
                  <span className={`erp-badge erp-badge--${
                    selectedVendor.status === 'active' ? 'success' : 'warning'
                  }`}>
                    Status: {selectedVendor.status}
                  </span>
                ) : (
                  <span className="erp-badge erp-badge--danger">No profile registered</span>
                )}
              </div>
            </div>

            <div className="erp-card__body">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-outline)' }}>
                  Loading profile...
                </div>
              ) : selectedVendor ? (
                <form className="erp-form" onSubmit={handleUpdateSelfProfile}>
                  <div className="erp-grid-2">
                    <div className="erp-form-group">
                      <label className="erp-label">Company Name</label>
                      <input 
                        type="text" 
                        className="erp-input"
                        value={selectedVendor.company_name} 
                        onChange={(e) => setSelectedVendor({ ...selectedVendor, company_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="erp-form-group">
                      <label className="erp-label">Vendor Code</label>
                      <input type="text" className="erp-input" value={selectedVendor.vendor_code} disabled />
                    </div>
                  </div>

                  <div className="erp-grid-2">
                    <div className="erp-form-group">
                      <label className="erp-label">Business Category</label>
                      <input 
                        type="text" 
                        className="erp-input"
                        value={selectedVendor.category} 
                        onChange={(e) => setSelectedVendor({ ...selectedVendor, category: e.target.value })}
                        required
                      />
                    </div>
                    <div className="erp-form-group">
                      <label className="erp-label">GST / Tax ID</label>
                      <input 
                        type="text" 
                        className="erp-input"
                        value={selectedVendor.gst_number || ''} 
                        onChange={(e) => setSelectedVendor({ ...selectedVendor, gst_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="erp-grid-3">
                    <div className="erp-form-group">
                      <label className="erp-label">Contact Representative</label>
                      <input 
                        type="text" 
                        className="erp-input"
                        value={selectedVendor.contact_person || ''} 
                        onChange={(e) => setSelectedVendor({ ...selectedVendor, contact_person: e.target.value })}
                      />
                    </div>
                    <div className="erp-form-group">
                      <label className="erp-label">Business Email</label>
                      <input 
                        type="email" 
                        className="erp-input"
                        value={selectedVendor.email} 
                        onChange={(e) => setSelectedVendor({ ...selectedVendor, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="erp-form-group">
                      <label className="erp-label">Phone Number</label>
                      <input 
                        type="text" 
                        className="erp-input"
                        value={selectedVendor.phone || ''} 
                        onChange={(e) => setSelectedVendor({ ...selectedVendor, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-label">Registered Office Address</label>
                    <textarea 
                      className="erp-textarea"
                      value={selectedVendor.address || ''} 
                      onChange={(e) => setSelectedVendor({ ...selectedVendor, address: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="erp-btn erp-btn--primary" style={{ width: 'max-content' }}>
                    Update Profile
                  </button>
                </form>
              ) : (
                <div>
                  <p style={{ color: 'var(--erp-outline)', marginBottom: '16px' }}>
                    Register your business to begin verified operations.
                  </p>
                  <form className="erp-form" onSubmit={handleUpdateSelfProfile}>
                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">Company Name</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={newVendor.company_name} 
                          onChange={(e) => setNewVendor({ ...newVendor, company_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Business Category</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          placeholder="e.g. IT, Logistics"
                          value={newVendor.category} 
                          onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="erp-grid-3">
                      <div className="erp-form-group">
                        <label className="erp-label">Email</label>
                        <input type="email" className="erp-input" value={newVendor.email} disabled />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Phone</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={newVendor.phone} 
                          onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">GST / Tax Details</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={newVendor.gst_number} 
                          onChange={(e) => setNewVendor({ ...newVendor, gst_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <button type="submit" className="erp-btn erp-btn--primary" style={{ width: 'max-content' }}>
                      Register Business
                    </button>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ONBOARD MODAL */}
        {showCreateModal && (
          <div className="erp-modal-overlay">
            <div className="erp-modal" style={{ width: 'min(720px, 95vw)' }}>
              <div className="erp-modal__header">
                <h3 className="erp-card__title">Onboard Supplier</h3>
                <button 
                  style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateVendor}>
                <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="erp-form">
                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">Company Name</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={newVendor.company_name} 
                          onChange={(e) => setNewVendor({ ...newVendor, company_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Business Category</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          placeholder="e.g. Raw Materials"
                          value={newVendor.category} 
                          onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">Email Address</label>
                        <input 
                          type="email" 
                          className="erp-input"
                          value={newVendor.email} 
                          onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Phone Number</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={newVendor.phone} 
                          onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">GSTIN / Tax ID</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={newVendor.gst_number} 
                          onChange={(e) => setNewVendor({ ...newVendor, gst_number: e.target.value })}
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Associate User Account</label>
                        <select 
                          className="erp-select"
                          value={newVendor.user_id}
                          onChange={(e) => setNewVendor({ ...newVendor, user_id: e.target.value })}
                        >
                          <option value="">-- No linked user --</option>
                          {vendorUsers.map(vu => (
                            <option key={vu.id} value={vu.id}>{vu.name} ({vu.email})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Contact Person</label>
                      <input 
                        type="text" 
                        className="erp-input"
                        value={newVendor.contact_person} 
                        onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                      />
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Office Address</label>
                      <textarea 
                        className="erp-textarea"
                        value={newVendor.address} 
                        onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="erp-modal__footer">
                  <button type="button" className="erp-btn erp-btn--outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary">
                    Verify & Onboard
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </EnterpriseErpLayout>
  );
};

export default VendorsPage;
