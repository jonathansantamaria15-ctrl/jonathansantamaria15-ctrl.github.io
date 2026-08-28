-- ============================================================================
-- 0004_indexes.sql
-- Indexes for tenant-scoped lookups and the public read paths.
-- ============================================================================

create index if not exists idx_businesses_status on public.businesses (status);
create index if not exists idx_businesses_slug on public.businesses (slug);

create index if not exists idx_memberships_user on public.memberships (user_id);
create index if not exists idx_memberships_business on public.memberships (business_id);

create index if not exists idx_invitations_business on public.invitations (business_id);
create index if not exists idx_invitations_token on public.invitations (token);
create index if not exists idx_invitations_email on public.invitations (lower(email));

create index if not exists idx_menus_business on public.menus (business_id);
create index if not exists idx_sections_menu on public.menu_sections (menu_id, position);
create index if not exists idx_sections_business on public.menu_sections (business_id);
create index if not exists idx_sections_parent on public.menu_sections (parent_id);

create index if not exists idx_products_section on public.products (section_id, position);
create index if not exists idx_products_business on public.products (business_id);
create index if not exists idx_products_status on public.products (business_id, status);

create index if not exists idx_variants_product on public.product_variants (product_id);
create index if not exists idx_extras_product on public.product_extras (product_id);

create index if not exists idx_zones_business on public.zones (business_id);
create index if not exists idx_tables_business on public.tables (business_id);
create index if not exists idx_tables_zone on public.tables (zone_id);

create index if not exists idx_qr_codes_business on public.qr_codes (business_id);
create index if not exists idx_qr_codes_code on public.qr_codes (code);

create index if not exists idx_services_business on public.business_services (business_id);
create index if not exists idx_media_business on public.media (business_id);

create index if not exists idx_events_business_time on public.analytics_events (business_id, created_at desc);
create index if not exists idx_events_type on public.analytics_events (business_id, type, created_at desc);
create index if not exists idx_events_qr on public.analytics_events (qr_id);
