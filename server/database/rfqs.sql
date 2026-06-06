create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  rfq_number text not null unique,
  title text not null,
  description text,
  deadline timestamptz not null,
  status text not null default 'draft',
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rfq_items (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  product_name text not null,
  quantity numeric not null,
  unit text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.rfq_vendor_assignments (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (rfq_id, vendor_id)
);

create table if not exists public.rfq_attachments (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_url text,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_rfqs_deadline on public.rfqs (deadline);
create index if not exists idx_rfqs_status on public.rfqs (status);
create index if not exists idx_rfqs_created_by on public.rfqs (created_by);
create index if not exists idx_rfq_items_rfq_id on public.rfq_items (rfq_id);
create index if not exists idx_rfq_vendor_assignments_rfq_id on public.rfq_vendor_assignments (rfq_id);
create index if not exists idx_rfq_vendor_assignments_vendor_id on public.rfq_vendor_assignments (vendor_id);
create index if not exists idx_rfq_attachments_rfq_id on public.rfq_attachments (rfq_id);