-- Give authenticated read access to the troubleshooting entries table (public reference data)
-- Allows troubleshooting entries to be used for documentation/debugging

drop policy if exists anon_read_troubleshooting_entries
on public.troubleshooting_entries;

drop policy if exists authenticated_read_troubleshooting_entries
on public.troubleshooting_entries;

drop policy if exists "authenticated_select_troubleshooting_entries"
on public.troubleshooting_entries;

create policy "authenticated_select_troubleshooting_entries"
on public.troubleshooting_entries
for select
to authenticated
using ((auth.jwt() ->> 'role') = 'service_role');
