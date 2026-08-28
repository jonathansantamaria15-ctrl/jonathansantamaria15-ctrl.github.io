"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { zoneCreateSchema, tableCreateSchema, tablesBulkCreateSchema } from "@/lib/schemas";
import { createZone, createTable, createTablesBulk, deleteTable } from "@/lib/services/qr-service";

export async function createZoneAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const parsed = zoneCreateSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  await createZone(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/tables`);
}

export async function createTableAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const parsed = tableCreateSchema.safeParse({
    label: formData.get("label"),
    zone_id: formData.get("zone_id") || null,
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  await createTable(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/tables`);
}

export async function createTablesBulkAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const parsed = tablesBulkCreateSchema.safeParse({
    zone_id: formData.get("zone_id") || null,
    count: Number(formData.get("count")),
    label_prefix: formData.get("label_prefix") || "Mesa",
    start_at: formData.get("start_at") ? Number(formData.get("start_at")) : 1,
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  await createTablesBulk(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/tables`);
}

export async function deleteTableAction(businessId: string, tableId: string) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  await deleteTable(supabase, businessId, tableId);
  revalidatePath(`/business/${businessId}/tables`);
}
