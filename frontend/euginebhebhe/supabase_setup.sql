-- ============================================================
-- Portfolio backend setup — run this in the Metups Supabase
-- project's SQL editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- 1. VISITOR COUNTER ------------------------------------------------
-- A single-row counter table. We never expose it to direct table
-- access — only through the RPC functions below, so visitors can't
-- read/write arbitrary rows.

create table if not exists public.portfolio_counters (
  id text primary key,
  count bigint not null default 0
);

insert into public.portfolio_counters (id, count)
values ('views', 0)
on conflict (id) do nothing;

alter table public.portfolio_counters enable row level security;
-- No policies added on purpose: RLS with zero policies blocks ALL
-- direct table access (even to anon/authenticated), forcing every
-- read/write through the SECURITY DEFINER functions below.

create or replace function public.increment_portfolio_views()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  update public.portfolio_counters
  set count = count + 1
  where id = 'views'
  returning count into new_count;
  return new_count;
end;
$$;

grant execute on function public.increment_portfolio_views() to anon, authenticated;

-- 2. CONTACT FORM -----------------------------------------------
create table if not exists public.portfolio_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.portfolio_messages enable row level security;

-- Anyone can INSERT (submit the form) but nobody can SELECT/UPDATE/
-- DELETE from the client — you'll read messages from the Supabase
-- Table Editor directly, or the admin dashboard you already have.
create policy "Anyone can submit a contact message"
  on public.portfolio_messages
  for insert
  to anon
  with check (true);

-- ============================================================
-- After running this, go to Project Settings → API and copy:
--   - Project URL           → SUPABASE_URL
--   - anon / public API key → SUPABASE_ANON_KEY
-- Paste both into the two placeholders near the top of
-- index.html (search for "TODO").
-- ============================================================
