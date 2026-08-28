-- ============================================================================
-- 0002_functions.sql
-- Security-definer helper functions used by RLS policies and by controlled
-- privilege-escalation operations (bootstrap, invitations, employee actions).
-- ============================================================================

-- Generic updated_at trigger ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses', 'business_themes', 'memberships', 'menus', 'menu_sections',
    'products', 'qr_templates', 'qr_codes'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- is_superadmin() ---------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.superadmins s where s.user_id = auth.uid()
  );
$$;

-- has_business_role(business_id, roles[]) ---------------------------------------
create or replace function public.has_business_role(p_business_id uuid, p_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.business_id = p_business_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

-- current_business_role(business_id) --------------------------------------------
create or replace function public.current_business_role(p_business_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select m.role from public.memberships m
  where m.business_id = p_business_id and m.user_id = auth.uid()
  limit 1;
$$;

-- bootstrap_superadmin() ---------------------------------------------------------
-- One-time zero-config bootstrap: the first authenticated user may claim the
-- SUPERADMIN role only while the superadmins table is empty.
create or replace function public.bootstrap_superadmin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.superadmins) then
    return false;
  end if;

  insert into public.superadmins (user_id) values (auth.uid());
  return true;
end;
$$;

-- accept_invitation(token) -------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invitations%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite from public.invitations
  where token = p_token and status = 'pending'
  for update;

  if not found then
    raise exception 'invitation not found or already used';
  end if;

  if v_invite.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_invite.id;
    raise exception 'invitation expired';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  if v_email is null or lower(v_email) <> lower(v_invite.email) then
    raise exception 'invitation email does not match authenticated user';
  end if;

  insert into public.memberships (business_id, user_id, role, invited_by)
  values (v_invite.business_id, auth.uid(), v_invite.role, v_invite.invited_by)
  on conflict (business_id, user_id) do update set role = excluded.role;

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invite.id;

  return v_invite.business_id;
end;
$$;

-- set_product_availability(product_id, is_available) -----------------------------
-- Minimum-privilege path for EMPLOYEE: the only write products RLS allows them.
create or replace function public.set_product_availability(p_product_id uuid, p_is_available boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select business_id into v_business_id from public.products where id = p_product_id;

  if v_business_id is null then
    raise exception 'product not found';
  end if;

  if not (
    public.is_superadmin()
    or public.has_business_role(v_business_id, array['owner', 'manager', 'employee'])
  ) then
    raise exception 'not authorized';
  end if;

  update public.products
  set is_available = p_is_available, updated_at = now()
  where id = p_product_id;
end;
$$;
