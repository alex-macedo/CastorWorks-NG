-- Tighten estimates SELECT policies to enforce tenant/project scoping
-- Removes permissive read access and restores owner/project/admin-specific reads

begin;

alter table public.estimates enable row level security;

-- Drop any existing SELECT policies to avoid permissive overlap
drop policy if exists "Users can view all estimates" on public.estimates;
drop policy if exists "Users can view accessible estimates" on public.estimates;
drop policy if exists "Estimate read scoped by ownership or project access" on public.estimates;
drop policy if exists "Estimates read fallback (admin only)" on public.estimates;
drop policy if exists "Users can view own estimates" on public.estimates;
drop policy if exists "Team members can view project estimates" on public.estimates;
drop policy if exists "Admins can view all estimates" on public.estimates;

drop policy if exists "Estimates select - owner" on public.estimates;
create policy "Estimates select - owner"
  on public.estimates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Estimates select - project access" on public.estimates;
create policy "Estimates select - project access"
  on public.estimates
  for select
  to authenticated
  using (has_project_access(auth.uid(), project_id));

drop policy if exists "Estimates select - admin" on public.estimates;
create policy "Estimates select - admin"
  on public.estimates
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

commit;
