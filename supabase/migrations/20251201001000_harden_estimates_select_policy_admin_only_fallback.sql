-- Temporary fallback: restrict estimates SELECT to admins only
-- Use this if the primary scoped policy fails to deploy; it can be reverted
-- by removing/dropping this policy in a subsequent migration.

begin;

alter table public.estimates enable row level security;

-- Clear any prior SELECT policies to avoid overlaps in fallback mode
drop policy if exists "Estimate read scoped by ownership or project access" on public.estimates;
drop policy if exists "Users can view accessible estimates" on public.estimates;
drop policy if exists "Users can view own estimates" on public.estimates;
drop policy if exists "Team members can view project estimates" on public.estimates;
drop policy if exists "Admins can view all estimates" on public.estimates;

create policy "Estimates read fallback (admin only)"
  on public.estimates
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'));

commit;
