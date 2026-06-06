import json
import os
from typing import Any, Optional

import google.generativeai as genai

from data_aggregator import fetch_context
from intents import detect_intent, extract_rfq_number


def _configure_gemini(api_key: Optional[str] = None, model_name: Optional[str] = None):
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("Gemini API key is not configured")
    genai.configure(api_key=key)
    return genai.GenerativeModel(model_name or os.getenv("AI_MODEL", "gemini-flash-latest"))


def _fallback_response(intent: str, context: dict[str, Any]) -> str:
    data = context.get("data") or {}
    insights = context.get("insights") or []

    if intent == "dashboard_summary" and isinstance(data, dict):
        if "this_month_spend_formatted" in data:
            return (
                f"Dashboard Summary:\n"
                f"- Total Vendors: {data.get('total_vendors', 0)}\n"
                f"- Published RFQs: {data.get('published_rfqs', 0)}\n"
                f"- Pending Approvals: {data.get('pending_approvals', 0)}\n"
                f"- Purchase Orders: {data.get('purchase_orders', 0)}\n"
                f"- Invoices: {data.get('invoices', 0)}\n"
                f"- This Month Spend: {data.get('this_month_spend_formatted', 'Rs. 0.00')}"
            )
        return (
            f"Vendor Portal Summary:\n"
            f"- Assigned RFQs: {data.get('assigned_rfqs', 0)}\n"
            f"- My Quotations: {data.get('my_quotations', 0)}\n"
            f"- Purchase Orders: {data.get('purchase_orders', 0)}"
        )

    if intent == "pending_approvals":
        return f"There are {data.get('count', 0)} pending approval(s)."

    if intent == "pending_rfqs":
        return f"There are {data.get('count', 0)} active/pending RFQ(s)."

    if intent == "invoice_summary":
        return (
            f"Invoice Summary: {data.get('unpaid_count', 0)} unpaid, "
            f"{data.get('overdue_count', 0)} overdue."
        )

    if intent == "monthly_spending":
        return f"This month's procurement spend is {data.get('total_formatted', 'Rs. 0.00')}."

    if intent == "quotation_comparison" and data.get("analysis"):
        analysis = data["analysis"]
        return (
            f"Quotation comparison for {data.get('rfq', {}).get('rfq_number', 'RFQ')}:\n"
            f"- Lowest price: {analysis.get('lowest_price_vendor')} "
            f"({analysis.get('lowest_price_inr')} INR)\n"
            f"- Fastest delivery: {analysis.get('fastest_delivery_vendor')} "
            f"({analysis.get('fastest_delivery_days')} days)"
        )

    lines = [json.dumps(data, indent=2, default=str)[:2000]]
    if insights:
        lines.append("\nInsights:\n- " + "\n- ".join(insights))
    return "\n".join(lines)


def generate_response(
    message: str,
    role: str = "procurement_officer",
    user_id: str = "",
    config: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    config = config or {}
    intent = detect_intent(message)
    rfq_number = extract_rfq_number(message)
    context = fetch_context(intent, role, user_id, message, rfq_number)

    temperature = float(config.get("temperature") or os.getenv("AI_TEMPERATURE", 0.4))
    max_tokens = int(config.get("max_tokens") or os.getenv("AI_MAX_TOKENS", 1024))
    model_name = config.get("model") or os.getenv("AI_MODEL", "gemini-flash-latest")

    system_prompt = f"""You are VendorBridge ERP Procurement Assistant — an enterprise copilot for procurement, vendors, RFQs, quotations, approvals, purchase orders, and invoices.

Rules:
- Answer using ONLY the ERP context data provided below.
- Use Indian Rupees (INR / Rs.) for all monetary values with Indian number formatting.
- Be concise, professional, and action-oriented.
- Respect role-based visibility; do not invent data.
- User role: {role}
- Detected intent: {intent}
- If data is empty, say so clearly and suggest a next step.

Context JSON:
{json.dumps(context, default=str)}

User question:
{message}
"""

    try:
        model = _configure_gemini(config.get("gemini_api_key"), model_name)
        response = model.generate_content(
            system_prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            },
        )
        reply = (response.text or "").strip()
        if not reply:
            reply = _fallback_response(intent, context)
    except Exception:
        reply = _fallback_response(intent, context)

    return {
        "response": reply,
        "intent": intent,
        "insights": context.get("insights", []),
        "context_summary": {
            "intent": intent,
            "rfq_number": rfq_number,
        },
    }
