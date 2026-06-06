from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from database import get_supabase


def _count(table: str, filters: list[tuple] | None = None) -> int:
    query = get_supabase().table(table).select("id", count="exact")
    for method, field, value in filters or []:
        if method == "eq":
            query = query.eq(field, value)
        elif method == "in":
            query = query.in_(field, value)
        elif method == "neq":
            query = query.neq(field, value)
        elif method == "gte":
            query = query.gte(field, value)
    result = query.execute()
    return result.count or 0


def _vendor_id_for_user(user_id: str) -> Optional[str]:
    result = (
        get_supabase()
        .table("vendors")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0]["id"] if rows else None


def _month_start_iso() -> str:
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()


def _format_inr(amount: float) -> str:
    return f"Rs. {amount:,.2f}"


def fetch_context(intent: str, role: str, user_id: str, message: str, rfq_number: str | None = None) -> dict[str, Any]:
    vendor_id = _vendor_id_for_user(user_id) if role == "vendor" else None
    context: dict[str, Any] = {"intent": intent, "role": role}

    if intent == "dashboard_summary":
        context["data"] = _dashboard_summary(role, vendor_id)

    elif intent == "pending_rfqs":
        context["data"] = _pending_rfqs(role, vendor_id)

    elif intent == "pending_approvals":
        context["data"] = _pending_approvals(role)

    elif intent in ("top_vendors", "vendor_performance"):
        context["data"] = _vendor_analytics(role)

    elif intent == "monthly_spending":
        context["data"] = _monthly_spending(role, vendor_id)

    elif intent == "invoice_summary":
        context["data"] = _invoice_summary(role, vendor_id)

    elif intent == "purchase_order_summary":
        context["data"] = _purchase_order_summary(role, vendor_id)

    elif intent in ("quotation_comparison", "rfq_status"):
        context["data"] = _rfq_quotation_context(role, vendor_id, rfq_number, message)

    elif intent == "procurement_report":
        context["data"] = _procurement_report(role, vendor_id)

    else:
        context["data"] = {"help": _help_topics(role)}

    context["insights"] = _proactive_insights(role, vendor_id)
    return context


def _dashboard_summary(role: str, vendor_id: str | None) -> dict:
    if role == "vendor":
        assigned = 0
        if vendor_id:
            assigns = (
                get_supabase()
                .table("rfq_vendor_assignments")
                .select("rfq_id", count="exact")
                .eq("vendor_id", vendor_id)
                .execute()
            )
            assigned = assigns.count or 0
        quotes = _count("quotations", [("eq", "vendor_id", vendor_id)]) if vendor_id else 0
        pos = _count("purchase_orders", [("eq", "vendor_id", vendor_id)]) if vendor_id else 0
        return {
            "assigned_rfqs": assigned,
            "my_quotations": quotes,
            "purchase_orders": pos,
        }

    month_start = _month_start_iso()
    month_spend = _sum_po_amount_since(month_start)

    return {
        "total_vendors": _count("vendors"),
        "active_vendors": _count("vendors", [("eq", "status", "active")]),
        "total_rfqs": _count("rfqs"),
        "published_rfqs": _count("rfqs", [("eq", "status", "published")]),
        "pending_approvals": _count("approvals", [("eq", "status", "pending")]),
        "purchase_orders": _count("purchase_orders"),
        "invoices": _count("invoices"),
        "this_month_spend_inr": month_spend,
        "this_month_spend_formatted": _format_inr(month_spend),
    }


def _pending_rfqs(role: str, vendor_id: str | None) -> dict:
    if role == "vendor" and vendor_id:
        assigns = (
            get_supabase()
            .table("rfq_vendor_assignments")
            .select("rfq_id")
            .eq("vendor_id", vendor_id)
            .execute()
        )
        rfq_ids = [a["rfq_id"] for a in (assigns.data or [])]
        if not rfq_ids:
            return {"count": 0, "items": []}
        result = (
            get_supabase()
            .table("rfqs")
            .select("rfq_number, title, status, deadline")
            .in_("id", rfq_ids)
            .eq("status", "published")
            .order("deadline")
            .limit(15)
            .execute()
        )
        items = result.data or []
        return {"count": len(items), "items": items}

    result = (
        get_supabase()
        .table("rfqs")
        .select("rfq_number, title, status, deadline")
        .in_("status", ["published", "draft"])
        .order("deadline")
        .limit(15)
        .execute()
    )
    items = result.data or []
    return {"count": len(items), "items": items}


def _pending_approvals(role: str) -> dict:
    if role not in ("admin", "manager"):
        return {"count": 0, "items": [], "note": "Approvals are visible to managers and admins."}

    result = (
        get_supabase()
        .table("approvals")
        .select("id, status, level, created_at, rfqs(rfq_number, title), quotations(total_amount, vendors(company_name))")
        .eq("status", "pending")
        .order("created_at")
        .limit(15)
        .execute()
    )
    items = result.data or []
    return {"count": len(items), "items": items}


def _vendor_analytics(role: str) -> dict:
    if role == "vendor":
        return {"note": "Vendor analytics are available to procurement staff and managers."}

    vendors = get_supabase().table("vendors").select("id, company_name, vendor_code, status").execute().data or []
    quotations = get_supabase().table("quotations").select("vendor_id, status, total_amount, delivery_days").execute().data or []
    pos = get_supabase().table("purchase_orders").select("vendor_id, total_amount, status").execute().data or []

    rankings = []
    for vendor in vendors:
        vid = vendor["id"]
        vendor_quotes = [q for q in quotations if q["vendor_id"] == vid]
        won = [q for q in vendor_quotes if q["status"] == "accepted"]
        vendor_pos = [p for p in pos if p["vendor_id"] == vid and p["status"] != "cancelled"]
        total_po_value = sum(float(p.get("total_amount") or 0) for p in vendor_pos)
        avg_delivery = 0
        deliveries = [int(q.get("delivery_days") or 0) for q in vendor_quotes if q.get("delivery_days")]
        if deliveries:
            avg_delivery = round(sum(deliveries) / len(deliveries), 1)

        score = len(won) * 30 + len(vendor_pos) * 20 + (total_po_value / 100000)
        rankings.append({
            "company_name": vendor["company_name"],
            "vendor_code": vendor["vendor_code"],
            "status": vendor["status"],
            "bids_won": len(won),
            "purchase_orders": len(vendor_pos),
            "total_po_value_inr": total_po_value,
            "avg_delivery_days": avg_delivery,
            "score": round(score, 2),
        })

    rankings.sort(key=lambda x: x["score"], reverse=True)
    return {"top_vendors": rankings[:10]}


def _monthly_spending(role: str, vendor_id: str | None) -> dict:
    month_start = _month_start_iso()
    query = (
        get_supabase()
        .table("purchase_orders")
        .select("po_number, total_amount, status, created_at, vendors(company_name)")
        .gte("created_at", month_start)
    )
    if role == "vendor" and vendor_id:
        query = query.eq("vendor_id", vendor_id)
    elif role == "vendor":
        return {"total_inr": 0, "items": []}

    result = query.execute()
    items = [p for p in (result.data or []) if p.get("status") not in ("cancelled", "draft")]
    total = sum(float(p.get("total_amount") or 0) for p in items)
    return {
        "total_inr": total,
        "total_formatted": _format_inr(total),
        "count": len(items),
        "items": items[:10],
    }


def _invoice_summary(role: str, vendor_id: str | None) -> dict:
    if role == "vendor":
        if not vendor_id:
            return {"count": 0, "items": []}
        result = (
            get_supabase()
            .table("invoices")
            .select("invoice_number, status, total_amount, due_date")
            .eq("vendor_id", vendor_id)
            .order("created_at", desc=True)
            .limit(15)
            .execute()
        )
    else:
        result = (
            get_supabase()
            .table("invoices")
            .select("invoice_number, status, total_amount, due_date, vendors(company_name)")
            .order("created_at", desc=True)
            .limit(15)
            .execute()
        )

    items = result.data or []
    unpaid = [i for i in items if i.get("status") not in ("paid", "voided")]
    overdue = [
        i for i in unpaid
        if i.get("due_date") and i["due_date"] < datetime.now(timezone.utc).isoformat()
    ]
    return {
        "total": len(items),
        "unpaid_count": len(unpaid),
        "overdue_count": len(overdue),
        "items": items[:10],
    }


def _purchase_order_summary(role: str, vendor_id: str | None) -> dict:
    query = (
        get_supabase()
        .table("purchase_orders")
        .select("po_number, status, total_amount, issued_at, vendors(company_name)")
        .order("created_at", desc=True)
        .limit(15)
    )
    if role == "vendor" and vendor_id:
        query = query.eq("vendor_id", vendor_id)
    elif role == "vendor":
        return {"count": 0, "items": []}

    result = query.execute()
    items = result.data or []
    open_pos = [p for p in items if p.get("status") in ("issued", "accepted")]
    return {"count": len(items), "open_count": len(open_pos), "items": items}


def _rfq_quotation_context(role: str, vendor_id: str | None, rfq_number: str | None, message: str) -> dict:
    if not rfq_number:
        recent = (
            get_supabase()
            .table("rfqs")
            .select("rfq_number, title, status, deadline")
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        return {
            "error": "RFQ number not found in message.",
            "recent_rfqs": recent.data or [],
            "hint": "Try: Compare quotations for RFQ-2026-SEED-003",
        }

    normalized = rfq_number.upper().replace(" ", "-")
    rfq_result = (
        get_supabase()
        .table("rfqs")
        .select("id, rfq_number, title, status, deadline, description")
        .ilike("rfq_number", f"%{normalized.split('-')[-1]}%")
        .limit(1)
        .execute()
    )
    rfqs = rfq_result.data or []
    if not rfqs:
        rfq_result = (
            get_supabase()
            .table("rfqs")
            .select("id, rfq_number, title, status, deadline, description")
            .eq("rfq_number", normalized)
            .limit(1)
            .execute()
        )
        rfqs = rfq_result.data or []

    if not rfqs:
        return {"error": f"RFQ {rfq_number} not found."}

    rfq = rfqs[0]
    if role == "vendor" and vendor_id:
        assigned = (
            get_supabase()
            .table("rfq_vendor_assignments")
            .select("id")
            .eq("rfq_id", rfq["id"])
            .eq("vendor_id", vendor_id)
            .execute()
        )
        if not assigned.data:
            return {"error": "You are not assigned to this RFQ."}

    quotes_result = (
        get_supabase()
        .table("quotations")
        .select("id, total_amount, delivery_days, status, vendors(company_name, vendor_code, status)")
        .eq("rfq_id", rfq["id"])
        .execute()
    )
    quotes = quotes_result.data or []
    for q in quotes:
        q["total_amount"] = float(q.get("total_amount") or 0)
        q["delivery_days"] = int(q.get("delivery_days") or 0)

    lowest_price = min(quotes, key=lambda q: q["total_amount"]) if quotes else None
    fastest = min(quotes, key=lambda q: q["delivery_days"]) if quotes else None

    return {
        "rfq": rfq,
        "quotations": quotes,
        "analysis": {
            "lowest_price_vendor": lowest_price["vendors"]["company_name"] if lowest_price and lowest_price.get("vendors") else None,
            "lowest_price_inr": lowest_price["total_amount"] if lowest_price else None,
            "fastest_delivery_vendor": fastest["vendors"]["company_name"] if fastest and fastest.get("vendors") else None,
            "fastest_delivery_days": fastest["delivery_days"] if fastest else None,
            "recommended": lowest_price,
        },
    }


def _procurement_report(role: str, vendor_id: str | None) -> dict:
    if role == "vendor":
        return {"note": "Full procurement reports are available to internal staff."}

    month_start = _month_start_iso()
    return {
        "total_rfqs": _count("rfqs"),
        "published_rfqs": _count("rfqs", [("eq", "status", "published")]),
        "closed_rfqs": _count("rfqs", [("eq", "status", "closed")]),
        "approved_approvals": _count("approvals", [("eq", "status", "approved")]),
        "purchase_orders": _count("purchase_orders"),
        "invoices": _count("invoices"),
        "month_spend_inr": _sum_po_amount_since(month_start),
        "vendor_performance": _vendor_analytics(role).get("top_vendors", [])[:5],
    }


def _sum_po_amount_since(iso_date: str) -> float:
    result = (
        get_supabase()
        .table("purchase_orders")
        .select("total_amount, status")
        .gte("created_at", iso_date)
        .execute()
    )
    items = [p for p in (result.data or []) if p.get("status") not in ("cancelled", "draft")]
    return sum(float(p.get("total_amount") or 0) for p in items)


def _proactive_insights(role: str, vendor_id: str | None) -> list[str]:
    insights: list[str] = []
    now = datetime.now(timezone.utc)

    if role in ("admin", "manager", "procurement_officer"):
        pending = _count("approvals", [("eq", "status", "pending")])
        if pending:
            insights.append(f"{pending} approval(s) are awaiting review.")

        nearing = (
            get_supabase()
            .table("rfqs")
            .select("rfq_number, deadline")
            .eq("status", "published")
            .execute()
        )
        soon = 0
        for rfq in nearing.data or []:
            if rfq.get("deadline"):
                deadline = datetime.fromisoformat(rfq["deadline"].replace("Z", "+00:00"))
                days = (deadline - now).days
                if 0 <= days <= 3:
                    soon += 1
        if soon:
            insights.append(f"{soon} published RFQ(s) are nearing their deadline within 3 days.")

        invoices = (
            get_supabase()
            .table("invoices")
            .select("invoice_number, due_date, status")
            .not_.in_("status", ["paid", "voided"])
            .execute()
        )
        overdue = sum(
            1 for inv in (invoices.data or [])
            if inv.get("due_date") and inv["due_date"] < now.isoformat()
        )
        if overdue:
            insights.append(f"{overdue} invoice(s) appear overdue.")

    if role == "vendor" and vendor_id:
        open_rfqs = _pending_rfqs(role, vendor_id)
        if open_rfqs["count"]:
            insights.append(f"You have {open_rfqs['count']} open RFQ invitation(s) to respond to.")

    return insights


def _help_topics(role: str) -> list[str]:
    base = [
        "Ask for a dashboard summary",
        "List pending RFQs or approvals",
        "Compare quotations for an RFQ number",
        "Show monthly spending or invoice status",
        "Generate a procurement report",
    ]
    if role == "vendor":
        return [
            "View my assigned RFQs",
            "Check my quotation status",
            "List my purchase orders",
        ]
    return base
