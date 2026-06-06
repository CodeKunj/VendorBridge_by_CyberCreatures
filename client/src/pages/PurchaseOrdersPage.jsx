import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
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
      // Load RFQs and Quotations to let user pick
      const rfqsRes = await erpApi.rfqs.list({ limit: 100 });
      // Filter RFQs that are closed/published (ready for PO)
      setAvailableRfqs(rfqsRes.data || []);

      const quotationsRes = await erpApi.quotations.list({ limit: 100 });
      setAvailableQuotations(quotationsRes.data || []);
    } catch (err) {
      setError('Failed to load RFQ and Quotation selection lists');
    }
  };

  const handleRfqChange = (rfqId) => {
    setSelectedRfqId(rfqId);
    // Find matching quotations for this RFQ
    const matched = availableQuotations.find(q => q.rfq_id === rfqId && q.status === 'accepted');
    if (matched) {
      setSelectedQuotationId(matched.id);
      setSelectedVendorId(matched.vendor_id);
      setTotalAmount(matched.total_amount);
    } else {
      // Look for any quotation
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
    
    // We can open in new window or download
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
        <span className="erp-breadcrumbs__item">ERP Portal</span>
        <span className="erp-breadcrumbs__separator">/</span>
        <span className="erp-breadcrumbs__current">Purchase Orders</span>
      </div>

      <div className="erp-content">
        <div className="erp-header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
          <div>
            <h1 className="erp-title" style={{ margin: 0 }}>Purchase Order (PO) Management</h1>
            <p className="erp-subtitle" style={{ margin: '4px 0 0 0' }}>Issue, view, download, and print official business purchase orders.</p>
          </div>
          
          {(user?.role === 'procurement_officer' || user?.role === 'admin') && (
            <button className="erp-btn erp-btn--primary" onClick={openGenerateModal}>
              Generate PO
            </button>
          )}
        </div>

        {error && <div className="erp-alert erp-alert--danger">{error}</div>}
        {success && <div className="erp-alert erp-alert--success">{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'start' }}>
          
          {/* LEFT PANEL: POS LIST */}
          <section className="erp-card">
            <div className="erp-card__header">
              <h2 className="erp-card__title">Issued Purchase Orders</h2>
            </div>
            <div className="erp-card__body">
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--erp-text-muted)' }}>Loading PO records...</p>
              ) : pos.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                  No Purchase Orders found. Click "Generate PO" to create one.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--erp-text-muted)', borderBottom: '1px solid var(--erp-border)' }}>
                        <th style={{ padding: '12px' }}>PO Number</th>
                        <th style={{ padding: '12px' }}>RFQ Reference</th>
                        <th style={{ padding: '12px' }}>Supplier / Vendor</th>
                        <th style={{ padding: '12px' }}>Total Cost</th>
                        <th style={{ padding: '12px' }}>Date Issued</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pos.map(po => (
                        <tr 
                          key={po.id} 
                          style={{ 
                            borderBottom: '1px solid var(--erp-border)',
                            background: selectedPo?.id === po.id ? '#f8fafc' : 'transparent',
                            cursor: 'pointer' 
                          }}
                          onClick={() => loadDetails(po)}
                        >
                          <td style={{ padding: '12px', fontWeight: 600 }}>{po.po_number}</td>
                          <td style={{ padding: '12px' }}>{po.rfqs?.rfq_number || '-'}</td>
                          <td style={{ padding: '12px' }}>{po.vendors?.company_name || 'N/A'}</td>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{formatCurrency(po.total_amount)}</td>
                          <td style={{ padding: '12px' }}>
                            {po.issued_at ? new Date(po.issued_at).toLocaleDateString() : new Date(po.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`erp-badge erp-badge--${po.status === 'completed' ? 'success' : po.status === 'cancelled' ? 'danger' : 'info'}`}>
                              {po.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                className="erp-icon-button" 
                                title="Download PDF Document"
                                onClick={() => handleDownloadPdf(po.id)}
                              >
                                PDF
                              </button>
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

          {/* RIGHT PANEL: SELECTED PO DETAILS & PRINT PREVIEW */}
          <section className="erp-card" style={{ position: 'sticky', top: '16px' }}>
            <div className="erp-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="erp-card__title">PO Inspector</h2>
                <p className="erp-card__subtitle">Details & direct print action utilities.</p>
              </div>
              {selectedPoDetails && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="erp-btn erp-btn--secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                    onClick={handlePrint}
                  >
                    Print
                  </button>
                  <button 
                    className="erp-btn erp-btn--primary" 
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                    onClick={() => handleDownloadPdf(selectedPoDetails.id)}
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
            
            <div className="erp-card__body">
              {loadingDetails ? (
                <p style={{ textAlign: 'center', color: 'var(--erp-text-muted)' }}>Loading PO details...</p>
              ) : selectedPoDetails ? (
                <div>
                  {/* PRINT PREVIEW TARGET */}
                  <div ref={printAreaRef}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--erp-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--erp-primary)' }}>Purchase Order</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--erp-text-muted)', marginTop: '4px' }}>
                          Number: <strong>{selectedPoDetails.po_number}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div>Issued: {new Date(selectedPoDetails.issued_at || selectedPoDetails.created_at).toLocaleDateString()}</div>
                        <div style={{ marginTop: '4px' }}>
                          Status: <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{selectedPoDetails.status}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.88rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--erp-text-muted)' }}>Vendor / Supplier:</h4>
                        <div><strong>{selectedPoDetails.vendors?.company_name}</strong></div>
                        <div>Code: {selectedPoDetails.vendors?.vendor_code}</div>
                        <div>Email: {selectedPoDetails.vendors?.email}</div>
                        <div>Phone: {selectedPoDetails.vendors?.phone}</div>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--erp-text-muted)' }}>Buyer / Officer:</h4>
                        <div><strong>{selectedPoDetails.buyer?.name || 'ERP Procurement Agent'}</strong></div>
                        <div>Email: {selectedPoDetails.buyer?.email}</div>
                        <div>Shipment Address: VendorBridge HQ</div>
                      </div>
                    </div>

                    <h4 style={{ margin: '16px 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--erp-text-muted)' }}>Line Items Breakdown</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '16px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--erp-border)', textAlign: 'left' }}>
                          <th style={{ padding: '6px' }}>Item</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Unit (₹)</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPoDetails.items?.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                            <td style={{ padding: '6px' }}>
                              <div>{item.item_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--erp-text-muted)' }}>{item.description}</div>
                            </td>
                            <td style={{ padding: '6px', textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ padding: '6px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                            <td style={{ padding: '6px', textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid var(--erp-border)', paddingTop: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--erp-text-muted)', fontSize: '0.88rem' }}>Total Amount:</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--erp-primary)', marginTop: '2px' }}>
                          {formatCurrency(selectedPoDetails.total_amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--erp-text-muted)', padding: '48px 0' }}>
                  Select a purchase order to display items and trigger direct document prints.
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* GENERATE PO MODAL */}
      {generateModalOpen && (
        <>
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0,0,0,0.4)', 
              zIndex: 999 
            }} 
            onClick={() => setGenerateModalOpen(false)}
          />
          <div 
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              width: 'min(550px, 95vw)', 
              background: '#fff', 
              borderRadius: '8px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
              zIndex: 1000, 
              padding: '24px' 
            }}
          >
            <h3 style={{ marginTop: 0 }}>Generate New Purchase Order</h3>
            <p style={{ color: 'var(--erp-text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Select an approved sourcing RFQ/Quotation context. The sequence number will auto-generate.
            </p>
            
            <form onSubmit={handleGeneratePoSubmit}>
              
              <div className="erp-form-group">
                <label className="erp-label">RFQ Linkage Reference</label>
                <select 
                  className="erp-input"
                  value={selectedRfqId}
                  onChange={e => handleRfqChange(e.target.value)}
                  required
                >
                  <option value="">-- Choose RFQ --</option>
                  {availableRfqs.map(rfq => (
                    <option key={rfq.id} value={rfq.id}>
                      {rfq.rfq_number} - {rfq.title} ({rfq.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-label">Accepted Vendor Quotation Linkage</label>
                <select 
                  className="erp-input"
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
                <label className="erp-label">Calculated Total Price (₹)</label>
                <input 
                  type="number" 
                  className="erp-input" 
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  step="0.01"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="erp-btn erp-btn--secondary"
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
        </>
      )}

    </EnterpriseErpLayout>
  );
};

export default PurchaseOrdersPage;
