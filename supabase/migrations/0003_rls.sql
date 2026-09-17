-- ============================================================================
-- 0003_rls.sql
-- Row Level Security. Default-deny: RLS is enabled on every tenant table and
-- only the policies below grant access. service_role (used by the server and
-- the MCP server) bypasses RLS entirely, as is standard for Supabase.
-- ============================================================================

alter table public.superadmins enable row level security;
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_themes enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.menus enable row level security;
alter table public.menu_sections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_extras enable row level security;
alter table public.zones enable row level security;
alter table public.tables enable row level security;
alter table public.qr_templates enable row level security;
alter table public.qr_codes enable row level security;
alter table public.business_services enable row level security;
alter table public.media enable row level security;
alter table public.analytics_events enable row level security;

-- superadmins: no anon/authenticated policies at all (service_role only).

-- profiles ----------------------------------------------------------------------
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid() or public.is_superadmin());
create policy "profiles: self upsert" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid());

-- businesses ----------------------------------------------------------------------
create policy "businesses: read" on public.businesses
  for select using (
    status = 'published'
    or public.is_superadmin()
    or public.has_business_role(id, array['owner', 'manager', 'employee'])
  );
create policy "businesses: superadmin insert" on public.businesses
  for insert with check (public.is_superadmin());
create policy "businesses: update by staff" on public.businesses
  for update using (
    public.is_superadmin()
    or public.has_business_role(id, array['owner', 'manager'])
  );
create policy "businesses: superadmin delete" on public.businesses
  for delete using (public.is_superadmin());

-- business_themes ----------------------------------------------------------------
create policy "themes: read" on public.business_themes
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
  );
create policy "themes: write by owner/manager" on public.business_themes
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- memberships ----------------------------------------------------------------------
create policy "memberships: read own scope" on public.memberships
  for select using (
    user_id = auth.uid()
    or public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager'])
  );
create policy "memberships: owner manages" on public.memberships
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner'])
  );

-- invitations ----------------------------------------------------------------------
-- OWNER may invite MANAGER/EMPLOYEE for their own business. Only SUPERADMIN
-- may create an 'owner' invitation (assigning a new business's owner).
create policy "invitations: owner manages" on public.invitations
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner'])
  ) with check (
    public.is_superadmin()
    or (public.has_business_role(business_id, array['owner']) and role <> 'owner')
  );

-- menus ----------------------------------------------------------------------
create policy "menus: read" on public.menus
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or (status = 'published' and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'published'
    ))
  );
create policy "menus: write by owner/manager" on public.menus
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- menu_sections ----------------------------------------------------------------------
create policy "sections: read" on public.menu_sections
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or (status = 'published' and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'published'
    ))
  );
create policy "sections: write by owner/manager" on public.menu_sections
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- products ----------------------------------------------------------------------
create policy "products: read" on public.products
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or (status = 'published' and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'published'
    ))
  );
create policy "products: write by owner/manager" on public.products
  for insert with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );
create policy "products: update by owner/manager" on public.products
  for update using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );
create policy "products: delete by owner/manager" on public.products
  for delete using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );
-- NOTE: EMPLOYEE availability toggling goes through the
-- public.set_product_availability() SECURITY DEFINER RPC, not direct table writes.

-- product_variants / product_extras ------------------------------------------------
create policy "variants: read" on public.product_variants
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
  );
create policy "variants: write by owner/manager" on public.product_variants
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

create policy "extras: read" on public.product_extras
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
  );
create policy "extras: write by owner/manager" on public.product_extras
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- zones / tables (never exposed to anon; QR resolution happens server-side) ---------
create policy "zones: staff read" on public.zones
  for select using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
  );
create policy "zones: write by owner/manager" on public.zones
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

create policy "tables: staff read" on public.tables
  for select using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
  );
create policy "tables: write by owner/manager" on public.tables
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- qr_templates / qr_codes (staff only; public resolution is server-side via service role) --
create policy "qr_templates: staff read" on public.qr_templates
  for select using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
  );
create policy "qr_templates: write by owner/manager" on public.qr_templates
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

create policy "qr_codes: staff read" on public.qr_codes
  for select using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
  );
create policy "qr_codes: write by owner/manager" on public.qr_codes
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- business_services ----------------------------------------------------------------------
create policy "services: read" on public.business_services
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or (is_active and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'published'
    ))
  );
create policy "services: write by owner/manager" on public.business_services
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- media ----------------------------------------------------------------------
create policy "media: read" on public.media
  for select using (
    public.is_superadmin()
    or public.has_business_role(business_id, array['owner', 'manager', 'employee'])
    or exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
  );
create policy "media: write by owner/manager" on public.media
  for all using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  ) with check (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );

-- analytics_events ----------------------------------------------------------------------
-- No anon/authenticated INSERT policy: all event writes go through the
-- server-side /api/track route using the service role key.
create policy "analytics: staff read" on public.analytics_events
  for select using (
    public.is_superadmin() or public.has_business_role(business_id, array['owner', 'manager'])
  );
