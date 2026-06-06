import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  FileText, 
  Printer, 
  Download, 
  Plus, 
  X, 
  AlertCircle, 
  Check,
  Building,
  Mail,
  Phone,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const PurchaseOrdersPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Print Ref
  const printAreaRef = useRef(null);

  // States
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected PO for details/print
  const [selectedPo, setSelectedPo] = useState(null);
  const [selectedPoDetails, setSelectedPoDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Generate PO Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [availableRfqs, setAvailableRfqs] = useState([]);
  const [availableQuotations, setAvailableQuotations] = useState([]);
  
  // New PO form state
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [submittingPo, setSubmittingPo] = useState(false);

  useEffect(() => {
    loadPos();
  }, [user]);

  const loadPos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await erpApi.purchaseOrders.list({ limit: 100 });
      setPos(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (po) => {
    setSelectedPo(po);
    setSelectedPoDetails(null);
    setLoadingDetails(true);
    try {
      const details = await erpApi.purchaseOrders.getById(po.id);
      setSelectedPoDetails(details.data);
    } catch (err) {
      setError(err.message || 'Failed to load PO details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openGenerateModal = async () => {
    setGenerateModalOpen(true);
    setSelectedRfqId('');
    setSelectedQuotationId('');
    setSelectedVendorId('');
    setTotalAmount(0);
    
    try {
      const rfqsRes = await erpApi.rfqs.list({ limit: 100 });
      setAvailableRfqs(rfqsRes.data || []);

      const quotationsRes = await erpApi.quotations.list({ limit: 100 });
      setAvailableQuotations(quotationsRes.data || []);
    } catch (err) {
      setError('Failed to load RFQ and Quotation selection lists');
    }
  };

  const handleRfqChange = (rfqId) => {
    setSelectedRfqId(rfqId);
    const matched = availableQuotations.find(q => q.rfq_id === rfqId && q.status === 'accepted');
    if (matched) {
      setSelectedQuotationId(matched.id);
      setSelectedVendorId(matched.vendor_id);
      setTotalAmount(matched.total_amount);
    } else {
      const anyMatched = availableQuotations.find(q => q.rfq_id === rfqId);
      if (anyMatched) {
        setSelectedQuotationId(anyMatched.id);
        setSelectedVendorId(anyMatched.vendor_id);
        setTotalAmount(anyMatched.total_amount);
      } else {
        setSelectedQuotationId('');
        setSelectedVendorId('');
        setTotalAmount(0);
      }
    }
  };

  const handleQuotationChange = (quotId) => {
    setSelectedQuotationId(quotId);
    const matched = availableQuotations.find(q => q.id === quotId);
    if (matched) {
      setSelectedVendorId(matched.vendor_id);
      setTotalAmount(matched.total_amount);
    }
  };

  const handleGeneratePoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setError('A supplier/vendor must be assigned to generate a PO');
      return;
    }

    setSubmittingPo(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        rfq_id: selectedRfqId || null,
        quotation_id: selectedQuotationId || null,
        vendor_id: selectedVendorId,
        total_amount: parseFloat(totalAmount) || 0,
        status: 'issued'
      };

      const res = await erpApi.purchaseOrders.create(payload);
      setSuccess(`Purchase Order ${res.data.po_number || 'generated'} successfully!`);
      setGenerateModalOpen(false);
      await loadPos();
    } catch (err) {
      setError(err.message || 'Failed to generate Purchase Order');
    } finally {
      setSubmittingPo(false);
    }
  };

  const handleDownloadPdf = (poId) => {
    const url = erpApi.purchaseOrders.downloadPdfUrl(poId);
    const token = localStorage.getItem('vendorbridge.accessToken');
    const win = window.open(`${url}?access_token=${token}`, '_blank');
    if (win) win.focus();
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print PO - ${selectedPoDetails?.po_number}</title>
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
    { label: 'Purchase Orders' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="purchase-orders"
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
      <div className="erp-header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
          <div>
            <h1 className="erp-title" style={{ margin: 0 }}>Purchase Orders</h1>
            <p className="erp-subtitle" style={{ margin: '4px 0 0 0' }}>Issue, view, download, and print official procurement POs.</p>
          </div>
          
          {(user?.role === 'procurement_officer' || user?.role === 'admin') && (
            <button className="erp-btn erp-btn--primary" onClick={openGenerateModal}>
              <Plus size={16} /> Generate PO
            </button>
          )}
        </div>

        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}
        {success && <div className="erp-alert erp-alert--success"><Check size={15} /> {success}</div>}

        <div className="erp-grid-2" style={{ alignItems: 'start' }}>
          
          {/* LEFT PANEL: POS LIST */}
          <section className="erp-card">
            <div className="erp-card__header">
              <h2 className="erp-card__title">Issued Purchase Orders</h2>
            </div>
            <div className="erp-card__body">
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--erp-outline)', padding: '20px' }}>Loading PO records...</p>
              ) : pos.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-outline)' }}>
                  No Purchase Orders found.
                </div>
              ) : (
                <div className="erp-table-wrapper">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>PO Number</th>
                        <th>RFQ Ref</th>
                        <th>Supplier</th>
                        <th>Total Cost</th>
                        <th>Date Issued</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pos.map(po => (
                        <tr 
                          key={po.id} 
                          style={{ 
                            background: selectedPo?.id === po.id ? 'var(--erp-surface-container)' : 'transparent',
                            cursor: 'pointer' 
                          }}
                          onClick={() => loadDetails(po)}
                        >
                          <td><strong>{po.po_number}</strong></td>
                          <td>{po.rfqs?.rfq_number || '-'}</td>
                          <td>{po.vendors?.company_name || 'N/A'}</td>
                          <td><strong>{formatCurrency(po.total_amount)}</strong></td>
                          <td>
                            {po.issued_at ? new Date(po.issued_at).toLocaleDateString() : new Date(po.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <span className={`erp-badge erp-badge--${po.status === 'completed' ? 'success' : po.status === 'cancelled' ? 'danger' : 'info'}`}>
                              {po.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <button 
                              className="erp-btn erp-btn--secondary" 
                              style={{ height: '28px', padding: '0 8px', fontSize: '0.72rem' }}
                              onClick={() => handleDownloadPdf(po.id)}
                            >
                              <Download size={11} /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT PANEL: SELECTED PO DETAILS */}
          <section className="erp-card" style={{ position: 'sticky', top: '16px' }}>
            <div className="erp-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="erp-card__title">PO Inspector</h2>
              </div>
              {selectedPoDetails && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="erp-btn erp-btn--outline" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    onClick={handlePrint}
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button 
                    className="erp-btn erp-btn--primary" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    onClick={() => handleDownloadPdf(selectedPoDetails.id)}
                  >
                    <Download size={13} /> PDF
                  </button>
                </div>
              )}
            </div>
            
            <div className="erp-card__body">
              {loadingDetails ? (
                <p style={{ textAlign: 'center', color: 'var(--erp-outline)', padding: '20px' }}>Loading PO details...</p>
              ) : selectedPoDetails ? (
                <div>
                  <div ref={printAreaRef}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--erp-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--erp-primary)', fontWeight: 600 }}>Purchase Order</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--erp-outline)', marginTop: '4px' }}>
                          Number: <strong>{selectedPoDetails.po_number}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        <div>Issued: {new Date(selectedPoDetails.issued_at || selectedPoDetails.created_at).toLocaleDateString()}</div>
                        <div style={{ marginTop: '4px' }}>
                          Status: <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--erp-primary)' }}>{selectedPoDetails.status}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.82rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Supplier:</h4>
                        <div><strong>{selectedPoDetails.vendors?.company_name}</strong></div>
                        <div>Code: {selectedPoDetails.vendors?.vendor_code}</div>
                        <div>Email: {selectedPoDetails.vendors?.email}</div>
                        <div>Phone: {selectedPoDetails.vendors?.phone}</div>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Buyer Representative:</h4>
                        <div><strong>{selectedPoDetails.buyer?.name || 'ERP Procurement Agent'}</strong></div>
                        <div>Email: {selectedPoDetails.buyer?.email}</div>
                        <div>Shipment Address: VendorBridge HQ</div>
                      </div>
                    </div>

                    <h4 style={{ margin: '16px 0 8px 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Line Items Breakdown</h4>
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
                        {selectedPoDetails.items?.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                            <td style={{ padding: '8px' }}>
                              <div><strong>{item.item_name}</strong></div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--erp-outline)' }}>{item.description}</div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid var(--erp-border)', paddingTop: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--erp-outline)', fontSize: '0.82rem' }}>Total Amount:</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--erp-primary)', marginTop: '2px' }}>
                          {formatCurrency(selectedPoDetails.total_amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--erp-outline)', padding: '48px 0' }}>
                  Select a purchase order record to inspect and verify details.
                </div>
              )}
            </div>
          </section>

        </div>

      {/* GENERATE PO MODAL */}
      {generateModalOpen && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ width: 'min(520px, 95vw)' }}>
            <div className="erp-modal__header">
              <h3 className="erp-card__title">Generate New Purchase Order</h3>
              <button style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => setGenerateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleGeneratePoSubmit}>
              <div className="erp-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="erp-form-group">
                  <label className="erp-label">RFQ Reference</label>
                  <select 
                    className="erp-select"
                    value={selectedRfqId}
                    onChange={e => handleRfqChange(e.target.value)}
                    required
                  >
                    <option value="">-- Select RFQ --</option>
                    {availableRfqs.map(rfq => (
                      <option key={rfq.id} value={rfq.id}>
                        {rfq.rfq_number} - {rfq.title} ({rfq.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Accepted Supplier Quotation</label>
                  <select 
                    className="erp-select"
                    value={selectedQuotationId}
                    onChange={e => handleQuotationChange(e.target.value)}
                    disabled={!selectedRfqId}
                    required
                  >
                    <option value="">-- Choose Quotation --</option>
                    {availableQuotations
                      .filter(q => q.rfq_id === selectedRfqId)
                      .map(q => (
                        <option key={q.id} value={q.id}>
                          Bid by {q.vendors?.company_name} - {formatCurrency(q.total_amount)} ({q.status})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Total Amount</label>
                  <input 
                    type="number" 
                    className="erp-input" 
                    value={totalAmount}
                    onChange={e => setTotalAmount(e.target.value)}
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="erp-modal__footer">
                <button 
                  type="button" 
                  className="erp-btn erp-btn--outline"
                  onClick={() => setGenerateModalOpen(false)}
                  disabled={submittingPo}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="erp-btn erp-btn--primary"
                  disabled={submittingPo}
                >
                  {submittingPo ? 'Generating...' : 'Generate PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </EnterpriseErpLayout>
  );
};

export default PurchaseOrdersPage;
