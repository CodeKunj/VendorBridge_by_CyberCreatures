/**
 * Intent detection for the AI procurement assistant.
 * Ported from ai-service/intents.py
 */

const INTENT_PATTERNS = [
  ['dashboard_summary', [
    /\bdashboard\b/i, /\bsummary\b/i, /\boverview\b/i, /\bkpi\b/i, /\bstatistics\b/i,
  ]],
  ['pending_rfqs', [
    /\bpending\s+rfq/i, /\bactive\s+rfq/i, /\bopen\s+rfq/i, /\bpublished\s+rfq/i,
    /\bshow\s+rfq/i, /\blist\s+rfq/i,
  ]],
  ['pending_approvals', [
    /\bpending\s+approval/i, /\bapproval\s+workflow/i, /\bawaiting\s+approval/i,
  ]],
  ['top_vendors', [
    /\btop\s+vendor/i, /\bbest\s+vendor/i, /\bleading\s+vendor/i, /\bwho\s+is\s+the\s+best/i,
  ]],
  ['vendor_performance', [
    /\bvendor\s+performance/i, /\bvendor\s+rating/i, /\bvendor\s+analytics/i,
  ]],
  ['monthly_spending', [
    /\bmonthly\s+spend/i, /\bspending\s+this\s+month/i, /\bhow\s+much\s+did\s+we\s+spend/i,
    /\bspending\s+analytic/i, /\bspend\s+analysis/i,
  ]],
  ['invoice_summary', [
    /\binvoice/i, /\bunpaid\b/i, /\boverdue\s+invoice/i, /\bpending\s+invoice/i,
  ]],
  ['purchase_order_summary', [
    /\bpurchase\s+order/i, /\bopen\s+po\b/i, /\bpo\s+summary/i, /\blist\s+po/i,
  ]],
  ['quotation_comparison', [
    /\bcompare\s+quotation/i, /\bcompare\s+bid/i, /\bcompare\s+quote/i,
    /\bbest\s+quotation/i, /\blowest\s+price/i,
  ]],
  ['rfq_status', [
    /\brfq\s+status/i, /\brfq-\d/i, /\brfq-\w+-\w+/i,
  ]],
  ['procurement_report', [
    /\bmonthly\s+report/i, /\bprocurement\s+report/i, /\bgenerate\s+report/i,
    /\bprocurement\s+summary/i,
  ]],
  ['general_help', [
    /\bhelp\b/i, /\bwhat\s+can\s+you\s+do/i, /\bcapabilities/i,
  ]],
];

const RFQ_NUMBER_RE = /(RFQ[-\s]?\d{4}[-\s]?[\w-]+|RFQ[-\s]?\d+)/i;

function extractRfqNumber(message) {
  const match = (message || '').match(RFQ_NUMBER_RE);
  if (!match) return null;
  return match[1].toUpperCase().replace(/\s/g, '-').replace(/--+/g, '-');
}

function detectIntent(message) {
  const text = (message || '').toLowerCase().trim();
  const rfqNumber = extractRfqNumber(message);

  if (rfqNumber && /compare|quotation|quote|bid|best|lowest/.test(text)) {
    return 'quotation_comparison';
  }
  if (rfqNumber && /status/.test(text)) {
    return 'rfq_status';
  }

  for (const [intent, patterns] of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return intent;
    }
  }

  return 'general_help';
}

module.exports = { detectIntent, extractRfqNumber };
