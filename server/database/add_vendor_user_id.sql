-- Link vendor records to login accounts (required for vendor portal RFQ filtering)
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors (user_id);
