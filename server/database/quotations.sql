create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  total_amount numeric,
  delivery_days integer,
  notes text,
  status text not null default 'submitted',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id, vendor_id)
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_name text not null,
  quantity numeric not null,
  unit_price numeric not null,
  delivery_time integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.quotation_attachments (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_url text,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotations_rfq_id on public.quotations (rfq_id);
create index if not exists idx_quotations_vendor_id on public.quotations (vendor_id);
create index if not exists idx_quotations_status on public.quotations (status);
create index if not exists idx_quotation_items_quotation_id on public.quotation_items (quotation_id);
create index if not exists idx_quotation_attachments_quotation_id on public.quotation_attachments (quotation_id);