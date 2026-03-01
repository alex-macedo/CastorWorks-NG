-- Harden estimates SELECT policy to enforce tenant scoping
-- Guarantees only owners, project members (via has_project_access), or admins can read estimates
-- This replaces prior permissive/duplicative SELECT policies.

begin;

alter table public.estimates enable row level security;

drop policy if exists "Users can view accessible estimates" on public.estimates;
drop policy if exists "Users can view own estimates" on public.estimates;
drop policy if exists "Team members can view project estimates" on public.estimates;
drop policy if exists "Admins can view all estimates" on public.estimates;

create policy "Estimate read scoped by ownership or project access"
  on public.estimates
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or has_role(auth.uid(), 'admin')
    or has_project_access(auth.uid(), project_id)
  );

commit;
