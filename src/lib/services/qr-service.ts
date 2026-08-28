import type { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type { QrCode, QrTemplate, RestaurantTable, Zone } from "@/lib/types";
import type {
  qrCreateSchema,
  qrTemplateSchema,
  tableCreateSchema,
  tablesBulkCreateSchema,
  zoneCreateSchema,
} from "@/lib/schemas";
import type { z } from "zod";
import { ServiceError } from "./business-service";

// ---- Zones ------------------------------------------------------------------
export async function createZone(
  client: SupabaseClient,
  businessId: string,
  input: z.infer<typeof zoneCreateSchema>
): Promise<Zone> {
  const { data, error } = await client
    .from("zones")
    .insert({ ...input, business_id: businessId })
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to create zone");
  return data as Zone;
}

export async function listZones(client: SupabaseClient, businessId: string): Promise<Zone[]> {
  const { data } = await client
    .from("zones")
    .select("*")
    .eq("business_id", businessId)
    .order("position", { ascending: true });
  return (data as Zone[]) ?? [];
}

// ---- Tables -------------------------------------------------------------------
export async function createTable(
  client: SupabaseClient,
  businessId: string,
  input: z.infer<typeof tableCreateSchema>
): Promise<RestaurantTable> {
  const { data, error } = await client
    .from("tables")
    .insert({ ...input, business_id: businessId })
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to create table");
  return data as RestaurantTable;
}

export async function createTablesBulk(
  client: SupabaseClient,
  businessId: string,
  input: z.infer<typeof tablesBulkCreateSchema>
): Promise<RestaurantTable[]> {
  const rows = Array.from({ length: input.count }, (_, i) => ({
    business_id: businessId,
    zone_id: input.zone_id ?? null,
    label: `${input.label_prefix} ${input.start_at + i}`,
    capacity: input.capacity ?? null,
  }));
  const { data, error } = await client.from("tables").insert(rows).select("*");
  if (error) throw new ServiceError(error.message);
  return (data as RestaurantTable[]) ?? [];
}

export async function updateTable(
  client: SupabaseClient,
  businessId: string,
  id: string,
  patch: Partial<RestaurantTable>
): Promise<RestaurantTable> {
  const { data, error } = await client
    .from("tables")
    .update(patch)
    .eq("id", id)
    .eq("business_id", businessId)
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to update table");
  return data as RestaurantTable;
}

export async function deleteTable(client: SupabaseClient, businessId: string, id: string) {
  const { error } = await client.from("tables").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw new ServiceError(error.message);
}

export async function listTables(client: SupabaseClient, businessId: string): Promise<RestaurantTable[]> {
  const { data } = await client.from("tables").select("*").eq("business_id", businessId).order("label");
  return (data as RestaurantTable[]) ?? [];
}

// ---- QR templates ---------------------------------------------------------------
export async function upsertQrTemplate(
  client: SupabaseClient,
  businessId: string,
  input: z.infer<typeof qrTemplateSchema>,
  id?: string
): Promise<QrTemplate> {
  const query = id
    ? client.from("qr_templates").update(input).eq("id", id).eq("business_id", businessId)
    : client.from("qr_templates").insert({ ...input, business_id: businessId });
  const { data, error } = await query.select("*").single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to save QR template");
  return data as QrTemplate;
}

export async function listQrTemplates(client: SupabaseClient, businessId: string): Promise<QrTemplate[]> {
  const { data } = await client.from("qr_templates").select("*").eq("business_id", businessId);
  return (data as QrTemplate[]) ?? [];
}

// ---- QR codes ---------------------------------------------------------------------
function generateCode(): string {
  return nanoid(12);
}

export async function createQr(
  client: SupabaseClient,
  businessId: string,
  input: z.infer<typeof qrCreateSchema>,
  createdBy?: string
): Promise<QrCode> {
  const { data, error } = await client
    .from("qr_codes")
    .insert({
      ...input,
      business_id: businessId,
      code: generateCode(),
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to create QR");
  return data as QrCode;
}

export async function generateQrsForTables(
  client: SupabaseClient,
  businessId: string,
  tableIds: string[],
  templateId: string | null,
  createdBy?: string
): Promise<QrCode[]> {
  const { data: tables } = await client
    .from("tables")
    .select("id, label")
    .in("id", tableIds)
    .eq("business_id", businessId);

  const rows = (tables ?? []).map((t: { id: string; label: string }) => ({
    business_id: businessId,
    code: generateCode(),
    type: "table" as const,
    label: t.label,
    assigned_table_id: t.id,
    template_id: templateId,
    created_by: createdBy ?? null,
  }));

  if (rows.length === 0) return [];
  const { data, error } = await client.from("qr_codes").insert(rows).select("*");
  if (error) throw new ServiceError(error.message);
  return (data as QrCode[]) ?? [];
}

export async function updateQrAssignment(
  client: SupabaseClient,
  businessId: string,
  qrId: string,
  patch: { assigned_table_id?: string | null; assigned_zone_id?: string | null; label?: string }
): Promise<QrCode> {
  const { data, error } = await client
    .from("qr_codes")
    .update(patch)
    .eq("id", qrId)
    .eq("business_id", businessId)
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to reassign QR");
  return data as QrCode;
}

export async function setQrActive(
  client: SupabaseClient,
  businessId: string,
  qrId: string,
  isActive: boolean
): Promise<QrCode> {
  const { data, error } = await client
    .from("qr_codes")
    .update({ is_active: isActive })
    .eq("id", qrId)
    .eq("business_id", businessId)
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to update QR");
  return data as QrCode;
}

export async function listQrCodes(client: SupabaseClient, businessId: string): Promise<QrCode[]> {
  const { data } = await client
    .from("qr_codes")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return (data as QrCode[]) ?? [];
}

/**
 * Resolves a scanned QR `code` to its business + table/zone context. Used
 * only by the server-side /q/[code] route (service-role client) — anon
 * clients never query qr_codes directly.
 */
export async function resolveQr(
  client: SupabaseClient,
  code: string
): Promise<{ qr: QrCode; business_slug: string } | null> {
  const { data } = await client
    .from("qr_codes")
    .select("*, business:businesses(slug, status)")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  const business = data.business as { slug: string; status: string } | null;
  if (!business || business.status !== "published") return null;

  const row = data as QrCode & { business: unknown };
  const qr: QrCode = {
    id: row.id,
    code: row.code,
    business_id: row.business_id,
    type: row.type,
    label: row.label,
    assigned_table_id: row.assigned_table_id,
    assigned_zone_id: row.assigned_zone_id,
    template_id: row.template_id,
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  return { qr, business_slug: business.slug };
}
