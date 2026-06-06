import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../api/rfqApi';
import { quotationApi } from '../api/quotationApi';
import { vendorApi } from '../api/vendorApi';
import { erpApi } from '../api/erpApi';

const QuotationComparisonPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { rfqId } = useParams();

  // Selection state
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState(rfqId || '');
  const [selectedRfqDetails, setSelectedRfqDetails] = useState(null);

  // Data state
  const [quotes, setQuotes] = useState([]);
  const [vendorsMap, setVendorsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Sorting state
  const [sortBy, setSortBy] = useState('price_asc'); // price_asc, price_desc, speed_asc, rating_desc
  const [maxPrice, setMaxPrice] = useState('');
  const [maxDeliveryDays, setMaxDeliveryDays] = useState('');
  const [minRating, setMinRating] = useState('');

  useEffect(() => {
    fetchRfqs();
    fetchVendors();
  }, [user]);

  useEffect(() => {
    if (selectedRfqId) {
      loadComparisonData(selectedRfqId);
    } else {
      setQuotes([]);
      setSelectedRfqDetails(null);
    }
  }, [selectedRfqId]);

  const fetchRfqs = async () => {
    try {
      const res = await rfqApi.list({ limit: 100 });
      setRfqs(res.data || []);
    } catch (err) {
      console.error('Failed to load RFQs list', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await vendorApi.list({ limit: 100 });
      const map = {};
      (res.data || []).forEach(v => {
        map[v.id] = v;
      });
      setVendorsMap(map);
    } catch (err) {
      console.error('Failed to index vendors', err);
    }
  };

  const loadComparisonData = async (id) => {
    setLoading(true);
    setError('');
    try {
      // Load RFQ items details
      const rfqRes = await rfqApi.getById(id);
      setSelectedRfqDetails(rfqRes);

      // Load comparison annotations
      const quoteRes = await quotationApi.compare(id);
      setQuotes(quoteRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch quotation comparison details');
    } finally {
      setLoading(false);
    }
  };

  // Process & Filter Quotations
  const processedQuotes = useMemo(() => {
    let list = [...quotes].map(q => {
      // Fetch vendor details from vendors index map
      const vendorInfo = vendorsMap[q.vendor_id] || q.vendors || {};
      const rating = parseFloat(vendorInfo.rating) || (vendorInfo.status === 'active' ? 88 : 65);
      return {
        ...q,
        vendorName: vendorInfo.company_name || 'Vendor Bid',
        vendorCode: vendorInfo.vendor_code || 'VND-XXXX',
        vendorRating: rating,
        gstNumber: vendorInfo.gst_number || 'N/A'
      };
    });

    // Apply Filters
    if (maxPrice) {
      list = list.filter(q => q.total_amount <= parseFloat(maxPrice));
    }
    if (maxDeliveryDays) {
      list = list.filter(q => q.delivery_days <= parseInt(maxDeliveryDays));
    }
    if (minRating) {
      list = list.filter(q => q.vendorRating >= parseFloat(minRating));
    }

    // Apply Sorting
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.total_amount - b.total_amount;
      if (sortBy === 'price_desc') return b.total_amount - a.total_amount;
      if (sortBy === 'speed_asc') return a.delivery_days - b.delivery_days;
      if (sortBy === 'rating_desc') return b.vendorRating - a.vendorRating;
      return 0;
    });

    return list;
  }, [quotes, vendorsMap, sortBy, maxPrice, maxDeliveryDays, minRating]);

  // Actions
  const handleReleasePO = async (quote) => {
    setError('');
    setSuccess('');
    try {
      // Release PO endpoint call
      await erpApi.purchaseOrders.create({
        rfq_id: selectedRfqId,
        quotation_id: quote.id,
        vendor_id: quote.vendor_id,
        total_amount: quote.total_amount
      });
      setSuccess(`Purchase Order successfully generated for ${quote.vendorName}!`);
      loadComparisonData(selectedRfqId);
    } catch (err) {
      setError(err.message || 'Failed to create Purchase Order');
    }
  };

  const handleNavigate = (item) => {
    if (item.id === 'dashboard') {
      navigate('/dashboard');
    } else {
      navigate(`/${item.id}`);
    }
  };

  // Helper to render Star rating display
  const renderRatingStars = (score) => {
    // Score is out of 100. Let's convert to 5 stars
    const stars = Math.round((score / 100) * 5);
    return (
      <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', fontSize: '1.1rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i}>{i < stars ? '★' : '☆'}</span>
        ))}
        <span style={{ fontSize: '0.8rem', color: 'var(--erp-text-muted)', marginLeft: '4px', alignSelf: 'center' }}>
          ({score}%)
        </span>
      </div>
    );
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
        <span className="erp-breadcrumbs__item" onClick={() => navigate('/procurement')} style={{ cursor: 'pointer' }}>Procurement</span>
        <span className="erp-breadcrumbs__separator">/</span>
        <span className="erp-breadcrumbs__current">Quotation Compare Engine</span>
      </div>

      <div className="erp-content">
        {error && <div className="erp-alert erp-alert--danger">{error}</div>}
        {success && <div className="erp-alert erp-alert--success">{success}</div>}

        {/* SELECT RFQ PANEL */}
        <section className="erp-card" style={{ marginBottom: '16px' }}>
          <div className="erp-card__body" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px', alignItems: 'center' }}>
            <div className="erp-form-group" style={{ margin: 0 }}>
              <label className="erp-label">Select RFQ to Analyze</label>
              <select
                className="erp-select"
                value={selectedRfqId}
                onChange={(e) => setSelectedRfqId(e.target.value)}
              >
                <option value="">-- Choose an RFQ from registry --</option>
                {rfqs.map(rfq => (
                  <option key={rfq.id} value={rfq.id}>
                    {rfq.rfq_number} - {rfq.title} ({rfq.status})
                  </option>
                ))}
              </select>
            </div>
            {selectedRfqDetails && (
              <div style={{ textAlign: 'right', fontSize: '0.88rem' }}>
                <div><strong>Items count:</strong> {selectedRfqDetails.rfq_items?.length || 0}</div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Deadline:</strong> {new Date(selectedRfqDetails.deadline).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </section>

        {selectedRfqId ? (
          <>
            {/* SEARCH, FILTERS AND SORTING TOOLBAR */}
            <section className="erp-card" style={{ marginBottom: '16px' }}>
              <div className="erp-card__header" style={{ paddingBottom: '8px' }}>
                <h3 className="erp-card__title" style={{ fontSize: '1rem' }}>Compare Filter & Sort Matrix</h3>
              </div>
              <div className="erp-card__body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label" style={{ fontSize: '0.78rem' }}>Sort order</label>
                    <select className="erp-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="price_asc">Price: Lowest to Highest</option>
                      <option value="price_desc">Price: Highest to Lowest</option>
                      <option value="speed_asc">Delivery: Fastest first</option>
                      <option value="rating_desc">Vendor Rating: Highest first</option>
                    </select>
                  </div>

                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label" style={{ fontSize: '0.78rem' }}>Max Price Ceiling ($)</label>
                    <input
                      type="number"
                      className="erp-input"
                      placeholder="e.g. 5000"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>

                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label" style={{ fontSize: '0.78rem' }}>Max Delivery Days</label>
                    <input
                      type="number"
                      className="erp-input"
                      placeholder="e.g. 10"
                      value={maxDeliveryDays}
                      onChange={(e) => setMaxDeliveryDays(e.target.value)}
                    />
                  </div>

                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label" style={{ fontSize: '0.78rem' }}>Min Vendor Rating (%)</label>
                    <input
                      type="number"
                      className="erp-input"
                      placeholder="e.g. 80"
                      value={minRating}
                      onChange={(e) => setMinRating(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                Comparing vendor bids...
              </div>
            ) : processedQuotes.length === 0 ? (
              <div className="erp-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                No active quotation responses match the selected filters for this RFQ.
              </div>
            ) : (
              /* RESPONSIVE COMPARISON MATRIX GRID */
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, 
                  gap: '16px',
                  alignItems: 'stretch'
                }}
              >
                {processedQuotes.map((quote) => (
                  <section 
                    key={quote.id} 
                    className="erp-card"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: quote.is_cheapest 
                        ? '2px solid #10b981' 
                        : quote.is_fastest 
                          ? '2px solid #2d6bb3' 
                          : '1px solid var(--erp-border)',
                      position: 'relative'
                    }}
                  >
                    {/* Banners */}
                    {quote.is_cheapest && (
                      <div 
                        style={{ 
                          position: 'absolute', 
                          top: '-12px', 
                          left: '16px', 
                          background: '#10b981', 
                          color: '#fff', 
                          padding: '2px 8px', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        ✓ CHEAPEST VALUE
                      </div>
                    )}
                    {quote.is_fastest && !quote.is_cheapest && (
                      <div 
                        style={{ 
                          position: 'absolute', 
                          top: '-12px', 
                          left: '16px', 
                          background: '#2d6bb3', 
                          color: '#fff', 
                          padding: '2px 8px', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        ⚡ FASTEST SHIPMENT
                      </div>
                    )}

                    <div className="erp-card__header" style={{ paddingBottom: '8px' }}>
                      <div>
                        <h4 className="erp-card__title" style={{ fontSize: '1.1rem' }}>{quote.vendorName}</h4>
                        <p className="erp-card__subtitle" style={{ margin: 0 }}>
                          Code: {quote.vendorCode} | GST: {quote.gstNumber}
                        </p>
                      </div>
                    </div>

                    <div className="erp-card__body" style={{ flexGrow: 1, display: 'grid', gap: '14px', paddingTop: '10px' }}>
                      {/* Rating Banner */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--erp-text-muted)' }}>Supplier Rating:</span>
                        {renderRatingStars(quote.vendorRating)}
                      </div>

                      {/* Spend Timeline Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #d1fae5', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#065f46', display: 'block', fontWeight: 600 }}>Total Bid Cost</span>
                          <strong style={{ fontSize: '1.25rem', color: '#047857', display: 'block', marginTop: '2px' }}>
                            ${quote.total_amount.toFixed(2)}
                          </strong>
                        </div>
                        <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '8px', border: '1px solid #e0f2fe', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#075985', display: 'block', fontWeight: 600 }}>Delivery Speed</span>
                          <strong style={{ fontSize: '1.25rem', color: '#0284c7', display: 'block', marginTop: '2px' }}>
                            {quote.delivery_days} days
                          </strong>
                        </div>
                      </div>

                      {/* Quoted item breakdown */}
                      <div>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--erp-text-muted)' }}>Quoted Items</h5>
                        <div style={{ display: 'grid', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                          {(quote.quotation_items || []).map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px dashed var(--erp-border)', paddingBottom: '4px' }}>
                              <span>{item.item_name || `Item ${i+1}`} ({item.quantity} units)</span>
                              <strong>${(item.unit_price || 0).toFixed(2)} / unit</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {quote.notes && (
                        <div style={{ fontSize: '0.8rem', background: '#fcfcfc', borderLeft: '3px solid #cbd5e1', padding: '6px 8px', borderRadius: '4px' }}>
                          <strong>Notes:</strong> {quote.notes}
                        </div>
                      )}
                    </div>

                    <div className="erp-card__footer" style={{ borderTop: '1px solid var(--erp-border)', padding: '12px 16px', display: 'flex', gap: '10px', background: '#f8fafc' }}>
                      <button 
                        className="erp-btn erp-btn--primary" 
                        style={{ flexGrow: 1 }}
                        onClick={() => handleReleasePO(quote)}
                      >
                        Accept Bid & Release PO
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="erp-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--erp-text-muted)', fontSize: '1.1rem', margin: 0 }}>
              Select a Request for Quotation (RFQ) from the dropdown list above to perform side-by-side bid comparisons.
            </p>
          </div>
        )}
      </div>
    </EnterpriseErpLayout>
  );
};

export default QuotationComparisonPage;
