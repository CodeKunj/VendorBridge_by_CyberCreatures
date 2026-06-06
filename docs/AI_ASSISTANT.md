# VendorBridge AI Procurement Assistant

## Architecture

```
React Chat Widget  →  Node.js POST /api/ai/chat  →  Python FastAPI /chat  →  Gemini + Supabase
                              ↓
                      ai_chat_history table
```

## Setup

### 1. Database

Run in Supabase SQL editor:

```sql
-- server/database/ai_chat_history.sql
```

### 2. Python AI service

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # fill GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY
uvicorn app:app --reload --port 8000
```

### 3. Node.js backend

Add to `server/.env`:

```env
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_SECRET=change-me-in-production
GEMINI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.0-flash
AI_TEMPERATURE=0.4
AI_MAX_TOKENS=1024
```

Restart the API server.

### 4. Admin configuration

1. Login as **admin@test.com**
2. Go to **Settings → AI Assistant**
3. Paste Gemini API key, set model/temperature, enable assistant
4. Save

## API

### POST `/api/ai/chat` (authenticated)

```json
{ "message": "Show pending approvals" }
```

### GET `/api/ai/history?search=&page=1&limit=30`

### GET `/api/ai/status`

## Supported intents

- `dashboard_summary`
- `pending_rfqs`
- `pending_approvals`
- `top_vendors`
- `vendor_performance`
- `monthly_spending`
- `invoice_summary`
- `purchase_order_summary`
- `quotation_comparison`
- `rfq_status`
- `procurement_report`
- `general_help`

## Role-based data access

| Role | Access |
|------|--------|
| Vendor | Own RFQs, quotations, POs |
| Manager | Approvals, reports, analytics |
| Procurement | RFQs, vendors, POs, invoices |
| Admin | Full read access |

The AI is **read-only** — it cannot modify ERP records.
