import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../api/rfqApi';
import { quotationApi } from '../api/quotationApi';
import { vendorApi } from '../api/vendorApi';
import { erpApi } from '../api/erpApi';
import { 
  AlertCircle, 
  Check, 
  TrendingUp, 
  Clock, 
  Star, 
  SlidersHorizontal, 
  FileCheck 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

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
      const rfqRes = await rfqApi.getById(id);
      setSelectedRfqDetails(rfqRes.data);

      const quoteRes = await quotationApi.compare(id);
      setQuotes(quoteRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch quotation comparison details');
    } finally {
      setLoading(false);
    }
  };

  const processedQuotes = useMemo(() => {
    let list = [...quotes].map(q => {
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

    if (maxPrice) {
      list = list.filter(q => q.total_amount <= parseFloat(maxPrice));
    }
    if (maxDeliveryDays) {
      list = list.filter(q => q.delivery_days <= parseInt(maxDeliveryDays));
    }
    if (minRating) {
      list = list.filter(q => q.vendorRating >= parseFloat(minRating));
    }

    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.total_amount - b.total_amount;
      if (sortBy === 'price_desc') return b.total_amount - a.total_amount;
      if (sortBy === 'speed_asc') return a.delivery_days - b.delivery_days;
      if (sortBy === 'rating_desc') return b.vendorRating - a.vendorRating;
      return 0;
    });

    return list;
  }, [quotes, vendorsMap, sortBy, maxPrice, maxDeliveryDays, minRating]);

  const handleReleasePO = async (quote) => {
    setError('');
    setSuccess('');
    try {
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
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const renderRatingStars = (score) => {
    const stars = Math.round((score / 100) * 5);
    return (
      <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', alignItems: 'center' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill={i < stars ? '#f59e0b' : 'none'} strokeWidth={1.5} />
        ))}
        <span style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', marginLeft: '4px' }}>
          ({score}%)
        </span>
      </div>
    );
  };

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Procurement', href: '/procurement' },
    { label: 'Compare Engine' }
  ]), []);

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="compare"
      onNavigate={handleNavigate}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
        <h1 className="erp-title">Quotation Compare Engine</h1>
        <p className="erp-subtitle">Perform side-by-side analysis of bids based on price, speed, and supplier rating.</p>

        {error && <div className="erp-alert erp-alert--danger"><AlertCircle size={15} /> {error}</div>}
        {success && <div className="erp-alert erp-alert--success"><Check size={15} /> {success}</div>}

        {/* SELECT RFQ PANEL */}
        <section className="erp-card" style={{ marginBottom: '16px' }}>
          <div className="erp-card__body" style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '16px', alignItems: 'center' }}>
            <div className="erp-form-group" style={{ margin: 0 }}>
              <label className="erp-label">Select RFQ to Analyze</label>
              <select
                className="erp-select"
                value={selectedRfqId}
                onChange={(e) => setSelectedRfqId(e.target.value)}
              >
                <option value="">-- Choose an RFQ --</option>
                {rfqs.map(rfq => (
                  <option key={rfq.id} value={rfq.id}>
                    {rfq.rfq_number} - {rfq.title} ({rfq.status})
                  </option>
                ))}
              </select>
            </div>
            {selectedRfqDetails && (
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--erp-outline)' }}>
                <div><strong>Items:</strong> {selectedRfqDetails.rfq_items?.length || 0}</div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Deadline:</strong> {new Date(selectedRfqDetails.deadline).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </section>

        {selectedRfqId ? (
          <>
            {/* FILTER TOOLBAR */}
            <section className="erp-card" style={{ marginBottom: '20px' }}>
              <div className="erp-card__header" style={{ paddingBottom: '8px' }}>
                <h3 className="erp-card__title" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SlidersHorizontal size={14} /> Compare Matrix Filters
                </h3>
              </div>
              <div className="erp-card__body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label">Sort Priority</label>
                    <select className="erp-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="speed_asc">Delivery: Fastest first</option>
                      <option value="rating_desc">Supplier Rating: High first</option>
                    </select>
                  </div>

                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label">Max Price Ceiling</label>
                    <input
                      type="number"
                      className="erp-input"
                      placeholder="Ceiling amount"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>

                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label">Max Delivery Days</label>
                    <input
                      type="number"
                      className="erp-input"
                      placeholder="e.g. 10"
                      value={maxDeliveryDays}
                      onChange={(e) => setMaxDeliveryDays(e.target.value)}
                    />
                  </div>

                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label">Min Rating (%)</label>
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
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--erp-outline)' }}>
                Comparing vendor bids...
              </div>
            ) : processedQuotes.length === 0 ? (
              <div className="erp-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--erp-outline)' }}>
                No active quotation responses match the selected filters.
              </div>
            ) : (
              /* COMPARISON GRID */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {processedQuotes.map((quote) => {
                  const isHighlight = quote.is_cheapest || quote.is_fastest;
                  return (
                    <section 
                      key={quote.id} 
                      className="erp-card"
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: quote.is_cheapest 
                          ? '2px solid var(--erp-success)' 
                          : quote.is_fastest 
                            ? '2px solid var(--erp-primary)' 
                            : '1px solid var(--erp-outline-variant)',
                        position: 'relative'
                      }}
                    >
                      {/* Flag Tags */}
                      {quote.is_cheapest && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: '-12px', 
                            left: '16px', 
                            background: 'var(--erp-success)', 
                            color: '#fff', 
                            padding: '2px 8px', 
                            borderRadius: '8px', 
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <TrendingUp size={11} /> CHEAPEST VALUE
                        </div>
                      )}
                      {quote.is_fastest && !quote.is_cheapest && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: '-12px', 
                            left: '16px', 
                            background: 'var(--erp-primary)', 
                            color: '#fff', 
                            padding: '2px 8px', 
                            borderRadius: '8px', 
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Clock size={11} /> FASTEST DELIVERY
                        </div>
                      )}

                      <div className="erp-card__header" style={{ paddingBottom: '8px', marginTop: isHighlight ? '8px' : '0' }}>
                        <div>
                          <h4 className="erp-card__title" style={{ fontSize: '1.05rem', fontWeight: 600 }}>{quote.vendorName}</h4>
                          <p className="erp-card__subtitle" style={{ margin: 0 }}>
                            Code: {quote.vendorCode} | GST: {quote.gstNumber}
                          </p>
                        </div>
                      </div>

                      <div className="erp-card__body" style={{ flexGrow: 1, display: 'grid', gap: '14px', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--erp-surface-container-low)', padding: '10px', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--erp-outline)' }}>Supplier Score:</span>
                          {renderRatingStars(quote.vendorRating)}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={{ background: 'var(--erp-surface-container)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', display: 'block', fontWeight: 600 }}>Total Price</span>
                            <strong style={{ fontSize: '1.2rem', color: 'var(--erp-primary)', display: 'block', marginTop: '2px' }}>
                              {formatCurrency(quote.total_amount)}
                            </strong>
                          </div>
                          <div style={{ background: 'var(--erp-surface-container)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--erp-outline)', display: 'block', fontWeight: 600 }}>Delivery Timeline</span>
                            <strong style={{ fontSize: '1.2rem', color: 'var(--erp-primary)', display: 'block', marginTop: '2px' }}>
                              {quote.delivery_days} days
                            </strong>
                          </div>
                        </div>

                        <div>
                          <h5 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--erp-outline)', fontWeight: 700 }}>Line Pricing</h5>
                          <div style={{ display: 'grid', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                            {(quote.quotation_items || []).map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px dashed var(--erp-border)', paddingBottom: '4px' }}>
                                <span>{item.item_name || `Item ${i+1}`} ({item.quantity} units)</span>
                                <strong>{formatCurrency(item.unit_price || 0)} / unit</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        {quote.notes && (
                          <div style={{ fontSize: '0.78rem', background: 'var(--erp-surface-container-low)', borderLeft: '3px solid var(--erp-outline)', padding: '6px 8px', borderRadius: '4px' }}>
                            <strong>Notes:</strong> {quote.notes}
                          </div>
                        )}
                      </div>

                      <div className="erp-card__footer" style={{ borderTop: '1px solid var(--erp-border)', padding: '12px 16px', display: 'flex', gap: '10px', background: 'var(--erp-surface-container-low)' }}>
                        <button 
                          className="erp-btn erp-btn--primary" 
                          style={{ width: '100%' }}
                          onClick={() => handleReleasePO(quote)}
                        >
                          <FileCheck size={14} /> Accept & Release PO
                        </button>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="erp-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--erp-outline)', fontSize: '1rem', margin: 0 }}>
              Select a Request for Quotation (RFQ) from the dropdown list above to perform side-by-side bid comparisons.
            </p>
          </div>
        )}
    </EnterpriseErpLayout>
  );
};

export default QuotationComparisonPage;
