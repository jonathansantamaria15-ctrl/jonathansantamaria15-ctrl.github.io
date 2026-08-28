-- ============================================================================
-- local-auth-shim.sql
-- FOR LOCAL/TEST USE ONLY. Never run against a real Supabase project (it
-- already provides a real `auth` schema + roles). This recreates just enough
-- of Supabase's auth surface (auth.users, auth.uid(), anon/authenticated/
-- service_role roles) on a plain local Postgres so our real RLS policies
-- (0003_rls.sql) can be exercised and tested exactly as they run in prod.
-- ============================================================================

create schema if not exists auth;
create schema if not exists storage;

-- Minimal stand-in for Supabase Storage, just enough for
-- 0005_storage.sql's bucket row + RLS policies to apply cleanly.
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);

create or replace function storage.foldername(name text) returns text[]
language sql immutable
as $$
  select case
    when array_length(string_to_array(name, '/'), 1) <= 1 then '{}'::text[]
    else (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1]
  end;
$$;

alter table storage.objects enable row level security;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- auth.uid(): reads the current request's JWT "sub" claim, set per-session via
-- set_config('request.jwt.claim.sub', '<uuid>', true) -- mirrors Supabase.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role login password 'service_role' bypassrls;
  else
    alter role service_role login password 'service_role' bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_test_user') then
    create role app_test_user login password 'app_test_user' in role authenticated, anon;
  else
    alter role app_test_user login password 'app_test_user';
  end if;
end $$;

grant usage on schema auth, public to anon, authenticated, service_role, app_test_user;
grant select on auth.users to anon, authenticated;
grant all on auth.users to service_role;
-- Table/function grants for the public schema are applied by
-- scripts/local-grants.sql, AFTER migrations create those objects.
