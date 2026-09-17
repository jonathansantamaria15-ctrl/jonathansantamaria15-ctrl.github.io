// Domain logic for businesses/themes. Deliberately framework-agnostic (no
// "server-only", no Next imports) so it is called identically from Next
// Server Actions (with an RLS-bound client) and from the MCP server (with a
// service-role client) — one engine, per the product's CLAUDE=DIRECTOR /
// MOTOR=CONSTRUCTOR split.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Business, BusinessTheme } from "@/lib/types";
import type { BusinessCreateInput, BusinessUpdateInput, ThemeUpdateInput } from "@/lib/schemas";
import { uniqueSlug, slugify } from "./slug";

export class ServiceError extends Error {}

export async function createBusiness(
  client: SupabaseClient,
  input: BusinessCreateInput
): Promise<Business> {
  const slug = input.slug ? slugify(input.slug) : await uniqueSlug(client, input.name);

  const { data: business, error } = await client
    .from("businesses")
    .insert({
      slug,
      name: input.name,
      vertical: input.vertical ?? "restaurant",
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !business) throw new ServiceError(error?.message ?? "Failed to create business");

  await client.from("business_themes").insert({ business_id: business.id });
  const { data: menu } = await client
    .from("menus")
    .insert({ business_id: business.id, name: "Carta principal", is_default: true })
    .select("id")
    .single();
  if (menu) {
    await client.from("menu_sections").insert({
      business_id: business.id,
      menu_id: menu.id,
      name: "General",
      position: 0,
    });
  }

  if (input.ownerEmail) {
    await inviteOwner(client, business.id, input.ownerEmail);
  }

  return business as Business;
}

async function inviteOwner(client: SupabaseClient, businessId: string, email: string) {
  const token = crypto.randomUUID().replace(/-/g, "");
  await client.from("invitations").insert({
    business_id: businessId,
    email: email.toLowerCase(),
    role: "owner",
    token,
  });
  return token;
}

export async function getBusiness(client: SupabaseClient, id: string): Promise<Business | null> {
  const { data } = await client.from("businesses").select("*").eq("id", id).maybeSingle();
  return (data as Business | null) ?? null;
}

export async function getBusinessBySlug(client: SupabaseClient, slug: string): Promise<Business | null> {
  const { data } = await client.from("businesses").select("*").eq("slug", slug).maybeSingle();
  return (data as Business | null) ?? null;
}

export async function listBusinesses(
  client: SupabaseClient,
  opts: { status?: Business["status"] } = {}
): Promise<Business[]> {
  let query = client.from("businesses").select("*").order("created_at", { ascending: false });
  if (opts.status) query = query.eq("status", opts.status);
  const { data } = await query;
  return (data as Business[]) ?? [];
}

export async function updateBusiness(
  client: SupabaseClient,
  id: string,
  patch: BusinessUpdateInput
): Promise<Business> {
  const { data, error } = await client
    .from("businesses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to update business");
  return data as Business;
}

export async function setBusinessStatus(
  client: SupabaseClient,
  id: string,
  status: Business["status"]
): Promise<Business> {
  const { data, error } = await client
    .from("businesses")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to change business status");
  return data as Business;
}

export async function getBusinessTheme(
  client: SupabaseClient,
  businessId: string
): Promise<BusinessTheme | null> {
  const { data } = await client
    .from("business_themes")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as BusinessTheme | null) ?? null;
}

export async function setBusinessTheme(
  client: SupabaseClient,
  businessId: string,
  patch: ThemeUpdateInput
): Promise<BusinessTheme> {
  const { data, error } = await client
    .from("business_themes")
    .update(patch)
    .eq("business_id", businessId)
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to update theme");
  return data as BusinessTheme;
}

export { inviteOwner };
