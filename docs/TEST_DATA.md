# VendorBridge Test Data

Run the seed script to populate the database with accounts and sample procurement workflow data.

## Prerequisites

1. Apply the database schema in [schema.sql](./schema.sql) to your Supabase project.
2. Configure `server/.env` with valid `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

## Seed commands

```bash
cd server
npm run seed          # create test data (skips workflow if already seeded)
npm run seed:reset    # delete previous test data and recreate everything
```

## Login credentials

**Password for all accounts:** `Test@1234`

| Role | Email | Landing page |
|------|-------|--------------|
| Admin | `admin@test.com` | `/dashboard` |
| Procurement Officer | `procurement@test.com` | `/dashboard` |
| Manager | `manager@test.com` | `/dashboard` |
| Vendor (Acme) | `vendor@test.com` | `/vendor-portal` |
| Vendor (Global Parts) | `vendor2@test.com` | `/vendor-portal` |

## Vendors created

| Code | Company | Status | Linked user |
|------|---------|--------|-------------|
| VND-SEED-001 | Acme Industrial Supplies | active | `vendor@test.com` |
| VND-SEED-002 | Global Parts Traders | active | `vendor2@test.com` |
| VND-SEED-003 | Swift Logistics Co. | pending_verification | — |

## RFQs created (year suffix varies, e.g. `RFQ-2026-SEED-003`)

| RFQ | Status | Purpose |
|-----|--------|---------|
| SEED-001 | draft | Create/edit RFQ testing |
| SEED-002 | published | Open RFQ, one vendor bid |
| SEED-003 | published | **Compare Bids** — two competing quotations |
| SEED-004 | closed | **Pending approval** for manager |
| SEED-005 | awarded | Approved + PO + pending invoice |
| SEED-006 | closed | Completed cycle (paid invoice) |
| SEED-007 | cancelled | Status filter testing |
| SEED-008 | closed | Rejected quotation in history |

## Purchase orders & invoices

| Document | Status | Notes |
|----------|--------|-------|
| PO-YYYY-SEED-001 | issued | Global Parts, packaging contract |
| PO-YYYY-SEED-002 | completed | Acme, safety equipment |
| INV-YYYY-SEED-001 | pending_review | Linked to PO-SEED-001 |
| INV-YYYY-SEED-002 | paid | Linked to PO-SEED-002 |

## Suggested workflow test path

1. **Procurement** — open RFQs, publish SEED-001, compare SEED-003.
2. **Vendor** (`vendor2@test.com`) — submit bid on SEED-002.
3. **Manager** — approve pending item on SEED-004.
4. **Procurement** — generate PO from Compare Bids page.
5. **Admin** — review Reports, Activity Logs, Settings.

## Reset / cleanup

`npm run seed:reset` removes only data tied to the test emails and seeded vendor codes (`VND-SEED-*`). It does not delete unrelated production users.
