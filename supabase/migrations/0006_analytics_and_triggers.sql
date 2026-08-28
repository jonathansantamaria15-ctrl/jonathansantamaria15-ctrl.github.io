-- ============================================================================
-- 0006_analytics_and_triggers.sql
-- Auto-provision a profile row per signed-up user, plus read-side aggregate
-- functions for the MASTER/BUSINESS analytics dashboards. These are plain
-- (not SECURITY DEFINER) SQL functions: RLS on the underlying tables still
-- applies to whoever calls them, so a business owner only ever aggregates
-- their own events and a superadmin aggregates everything - no separate
-- authorization logic to keep in sync.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Per-business event counts by type, since a given timestamp.
create or replace function public.analytics_summary(p_business_id uuid, p_since timestamptz)
returns table (type text, count bigint)
language sql
stable
as $$
  select type, count(*) as count
  from public.analytics_events
  where business_id = p_business_id and created_at >= p_since
  group by type
  order by count desc;
$$;

-- Daily scan/visit volume for a simple line chart.
create or replace function public.analytics_daily(p_business_id uuid, p_since timestamptz)
returns table (day date, count bigint)
language sql
stable
as $$
  select date_trunc('day', created_at)::date as day, count(*) as count
  from public.analytics_events
  where business_id = p_business_id and created_at >= p_since
  group by 1
  order by 1;
$$;

-- Most-viewed products (product_viewed events).
create or replace function public.analytics_top_products(p_business_id uuid, p_since timestamptz, p_limit int default 10)
returns table (product_id uuid, name text, views bigint)
language sql
stable
as $$
  select p.id as product_id, p.name, count(*) as views
  from public.analytics_events e
  join public.products p on p.id = e.product_id
  where e.business_id = p_business_id and e.type = 'product_viewed' and e.created_at >= p_since
  group by p.id, p.name
  order by views desc
  limit p_limit;
$$;

-- QR / table performance.
create or replace function public.analytics_top_qr(p_business_id uuid, p_since timestamptz, p_limit int default 10)
returns table (qr_id uuid, label text, scans bigint)
language sql
stable
as $$
  select q.id as qr_id, q.label, count(*) as scans
  from public.analytics_events e
  join public.qr_codes q on q.id = e.qr_id
  where e.business_id = p_business_id and e.type = 'qr_scanned' and e.created_at >= p_since
  group by q.id, q.label
  order by scans desc
  limit p_limit;
$$;

-- Platform-wide snapshot for the MASTER dashboard. SECURITY DEFINER is
-- required here (it aggregates across every tenant, which per-row RLS would
-- otherwise correctly refuse to a non-member) but it re-checks
-- is_superadmin() itself before returning anything.
create or replace function public.platform_summary()
returns table (
  businesses_total bigint,
  businesses_published bigint,
  users_total bigint,
  qr_scans_total bigint,
  visits_total bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.businesses),
    (select count(*) from public.businesses where status = 'published'),
    (select count(*) from public.profiles),
    (select count(*) from public.analytics_events where type = 'qr_scanned'),
    (select count(*) from public.analytics_events where type = 'menu_opened');
end;
$$;
