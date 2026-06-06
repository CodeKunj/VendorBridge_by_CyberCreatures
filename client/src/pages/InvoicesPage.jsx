import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';

const InvoicesPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab State: 'pos' | 'invoices'
  const [activeTab, setActiveTab] = useState('pos');

  // Lists state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected details
  const [selectedPo, setSelectedPo] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // New Invoice Modal (Vendor creating invoice from PO)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    subtotal: 0,
    tax_amount: 0,
    due_date: ''
  });

  const isProcurement = user?.role === 'procurement_officer' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isVendor = user?.role === 'vendor';

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'pos') {
        const res = await erpApi.purchaseOrders.list();
        setPurchaseOrders(res.data || []);
      } else {
        const res = await erpApi.invoices.list();
        setInvoices(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch transaction data');
    } finally {
      setLoading(false);
    }
  };

  const loadPoDetails = async (po) => {
    setError('');
    setSelectedPo(po);
    setSelectedInvoice(null);
  };

  const loadInvoiceDetails = async (inv) => {
    setError('');
    setSelectedInvoice(inv);
    setSelectedPo(null);
  };

  // PO Action methods
  const handleUpdatePoStatus = async (poId, status) => {
    setError('');
    setSuccess('');
    try {
      await erpApi.purchaseOrders.updateStatus(poId, status);
      setSuccess(`Purchase Order status updated to ${status}`);
      fetchData();
      setSelectedPo(null);
    } catch (err) {
      setError(err.message || 'Failed to update Purchase Order status');
    }
  };

  // Vendor creating invoice from PO
  const handleOpenInvoiceModal = (po) => {
    setSelectedPo(po);
    setNewInvoice({
      subtotal: po.total_amount,
      tax_amount: parseFloat((po.total_amount * 0.18).toFixed(2)), // 18% GST estimate
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 15 days net terms
    });
    setShowInvoiceModal(true);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const sub = parseFloat(newInvoice.subtotal);
      const tax = parseFloat(newInvoice.tax_amount);
      const payload = {
        po_id: selectedPo.id,
        vendor_id: selectedPo.vendor_id,
        subtotal: sub,
        tax_amount: tax,
        total_amount: sub + tax,
        due_date: new Date(newInvoice.due_date).toISOString()
      };
      const res = await erpApi.invoices.create(payload);
      setSuccess(`Invoice created and submitted successfully: ${res.invoice_number}`);
      setShowInvoiceModal(false);
      setActiveTab('invoices');
      setSelectedPo(null);
    } catch (err) {
      setError(err.message || 'Failed to submit invoice');
    }
  };

  // Invoice Action methods
  const handleUpdateInvoiceStatus = async (invoiceId, status) => {
    setError('');
    setSuccess('');
    try {
      await erpApi.invoices.updateStatus(invoiceId, status);
      setSuccess(`Invoice marked as ${status}`);
      fetchData();
      setSelectedInvoice(null);
    } catch (err) {
      setError(err.message || 'Failed to update invoice status');
    }
  };

  const handleSendInvoiceEmail = async (invoiceId) => {
    setError('');
    setSuccess('');
    try {
      await erpApi.invoices.sendEmail(invoiceId);
      setSuccess('Invoice dispatched via email successfully');
    } catch (err) {
      setError(err.message || 'Failed to dispatch email');
    }
  };

  const handleNavigate = (item) => {
    if (item.id === 'dashboard') {
      navigate('/dashboard');
    } else {
      navigate(`/${item.id}`);
    }
  };

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
        <span className="erp-breadcrumbs__item">ERP Dashboard</span>
        <span className="erp-breadcrumbs__separator">/</span>
        <span className="erp-breadcrumbs__current">Billing & Invoices</span>
      </div>

      <div className="erp-content">
        {error && <div className="erp-alert erp-alert--danger">{error}</div>}
        {success && <div className="erp-alert erp-alert--success">{success}</div>}

        {/* TABS */}
        <div className="erp-tabs">
          <button 
            className={`erp-tab ${activeTab === 'pos' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('pos'); setSelectedPo(null); setSelectedInvoice(null); }}
          >
            Purchase Orders (POs)
          </button>
          <button 
            className={`erp-tab ${activeTab === 'invoices' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('invoices'); setSelectedInvoice(null); setSelectedPo(null); }}
          >
            Vendor Invoices
          </button>
        </div>

        <div className="erp-grid-2" style={{ alignItems: 'start' }}>
          {/* LIST CONTAINER */}
          <section className="erp-card">
            <div className="erp-card__header">
              <h2 className="erp-card__title">
                {activeTab === 'pos' ? 'Purchase Orders Registry' : 'Accounts Payable Invoices'}
              </h2>
            </div>

            <div className="erp-card__body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-text-muted)' }}>
                  Loading transaction data...
                </div>
              ) : activeTab === 'pos' ? (
                purchaseOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-text-muted)' }}>
                    No purchase orders found.
                  </div>
                ) : (
                  <div className="erp-table-wrapper">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>Issued Date</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.map(po => (
                          <tr 
                            key={po.id} 
                            onClick={() => loadPoDetails(po)}
                            style={{ cursor: 'pointer', background: selectedPo?.id === po.id ? 'rgba(45,107,179,0.06)' : '' }}
                          >
                            <td><strong>{po.po_number}</strong></td>
                            <td>{new Date(po.created_at).toLocaleDateString()}</td>
                            <td><strong>${po.total_amount}</strong></td>
                            <td>
                              <span className={`erp-badge erp-badge--${
                                po.status === 'issued' ? 'info' :
                                po.status === 'accepted' ? 'success' :
                                po.status === 'completed' ? 'success' :
                                po.status === 'cancelled' ? 'danger' : 'draft'
                              }`}>
                                {po.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                invoices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-text-muted)' }}>
                    No invoices recorded.
                  </div>
                ) : (
                  <div className="erp-table-wrapper">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Invoice Number</th>
                          <th>Due Date</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(inv => (
                          <tr 
                            key={inv.id} 
                            onClick={() => loadInvoiceDetails(inv)}
                            style={{ cursor: 'pointer', background: selectedInvoice?.id === inv.id ? 'rgba(45,107,179,0.06)' : '' }}
                          >
                            <td><strong>{inv.invoice_number}</strong></td>
                            <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                            <td><strong>${inv.total_amount}</strong></td>
                            <td>
                              <span className={`erp-badge erp-badge--${
                                inv.status === 'paid' ? 'success' :
                                inv.status === 'approved' ? 'info' :
                                inv.status === 'voided' ? 'danger' : 'warning'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </section>

          {/* DETAILS BOX */}
          <section className="erp-card">
            <div className="erp-card__header">
              <h2 className="erp-card__title">Details panel</h2>
            </div>
            <div className="erp-card__body">
              {/* Selected PO Details */}
              {selectedPo && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>PO Code: {selectedPo.po_number}</h3>
                    <div style={{ fontSize: '0.88rem', display: 'grid', gap: '4px', marginTop: '10px' }}>
                      <span><strong>Total Cost Amount:</strong> ${selectedPo.total_amount}</span>
                      <span><strong>Release Date:</strong> {new Date(selectedPo.created_at).toLocaleString()}</span>
                      <span>
                        <strong>Current Status:</strong>{' '}
                        <span className={`erp-badge erp-badge--info`}>{selectedPo.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* DOCUMENT GENERATION & EXPORT LINKS */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a 
                      href={erpApi.purchaseOrders.downloadPdfUrl(selectedPo.id)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="erp-btn erp-btn--secondary"
                    >
                      Download PO PDF
                    </a>
                  </div>

                  {/* ROLE ACTIONS FOR PO */}
                  {isProcurement && selectedPo.status === 'draft' && (
                    <button className="erp-btn erp-btn--primary" onClick={() => handleUpdatePoStatus(selectedPo.id, 'issued')}>
                      Issue Purchase Order
                    </button>
                  )}
                  {isVendor && selectedPo.status === 'issued' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="erp-btn erp-btn--primary" onClick={() => handleUpdatePoStatus(selectedPo.id, 'accepted')}>
                        Accept Order
                      </button>
                      <button className="erp-btn erp-btn--danger" onClick={() => handleUpdatePoStatus(selectedPo.id, 'cancelled')}>
                        Reject Order
                      </button>
                    </div>
                  )}
                  {isVendor && selectedPo.status === 'accepted' && (
                    <div style={{ background: '#f8fafc', border: '1px solid var(--erp-border)', padding: '14px', borderRadius: '12px' }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600 }}>Billing Actions</p>
                      <button className="erp-btn erp-btn--primary" onClick={() => handleOpenInvoiceModal(selectedPo)}>
                        Create & Submit Invoice
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Invoice Details */}
              {selectedInvoice && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>Code: {selectedInvoice.invoice_number}</h3>
                    <div style={{ fontSize: '0.88rem', display: 'grid', gap: '6px', marginTop: '10px' }}>
                      <span><strong>Subtotal:</strong> ${selectedInvoice.subtotal}</span>
                      <span><strong>Tax / GST (18%):</strong> ${selectedInvoice.tax_amount}</span>
                      <span><strong>Total Invoice Bill:</strong> <strong>${selectedInvoice.total_amount}</strong></span>
                      <span><strong>Due Term Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</span>
                      <span>
                        <strong>Status:</strong>{' '}
                        <span className={`erp-badge erp-badge--${
                          selectedInvoice.status === 'paid' ? 'success' : 'warning'
                        }`}>{selectedInvoice.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* DOCUMENT GENERATION & EXPORT LINKS */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a 
                      href={erpApi.invoices.downloadPdfUrl(selectedInvoice.id)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="erp-btn erp-btn--secondary"
                    >
                      Download Invoice PDF
                    </a>
                    <button className="erp-btn erp-btn--outline" onClick={() => handleSendInvoiceEmail(selectedInvoice.id)}>
                      Email Invoice PDF
                    </button>
                  </div>

                  {/* FINANCE OVERRIDE STATUS FOR PROCUREMENT/MANAGER */}
                  {(isProcurement || isManager) && selectedInvoice.status !== 'paid' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="erp-btn erp-btn--primary" onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'paid')}>
                        Mark as Paid
                      </button>
                      <button className="erp-btn erp-btn--danger" onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'voided')}>
                        Void Invoice
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!selectedPo && !selectedInvoice && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                  Select a record from the table to view invoice items, trigger dispatch mails, or download PDFs.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* CREATE INVOICE MODAL */}
        {showInvoiceModal && (
          <div className="erp-modal-overlay">
            <div className="erp-modal">
              <div className="erp-modal__header">
                <h3 className="erp-card__title">Create Invoice</h3>
                <button 
                  style={{ border: 0, background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}
                  onClick={() => setShowInvoiceModal(false)}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleCreateInvoice}>
                <div className="erp-modal__body">
                  <div className="erp-form">
                    <div className="erp-form-group">
                      <label className="erp-label">Associated Purchase Order</label>
                      <input type="text" className="erp-input" value={selectedPo?.po_number} disabled />
                    </div>

                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">Subtotal Amount ($)</label>
                        <input 
                          type="number" 
                          className="erp-input"
                          value={newInvoice.subtotal} 
                          onChange={(e) => {
                            const sub = parseFloat(e.target.value) || 0;
                            setNewInvoice({ ...newInvoice, subtotal: sub, tax_amount: parseFloat((sub * 0.18).toFixed(2)) });
                          }}
                          required
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Tax / GST (18%) ($)</label>
                        <input 
                          type="number" 
                          className="erp-input"
                          value={newInvoice.tax_amount} 
                          onChange={(e) => setNewInvoice({ ...newInvoice, tax_amount: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>

                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">Payment Due Date</label>
                        <input 
                          type="date" 
                          className="erp-input"
                          value={newInvoice.due_date} 
                          onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="erp-form-group">
                        <label className="erp-label">Total Bill Amount ($)</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={`$${(parseFloat(newInvoice.subtotal) + parseFloat(newInvoice.tax_amount)).toFixed(2)}`}
                          disabled 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="erp-modal__footer">
                  <button type="button" className="erp-btn erp-btn--outline" onClick={() => setShowInvoiceModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary">
                    Submit Bill Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EnterpriseErpLayout>
  );
};

export default InvoicesPage;
