-- FOR LOCAL/TEST USE ONLY. Applied after migrations so it can target the
-- tables that now exist. Mirrors the default grants Supabase sets up
-- automatically for anon/authenticated/service_role in a real project.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to authenticated, anon;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.buckets, storage.objects to service_role;
grant select on storage.buckets to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
