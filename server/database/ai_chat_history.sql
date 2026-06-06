create table if not exists public.ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  response text not null,
  intent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_history_user_id on public.ai_chat_history (user_id);
create index if not exists idx_ai_chat_history_created_at on public.ai_chat_history (created_at desc);
