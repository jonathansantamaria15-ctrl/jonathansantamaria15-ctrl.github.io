-- ============================================================================
-- 0005_storage.sql
-- A single public "media" bucket. Objects are namespaced by business id
-- (media/<business_id>/...) and RLS on storage.objects enforces that only
-- staff of that business (or the superadmin/service role) can write there;
-- reads are public since published menu images must be servable to anon
-- visitors without authentication.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media bucket: public read" on storage.objects;
create policy "media bucket: public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media bucket: staff write" on storage.objects;
create policy "media bucket: staff write" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and (
      public.is_superadmin()
      or public.has_business_role(((storage.foldername(name))[1])::uuid, array['owner', 'manager'])
    )
  );

drop policy if exists "media bucket: staff update" on storage.objects;
create policy "media bucket: staff update" on storage.objects
  for update using (
    bucket_id = 'media'
    and (
      public.is_superadmin()
      or public.has_business_role(((storage.foldername(name))[1])::uuid, array['owner', 'manager'])
    )
  );

drop policy if exists "media bucket: staff delete" on storage.objects;
create policy "media bucket: staff delete" on storage.objects
  for delete using (
    bucket_id = 'media'
    and (
      public.is_superadmin()
      or public.has_business_role(((storage.foldername(name))[1])::uuid, array['owner', 'manager'])
    )
  );
