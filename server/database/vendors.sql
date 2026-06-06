create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text not null unique,
  company_name text not null,
  gst_number text not null unique,
  contact_person text not null,
  email text not null unique,
  phone text not null,
  address text not null,
  category text not null,
  status text not null default 'pending_verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_company_name on public.vendors (company_name);
create index if not exists idx_vendors_status on public.vendors (status);
create index if not exists idx_vendors_category on public.vendors (category);
create index if not exists idx_vendors_created_at on public.vendors (created_at);