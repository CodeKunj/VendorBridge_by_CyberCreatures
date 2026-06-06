import re
from typing import Optional

INTENT_PATTERNS = [
    ("dashboard_summary", [
        r"\bdashboard\b", r"\bsummary\b", r"\boverview\b", r"\bkpi\b", r"\bstatistics\b",
    ]),
    ("pending_rfqs", [
        r"\bpending\s+rfq", r"\bactive\s+rfq", r"\bopen\s+rfq", r"\bpublished\s+rfq",
        r"\bshow\s+rfq", r"\blist\s+rfq",
    ]),
    ("pending_approvals", [
        r"\bpending\s+approval", r"\bapproval\s+workflow", r"\bawaiting\s+approval",
    ]),
    ("top_vendors", [
        r"\btop\s+vendor", r"\bbest\s+vendor", r"\bleading\s+vendor", r"\bwho\s+is\s+the\s+best",
    ]),
    ("vendor_performance", [
        r"\bvendor\s+performance", r"\bvendor\s+rating", r"\bvendor\s+analytics",
    ]),
    ("monthly_spending", [
        r"\bmonthly\s+spend", r"\bspending\s+this\s+month", r"\bhow\s+much\s+did\s+we\s+spend",
        r"\bspending\s+analytic", r"\bspend\s+analysis",
    ]),
    ("invoice_summary", [
        r"\binvoice", r"\bunpaid\b", r"\boverdue\s+invoice", r"\bpending\s+invoice",
    ]),
    ("purchase_order_summary", [
        r"\bpurchase\s+order", r"\bopen\s+po\b", r"\bpo\s+summary", r"\blist\s+po",
    ]),
    ("quotation_comparison", [
        r"\bcompare\s+quotation", r"\bcompare\s+bid", r"\bcompare\s+quote",
        r"\bbest\s+quotation", r"\blowest\s+price",
    ]),
    ("rfq_status", [
        r"\brfq\s+status", r"\brfq-\d", r"\brfq-\w+-\w+",
    ]),
    ("procurement_report", [
        r"\bmonthly\s+report", r"\bprocurement\s+report", r"\bgenerate\s+report",
        r"\bprocurement\s+summary",
    ]),
    ("general_help", [
        r"\bhelp\b", r"\bwhat\s+can\s+you\s+do", r"\bcapabilities",
    ]),
]

RFQ_NUMBER_RE = re.compile(r"(RFQ[-\s]?\d{4}[-\s]?[\w-]+|RFQ[-\s]?\d+)", re.IGNORECASE)


def extract_rfq_number(message: str) -> Optional[str]:
    match = RFQ_NUMBER_RE.search(message or "")
    if not match:
        return None
    return match.group(1).upper().replace(" ", "-").replace("--", "-")


def detect_intent(message: str) -> str:
    text = (message or "").lower().strip()

    if extract_rfq_number(message) and any(
        kw in text for kw in ("compare", "quotation", "quote", "bid", "best", "lowest")
    ):
        return "quotation_comparison"

    if extract_rfq_number(message) and "status" in text:
        return "rfq_status"

    for intent, patterns in INTENT_PATTERNS:
        for pattern in patterns:
            if re.search(pattern, text):
                return intent

    return "general_help"
