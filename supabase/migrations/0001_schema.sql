-- ============================================================================
-- 0001_schema.sql
-- Core multi-tenant schema for the hospitality SaaS platform.
-- Runs against a Supabase Postgres project (auth.users provided by Supabase Auth).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Platform administration (SUPERADMIN)
-- ----------------------------------------------------------------------------
create table if not exists public.superadmins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users, app-visible metadata only)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Businesses (tenants)
-- ----------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  vertical text not null default 'restaurant',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'unpublished')),
  tagline text,
  description text,
  phone text,
  email text,
  address text,
  lat double precision,
  lng double precision,
  timezone text not null default 'Europe/Madrid',
  opening_hours jsonb not null default '{}'::jsonb,
  plan text not null default 'free',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_themes (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  color_primary text not null default '#1f2937',
  color_secondary text not null default '#6b7280',
  color_bg text not null default '#ffffff',
  color_surface text not null default '#f8f8f7',
  color_text text not null default '#111827',
  color_accent text not null default '#b45309',
  font_heading text not null default 'Fraunces',
  font_body text not null default 'Inter',
  button_style text not null default 'solid' check (button_style in ('solid', 'outline', 'ghost', 'pill')),
  radius text not null default 'md' check (radius in ('none', 'sm', 'md', 'lg', 'full')),
  density text not null default 'comfortable' check (density in ('compact', 'comfortable', 'spacious')),
  card_style text not null default 'elevated' check (card_style in ('elevated', 'flat', 'outlined', 'image-forward')),
  nav_style text not null default 'tabs' check (nav_style in ('tabs', 'chips', 'sidebar')),
  hero_style text not null default 'full-bleed' check (hero_style in ('full-bleed', 'split', 'minimal', 'logo-centric')),
  logo_url text,
  hero_image_url text,
  gallery_urls text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Memberships / RBAC / Invitations
-- ----------------------------------------------------------------------------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'employee')),
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'manager', 'employee')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Universal menu engine
-- ----------------------------------------------------------------------------
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null default 'Carta principal',
  description text,
  language text not null default 'es',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_default boolean not null default true,
  availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  menu_id uuid not null references public.menus (id) on delete cascade,
  parent_id uuid references public.menu_sections (id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  section_id uuid not null references public.menu_sections (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null,
  compare_at_price numeric(10, 2),
  currency text not null default 'EUR',
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  is_available boolean not null default true,
  is_featured boolean not null default false,
  is_recommended boolean not null default false,
  is_new boolean not null default false,
  is_popular boolean not null default false,
  -- Declared-only nutrition/diet info. NULL = unknown/not declared, never inferred.
  ingredients text[],
  allergens text[],
  is_vegetarian boolean,
  is_vegan boolean,
  is_gluten_free boolean,
  spice_level smallint check (spice_level between 0 and 3),
  weight_grams numeric(10, 2),
  serving_size text,
  calories numeric(10, 2),
  pairing_notes text,
  notes text,
  position integer not null default 0,
  image_url text,
  gallery_urls text[] not null default '{}',
  model_3d_url text,
  ar_enabled boolean not null default false,
  availability_hours jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  price_delta numeric(10, 2) not null default 0,
  is_default boolean not null default false,
  position integer not null default 0
);

create table if not exists public.product_extras (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null default 0,
  position integer not null default 0
);

-- ----------------------------------------------------------------------------
-- Zones / Tables / QR
-- ----------------------------------------------------------------------------
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  kind text not null default 'interior' check (kind in ('interior', 'terraza', 'barra', 'privado', 'otro')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  zone_id uuid references public.zones (id) on delete set null,
  label text not null,
  capacity smallint,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.qr_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null default 'Plantilla principal',
  fg_color text not null default '#111827',
  bg_color text not null default '#ffffff',
  accent_color text not null default '#b45309',
  logo_url text,
  frame_style text not null default 'rounded' check (frame_style in ('none', 'rounded', 'square', 'scan-me')),
  corner_style text not null default 'square' check (corner_style in ('square', 'rounded', 'dot')),
  label_position text not null default 'bottom' check (label_position in ('top', 'bottom', 'none')),
  cta_text text not null default 'Escanea para ver la carta',
  font text not null default 'Inter',
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null check (type in ('general', 'table', 'zone', 'custom')),
  label text not null,
  assigned_table_id uuid references public.tables (id) on delete set null,
  assigned_zone_id uuid references public.zones (id) on delete set null,
  template_id uuid references public.qr_templates (id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Services / integrations
-- ----------------------------------------------------------------------------
create table if not exists public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null check (type in (
    'maps', 'phone', 'whatsapp', 'email', 'website', 'instagram',
    'facebook', 'tiktok', 'reservations', 'reviews', 'delivery', 'wifi'
  )),
  label text,
  value text not null,
  is_active boolean not null default false,
  position integer not null default 0,
  unique (business_id, type)
);

-- ----------------------------------------------------------------------------
-- Media library
-- ----------------------------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null,
  storage_path text,
  kind text not null default 'other' check (kind in ('logo', 'hero', 'gallery', 'product', 'other')),
  alt text,
  width integer,
  height integer,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Analytics (privacy-minded: no PII, anonymous session_id only)
-- ----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null check (type in (
    'qr_scanned', 'menu_opened', 'section_viewed', 'product_viewed',
    'chat_opened', 'chat_query', 'service_clicked'
  )),
  qr_id uuid references public.qr_codes (id) on delete set null,
  table_id uuid references public.tables (id) on delete set null,
  zone_id uuid references public.zones (id) on delete set null,
  section_id uuid references public.menu_sections (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  service_id uuid references public.business_services (id) on delete set null,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
