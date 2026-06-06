import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  FileText, 
  Printer, 
  Download, 
  Mail, 
  X, 
  Check, 
  AlertCircle, 
  Receipt,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const InvoicesPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Print Ref
  const printAreaRef = useRef(null);

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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

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
    setSelectedInvoice(null);
    setSelectedPo(null);
    setLoadingDetails(true);
    try {
      const res = await erpApi.purchaseOrders.getById(po.id);
      setSelectedPo(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load PO details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadInvoiceDetails = async (inv) => {
    setError('');
    setSelectedPo(null);
    setSelectedInvoice(null);
    setLoadingDetails(true);
    try {
      const res = await erpApi.invoices.getById(inv.id);
      setSelectedInvoice(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load Invoice details');
    } finally {
      setLoadingDetails(false);
    }
  };

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

  const handleOpenInvoiceModal = (po) => {
    setSelectedPo(po);
    setNewInvoice({
      subtotal: po.total_amount,
      tax_amount: parseFloat((po.total_amount * 0.18).toFixed(2)),
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
      await erpApi.invoices.create(payload);
      setSuccess(`Invoice created and submitted successfully!`);
      setShowInvoiceModal(false);
      setActiveTab('invoices');
      setSelectedPo(null);
    } catch (err) {
      setError(err.message || 'Failed to submit invoice');
    }
  };

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
    setSendingEmail(true);
    try {
      await erpApi.invoices.sendEmail(invoiceId);
      setSuccess('Invoice and PDF attachment dispatched via email successfully');
    } catch (err) {
      setError(err.message || 'Failed to dispatch email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPdf = (type, id) => {
    const url = type === 'po' 
      ? erpApi.purchaseOrders.downloadPdfUrl(id)
      : erpApi.invoices.downloadPdfUrl(id);
    const token = localStorage.getItem('vendorbridge.accessToken');
    const win = window.open(`${url}?access_token=${token}`, '_blank');
    if (win) win.focus();
  };

  const handlePrint = (type) => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print - ${type === 'po' ? selectedPo?.po_number : selectedInvoice?.invoice_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .col { width: 48%; }
            .row { display: flex; justify-content: space-between; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background-color: #f8f9fa; }
            .total { text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 20px; }
            .footer { margin-top: 50px; font-size: 0.85em; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Billing & Invoices' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="invoices"
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

        {/* TABS */}
        <div className="erp-tabs" style={{ marginBottom: '16px' }}>
          <button 
            className={`erp-tab ${activeTab === 'pos' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('pos'); setSelectedPo(null); setSelectedInvoice(null); }}
          >
            <FileText size={14} /> Purchase Orders (POs)
          </button>
          <button 
            className={`erp-tab ${activeTab === 'invoices' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('invoices'); setSelectedInvoice(null); setSelectedPo(null); }}
          >
            <Receipt size={14} /> Vendor Invoices
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* LEFT PANEL: RECORDS LIST */}
          <section className="erp-card">
            <div className="erp-card__header">
              <h2 className="erp-card__title">
                {activeTab === 'pos' ? 'Purchase Orders Registry' : 'Accounts Payable Invoices'}
              </h2>
            </div>

            <div className="erp-card__body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-outline)' }}>
                  Loading transaction data...
                </div>
              ) : activeTab === 'pos' ? (
                purchaseOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-outline)' }}>
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
                            style={{ 
                              cursor: 'pointer', 
                              background: selectedPo?.id === po.id ? 'var(--erp-surface-container)' : 'transparent' 
                            }}
                          >
                            <td><strong>{po.po_number}</strong></td>
                            <td>{new Date(po.created_at).toLocaleDateString()}</td>
                            <td><strong>{formatCurrency(po.total_amount)}</strong></td>
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
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--erp-outline)' }}>
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
                            style={{ 
                              cursor: 'pointer', 
                              background: selectedInvoice?.id === inv.id ? 'var(--erp-surface-container)' : 'transparent' 
                            }}
                          >
                            <td><strong>{inv.invoice_number}</strong></td>
                            <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                            <td><strong>{formatCurrency(inv.total_amount)}</strong></td>
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

          {/* RIGHT PANEL: INSPECTOR & PRINT PREVIEW */}
          <section className="erp-card" style={{ position: 'sticky', top: '16px' }}>
            <div className="erp-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="erp-card__title">Document Inspector</h2>
              </div>
              {selectedInvoice && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="erp-btn erp-btn--outline" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    onClick={() => handlePrint('invoice')}
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button 
                    className="erp-btn erp-btn--primary" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    onClick={() => handleDownloadPdf('invoice', selectedInvoice.id)}
                  >
                    <Download size={13} /> PDF
                  </button>
                </div>
              )}
              {selectedPo && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="erp-btn erp-btn--outline" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    onClick={() => handlePrint('po')}
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button 
                    className="erp-btn erp-btn--primary" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    onClick={() => handleDownloadPdf('po', selectedPo.id)}
                  >
                    <Download size={13} /> PDF
                  </button>
                </div>
              )}
            </div>

            <div className="erp-card__body">
              {loadingDetails ? (
                <p style={{ textAlign: 'center', color: 'var(--erp-outline)', padding: '20px' }}>Fetching details...</p>
              ) : selectedPo ? (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div ref={printAreaRef}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--erp-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--erp-primary)', fontWeight: 600 }}>Purchase Order</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--erp-outline)', marginTop: '4px' }}>
                          Number: <strong>{selectedPo.po_number}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        <div>Issued: {new Date(selectedPo.created_at).toLocaleDateString()}</div>
                        <div style={{ marginTop: '4px' }}>
                          Status: <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--erp-primary)' }}>{selectedPo.status}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.82rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Supplier:</h4>
                        <div><strong>{selectedPo.vendors?.company_name}</strong></div>
                        <div>Email: {selectedPo.vendors?.email}</div>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Delivery Address:</h4>
                        <div>VendorBridge HQ</div>
                        <div>finance@vendorbridge.com</div>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                      <thead>
                        <tr style={{ background: 'var(--erp-surface-container-low)', borderBottom: '1px solid var(--erp-border)', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Item</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Unit</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPo.items?.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                            <td style={{ padding: '8px' }}>{item.item_name}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid var(--erp-border)', paddingTop: '10px', textAlign: 'right' }}>
                      <div style={{ marginLeft: 'auto' }}>
                        <span style={{ color: 'var(--erp-outline)', fontSize: '0.82rem' }}>Total Amount:</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--erp-primary)' }}>
                          {formatCurrency(selectedPo.total_amount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr style={{ border: '0', borderTop: '1px solid var(--erp-border)', margin: '12px 0' }} />

                  {isProcurement && selectedPo.status === 'draft' && (
                    <button className="erp-btn erp-btn--primary" onClick={() => handleUpdatePoStatus(selectedPo.id, 'issued')}>
                      Issue Purchase Order
                    </button>
                  )}
                  {isVendor && selectedPo.status === 'issued' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="erp-btn erp-btn--primary" style={{ flex: 1 }} onClick={() => handleUpdatePoStatus(selectedPo.id, 'accepted')}>
                        Accept Order
                      </button>
                      <button className="erp-btn erp-btn--danger" style={{ flex: 1 }} onClick={() => handleUpdatePoStatus(selectedPo.id, 'cancelled')}>
                        Reject Order
                      </button>
                    </div>
                  )}
                  {isVendor && selectedPo.status === 'accepted' && (
                    <div style={{ background: 'var(--erp-surface-container-low)', border: '1px solid var(--erp-outline-variant)', padding: '14px', borderRadius: '12px' }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 600 }}>Billing Actions</p>
                      <button className="erp-btn erp-btn--primary" style={{ width: '100%' }} onClick={() => handleOpenInvoiceModal(selectedPo)}>
                        Create & Submit Invoice
                      </button>
                    </div>
                  )}
                </div>
              ) : selectedInvoice ? (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div ref={printAreaRef}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--erp-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--erp-primary)', fontWeight: 600 }}>Tax Invoice</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--erp-outline)', marginTop: '4px' }}>
                          Number: <strong>{selectedInvoice.invoice_number}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        <div>Issued: {new Date(selectedInvoice.created_at).toLocaleDateString()}</div>
                        <div style={{ marginTop: '4px' }}>
                          Due Date: <strong>{new Date(selectedInvoice.due_date).toLocaleDateString()}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.82rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Bill From:</h4>
                        <div><strong>{selectedInvoice.vendors?.company_name}</strong></div>
                        <div>GSTIN: {selectedInvoice.vendors?.gst_number || 'N/A'}</div>
                        <div>Email: {selectedInvoice.vendors?.email}</div>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Bill To:</h4>
                        <div><strong>VendorBridge Finance</strong></div>
                        <div>PO Ref: {selectedInvoice.purchase_orders?.po_number || 'N/A'}</div>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                      <thead>
                        <tr style={{ background: 'var(--erp-surface-container-low)', borderBottom: '1px solid var(--erp-border)', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Item</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Unit</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items?.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                            <td style={{ padding: '8px' }}>{item.item_name}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderTop: '2px solid var(--erp-border)', paddingTop: '10px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 80px', gap: '4px', textAlign: 'right' }}>
                        <span>Subtotal:</span>
                        <strong>{formatCurrency(selectedInvoice.subtotal)}</strong>

                        <span>CGST (9.0%):</span>
                        <span>{formatCurrency((selectedInvoice.tax_amount || 0) / 2)}</span>

                        <span>SGST (9.0%):</span>
                        <span>{formatCurrency((selectedInvoice.tax_amount || 0) / 2)}</span>

                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '6px' }}>Total Amount:</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--erp-primary)', marginTop: '6px' }}>
                          {formatCurrency(selectedInvoice.total_amount)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <hr style={{ border: '0', borderTop: '1px solid var(--erp-border)', margin: '12px 0' }} />

                  <button 
                    className="erp-btn erp-btn--secondary" 
                    onClick={() => handleSendInvoiceEmail(selectedInvoice.id)}
                    disabled={sendingEmail}
                    style={{ width: '100%' }}
                  >
                    <Mail size={14} /> {sendingEmail ? 'Dispatching Mail...' : 'Email Invoice Notification'}
                  </button>

                  {(isProcurement || isManager) && selectedInvoice.status !== 'paid' && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button className="erp-btn erp-btn--primary" style={{ flex: 1 }} onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'paid')}>
                        <Check size={14} /> Mark Paid
                      </button>
                      <button className="erp-btn erp-btn--danger" style={{ flex: 1 }} onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'voided')}>
                        <X size={14} /> Void
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--erp-outline)' }}>
                  Select a record from the registry table to inspect the transaction details.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* CREATE INVOICE MODAL */}
        {showInvoiceModal && (
          <div className="erp-modal-overlay">
            <div className="erp-modal" style={{ width: 'min(500px, 95vw)' }}>
              <div className="erp-modal__header">
                <h3 className="erp-card__title">Create Invoice</h3>
                <button 
                  style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                  onClick={() => setShowInvoiceModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateInvoice}>
                <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="erp-form">
                    <div className="erp-form-group">
                      <label className="erp-label">Associated Purchase Order</label>
                      <input type="text" className="erp-input" value={selectedPo?.po_number} disabled />
                    </div>

                    <div className="erp-grid-2">
                      <div className="erp-form-group">
                        <label className="erp-label">Subtotal Amount (₹)</label>
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
                        <label className="erp-label">Tax / GST (18%) (₹)</label>
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
                        <label className="erp-label">Total Bill Amount (₹)</label>
                        <input 
                          type="text" 
                          className="erp-input"
                          value={formatCurrency(parseFloat(newInvoice.subtotal) + parseFloat(newInvoice.tax_amount))}
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
    </EnterpriseErpLayout>
  );
};

export default InvoicesPage;
