/**
 * Data aggregator for the AI procurement assistant.
 * Ported from ai-service/data_aggregator.py — queries Supabase directly.
 */

const supabase = require('../config/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatInr(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function dbCount(table, filters = []) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  for (const [method, field, value] of filters) {
    if (method === 'eq') query = query.eq(field, value);
    else if (method === 'in') query = query.in(field, value);
    else if (method === 'neq') query = query.neq(field, value);
    else if (method === 'gte') query = query.gte(field, value);
  }
  const { count } = await query;
  return count || 0;
}

async function vendorIdForUser(userId) {
  const { data } = await supabase
    .from('vendors')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  return data?.[0]?.id || null;
}

async function sumPoAmountSince(isoDate) {
  const { data } = await supabase
    .from('purchase_orders')
    .select('total_amount, status')
    .gte('created_at', isoDate);
  return (data || [])
    .filter((p) => !['cancelled', 'draft'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
}

// ─── Context fetchers ─────────────────────────────────────────────────────────

async function dashboardSummary(role, vendorId) {
  if (role === 'vendor') {
    let assigned = 0;
    if (vendorId) {
      const { count } = await supabase
        .from('rfq_vendor_assignments')
        .select('rfq_id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);
      assigned = count || 0;
    }
    const quotes = vendorId ? await dbCount('quotations', [['eq', 'vendor_id', vendorId]]) : 0;
    const pos = vendorId ? await dbCount('purchase_orders', [['eq', 'vendor_id', vendorId]]) : 0;
    return { assigned_rfqs: assigned, my_quotations: quotes, purchase_orders: pos };
  }

  const monthStart = monthStartIso();
  const monthSpend = await sumPoAmountSince(monthStart);
  return {
    total_vendors: await dbCount('vendors'),
    active_vendors: await dbCount('vendors', [['eq', 'status', 'active']]),
    total_rfqs: await dbCount('rfqs'),
    published_rfqs: await dbCount('rfqs', [['eq', 'status', 'published']]),
    pending_approvals: await dbCount('approvals', [['eq', 'status', 'pending']]),
    purchase_orders: await dbCount('purchase_orders'),
    invoices: await dbCount('invoices'),
    this_month_spend_inr: monthSpend,
    this_month_spend_formatted: formatInr(monthSpend),
  };
}

async function pendingRfqs(role, vendorId) {
  if (role === 'vendor' && vendorId) {
    const { data: assigns } = await supabase
      .from('rfq_vendor_assignments')
      .select('rfq_id')
      .eq('vendor_id', vendorId);
    const rfqIds = (assigns || []).map((a) => a.rfq_id);
    if (!rfqIds.length) return { count: 0, items: [] };
    const { data } = await supabase
      .from('rfqs')
      .select('rfq_number, title, status, deadline')
      .in('id', rfqIds)
      .eq('status', 'published')
      .order('deadline')
      .limit(15);
    return { count: (data || []).length, items: data || [] };
  }
  const { data } = await supabase
    .from('rfqs')
    .select('rfq_number, title, status, deadline')
    .in('status', ['published', 'draft'])
    .order('deadline')
    .limit(15);
  return { count: (data || []).length, items: data || [] };
}

async function pendingApprovals(role) {
  if (!['admin', 'manager'].includes(role)) {
    return { count: 0, items: [], note: 'Approvals are visible to managers and admins.' };
  }
  const { data } = await supabase
    .from('approvals')
    .select('id, status, level, created_at, rfqs(rfq_number, title), quotations(total_amount, vendors(company_name))')
    .eq('status', 'pending')
    .order('created_at')
    .limit(15);
  return { count: (data || []).length, items: data || [] };
}

async function vendorAnalytics(role) {
  if (role === 'vendor') {
    return { note: 'Vendor analytics are available to procurement staff and managers.' };
  }
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, company_name, vendor_code, status');
  const { data: quotations } = await supabase
    .from('quotations')
    .select('vendor_id, status, total_amount, delivery_days');
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('vendor_id, total_amount, status');

  const rankings = (vendors || []).map((vendor) => {
    const vid = vendor.id;
    const vQuotes = (quotations || []).filter((q) => q.vendor_id === vid);
    const won = vQuotes.filter((q) => q.status === 'accepted');
    const vPos = (pos || []).filter((p) => p.vendor_id === vid && p.status !== 'cancelled');
    const totalPoValue = vPos.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const deliveries = vQuotes.map((q) => Number(q.delivery_days || 0)).filter(Boolean);
    const avgDelivery = deliveries.length
      ? Math.round((deliveries.reduce((a, b) => a + b, 0) / deliveries.length) * 10) / 10
      : 0;
    const score = won.length * 30 + vPos.length * 20 + totalPoValue / 100000;
    return {
      company_name: vendor.company_name,
      vendor_code: vendor.vendor_code,
      status: vendor.status,
      bids_won: won.length,
      purchase_orders: vPos.length,
      total_po_value_inr: totalPoValue,
      avg_delivery_days: avgDelivery,
      score: Math.round(score * 100) / 100,
    };
  });
  rankings.sort((a, b) => b.score - a.score);
  return { top_vendors: rankings.slice(0, 10) };
}

async function monthlySpending(role, vendorId) {
  const monthStart = monthStartIso();
  let query = supabase
    .from('purchase_orders')
    .select('po_number, total_amount, status, created_at, vendors(company_name)')
    .gte('created_at', monthStart);
  if (role === 'vendor' && vendorId) {
    query = query.eq('vendor_id', vendorId);
  } else if (role === 'vendor') {
    return { total_inr: 0, items: [] };
  }
  const { data } = await query;
  const items = (data || []).filter((p) => !['cancelled', 'draft'].includes(p.status));
  const total = items.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  return { total_inr: total, total_formatted: formatInr(total), count: items.length, items: items.slice(0, 10) };
}

async function invoiceSummary(role, vendorId) {
  let query = supabase.from('invoices');
  if (role === 'vendor') {
    if (!vendorId) return { count: 0, items: [] };
    query = query.select('invoice_number, status, total_amount, due_date').eq('vendor_id', vendorId);
  } else {
    query = query.select('invoice_number, status, total_amount, due_date, vendors(company_name)');
  }
  const { data } = await query.order('created_at', { ascending: false }).limit(15);
  const items = data || [];
  const now = new Date().toISOString();
  const unpaid = items.filter((i) => !['paid', 'voided'].includes(i.status));
  const overdue = unpaid.filter((i) => i.due_date && i.due_date < now);
  return { total: items.length, unpaid_count: unpaid.length, overdue_count: overdue.length, items: items.slice(0, 10) };
}

async function purchaseOrderSummary(role, vendorId) {
  let query = supabase
    .from('purchase_orders')
    .select('po_number, status, total_amount, issued_at, vendors(company_name)')
    .order('created_at', { ascending: false })
    .limit(15);
  if (role === 'vendor' && vendorId) {
    query = query.eq('vendor_id', vendorId);
  } else if (role === 'vendor') {
    return { count: 0, items: [] };
  }
  const { data } = await query;
  const items = data || [];
  const openPos = items.filter((p) => ['issued', 'accepted'].includes(p.status));
  return { count: items.length, open_count: openPos.length, items };
}

async function rfqQuotationContext(role, vendorId, rfqNumber, message) {
  if (!rfqNumber) {
    const { data: recent } = await supabase
      .from('rfqs')
      .select('rfq_number, title, status, deadline')
      .order('created_at', { ascending: false })
      .limit(5);
    return { error: 'RFQ number not found in message.', recent_rfqs: recent || [], hint: 'Try: Compare quotations for RFQ-2026-SEED-003' };
  }

  const normalized = rfqNumber.toUpperCase().replace(/\s/g, '-');
  const suffix = normalized.split('-').pop();
  let { data: rfqs } = await supabase
    .from('rfqs')
    .select('id, rfq_number, title, status, deadline, description')
    .ilike('rfq_number', `%${suffix}%`)
    .limit(1);

  if (!rfqs?.length) {
    const res = await supabase
      .from('rfqs')
      .select('id, rfq_number, title, status, deadline, description')
      .eq('rfq_number', normalized)
      .limit(1);
    rfqs = res.data;
  }
  if (!rfqs?.length) return { error: `RFQ ${rfqNumber} not found.` };

  const rfq = rfqs[0];

  if (role === 'vendor' && vendorId) {
    const { data: assigned } = await supabase
      .from('rfq_vendor_assignments')
      .select('id')
      .eq('rfq_id', rfq.id)
      .eq('vendor_id', vendorId);
    if (!assigned?.length) return { error: 'You are not assigned to this RFQ.' };
  }

  const { data: quotes } = await supabase
    .from('quotations')
    .select('id, total_amount, delivery_days, status, vendors(company_name, vendor_code, status)')
    .eq('rfq_id', rfq.id);

  const enriched = (quotes || []).map((q) => ({
    ...q,
    total_amount: Number(q.total_amount || 0),
    delivery_days: Number(q.delivery_days || 0),
  }));

  const lowestPrice = enriched.length
    ? enriched.reduce((a, b) => (a.total_amount <= b.total_amount ? a : b))
    : null;
  const fastest = enriched.length
    ? enriched.reduce((a, b) => (a.delivery_days <= b.delivery_days ? a : b))
    : null;

  return {
    rfq,
    quotations: enriched,
    analysis: {
      lowest_price_vendor: lowestPrice?.vendors?.company_name || null,
      lowest_price_inr: lowestPrice?.total_amount || null,
      fastest_delivery_vendor: fastest?.vendors?.company_name || null,
      fastest_delivery_days: fastest?.delivery_days || null,
      recommended: lowestPrice,
    },
  };
}

async function procurementReport(role, vendorId) {
  if (role === 'vendor') {
    return { note: 'Full procurement reports are available to internal staff.' };
  }
  const monthStart = monthStartIso();
  const analytics = await vendorAnalytics(role);
  return {
    total_rfqs: await dbCount('rfqs'),
    published_rfqs: await dbCount('rfqs', [['eq', 'status', 'published']]),
    closed_rfqs: await dbCount('rfqs', [['eq', 'status', 'closed']]),
    approved_approvals: await dbCount('approvals', [['eq', 'status', 'approved']]),
    purchase_orders: await dbCount('purchase_orders'),
    invoices: await dbCount('invoices'),
    month_spend_inr: await sumPoAmountSince(monthStart),
    vendor_performance: (analytics.top_vendors || []).slice(0, 5),
  };
}

async function proactiveInsights(role, vendorId) {
  const insights = [];
  const now = new Date().toISOString();

  try {
    if (['admin', 'manager', 'procurement_officer'].includes(role)) {
      const pending = await dbCount('approvals', [['eq', 'status', 'pending']]);
      if (pending) insights.push(`${pending} approval(s) are awaiting review.`);

      const { data: nearing } = await supabase
        .from('rfqs')
        .select('rfq_number, deadline')
        .eq('status', 'published');
      const today = new Date();
      let soon = 0;
      for (const rfq of nearing || []) {
        if (rfq.deadline) {
          const days = Math.floor((new Date(rfq.deadline) - today) / 86400000);
          if (days >= 0 && days <= 3) soon++;
        }
      }
      if (soon) insights.push(`${soon} published RFQ(s) are nearing their deadline within 3 days.`);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('due_date, status')
        .not('status', 'in', '("paid","voided")');
      const overdue = (invoices || []).filter((i) => i.due_date && i.due_date < now).length;
      if (overdue) insights.push(`${overdue} invoice(s) appear overdue.`);
    }

    if (role === 'vendor' && vendorId) {
      const open = await pendingRfqs(role, vendorId);
      if (open.count) insights.push(`You have ${open.count} open RFQ invitation(s) to respond to.`);
    }
  } catch {
    // insights are best-effort, don't crash
  }

  return insights;
}

function helpTopics(role) {
  if (role === 'vendor') {
    return ['View my assigned RFQs', 'Check my quotation status', 'List my purchase orders'];
  }
  return [
    'Ask for a dashboard summary',
    'List pending RFQs or approvals',
    'Compare quotations for an RFQ number',
    'Show monthly spending or invoice status',
    'Generate a procurement report',
  ];
}

// ─── Main entry ───────────────────────────────────────────────────────────────

async function fetchContext(intent, role, userId, message, rfqNumber) {
  const vendorId = role === 'vendor' ? await vendorIdForUser(userId).catch(() => null) : null;
  const context = { intent, role };

  try {
    switch (intent) {
      case 'dashboard_summary':
        context.data = await dashboardSummary(role, vendorId); break;
      case 'pending_rfqs':
        context.data = await pendingRfqs(role, vendorId); break;
      case 'pending_approvals':
        context.data = await pendingApprovals(role); break;
      case 'top_vendors':
      case 'vendor_performance':
        context.data = await vendorAnalytics(role); break;
      case 'monthly_spending':
        context.data = await monthlySpending(role, vendorId); break;
      case 'invoice_summary':
        context.data = await invoiceSummary(role, vendorId); break;
      case 'purchase_order_summary':
        context.data = await purchaseOrderSummary(role, vendorId); break;
      case 'quotation_comparison':
      case 'rfq_status':
        context.data = await rfqQuotationContext(role, vendorId, rfqNumber, message); break;
      case 'procurement_report':
        context.data = await procurementReport(role, vendorId); break;
      default:
        context.data = { help: helpTopics(role) };
    }
  } catch (e) {
    context.data = { error: 'Live data temporarily unavailable.', detail: e.message };
  }

  context.insights = await proactiveInsights(role, vendorId);
  return context;
}

module.exports = { fetchContext };
