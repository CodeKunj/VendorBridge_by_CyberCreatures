-- =============================================================================
-- VendorBridge ERP - Complete Supabase Database Schema
-- =============================================================================

-- Enable extension for uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to ensure clean schema recreation (avoids IF NOT EXISTS column mismatch errors)
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.approvals CASCADE;
DROP TABLE IF EXISTS public.quotation_attachments CASCADE;
DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.rfq_attachments CASCADE;
DROP TABLE IF EXISTS public.rfq_vendor_assignments CASCADE;
DROP TABLE IF EXISTS public.rfq_items CASCADE;
DROP TABLE IF EXISTS public.rfqs CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.auth_sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'vendor', -- admin, procurement_officer, vendor, manager
  status text NOT NULL DEFAULT 'active', -- active, suspended
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- 2. Auth Sessions Table (from auth.sql)
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  device_name text,
  user_agent text,
  ip_address inet,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON public.auth_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked_at ON public.auth_sessions (revoked_at);

-- 3. Password Reset Tokens Table (from auth.sql)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens (expires_at);

-- 4. Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  vendor_code text UNIQUE NOT NULL,
  company_name text NOT NULL,
  category text NOT NULL,
  gst_number text,
  contact_person text,
  phone text,
  email text NOT NULL,
  address text,
  status text NOT NULL DEFAULT 'pending_verification', -- pending_verification, active, suspended
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors (user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON public.vendors (vendor_code);

-- 5. RFQs Table
CREATE TABLE IF NOT EXISTS public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft, published, closed
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfqs_rfq_number ON public.rfqs (rfq_number);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON public.rfqs (status);

-- 6. RFQ Items Table
CREATE TABLE IF NOT EXISTS public.rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  uom text NOT NULL DEFAULT 'units',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON public.rfq_items (rfq_id);

-- 7. RFQ Vendor Assignments Table
CREATE TABLE IF NOT EXISTS public.rfq_vendor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_vendor_assignments_rfq_id ON public.rfq_vendor_assignments (rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_vendor_assignments_vendor_id ON public.rfq_vendor_assignments (vendor_id);

-- 8. RFQ Attachments Table
CREATE TABLE IF NOT EXISTS public.rfq_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_attachments_rfq_id ON public.rfq_attachments (rfq_id);

-- 9. Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL DEFAULT 0,
  delivery_days integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'submitted', -- submitted, accepted, rejected, withdrawn
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotations_rfq_id ON public.quotations (rfq_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vendor_id ON public.quotations (vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations (status);

-- 10. Quotation Items Table
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  delivery_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON public.quotation_items (quotation_id);

-- 11. Quotation Attachments Table
CREATE TABLE IF NOT EXISTS public.quotation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_attachments_quotation_id ON public.quotation_attachments (quotation_id);

-- 12. Approvals Table
CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid REFERENCES public.rfqs(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  level integer NOT NULL DEFAULT 1,
  comments text,
  decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_rfq_id ON public.approvals (rfq_id);
CREATE INDEX IF NOT EXISTS idx_approvals_quotation_id ON public.approvals (quotation_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals (status);

-- 12. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  rfq_id uuid REFERENCES public.rfqs(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft, issued, accepted, completed, cancelled
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON public.purchase_orders (po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON public.purchase_orders (vendor_id);

-- 13. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft, pending_review, approved, paid, voided
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_po_id ON public.invoices (po_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON public.invoices (vendor_id);

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- rfq, quotation, approval, po, invoice, system
  entity_id uuid,
  entity_type text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications (read_at);

-- 15. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  module text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at);

-- 16. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_category ON public.settings (category);
