"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole, getCurrentUser } from "@/lib/auth";
import { qrTemplateSchema, qrCreateSchema } from "@/lib/schemas";
import {
  upsertQrTemplate,
  createQr,
  generateQrsForTables,
  updateQrAssignment,
  setQrActive,
} from "@/lib/services/qr-service";

export async function saveTemplateAction(businessId: string, templateId: string | undefined, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const parsed = qrTemplateSchema.safeParse({
    name: formData.get("name") || "Plantilla principal",
    fg_color: formData.get("fg_color"),
    bg_color: formData.get("bg_color"),
    accent_color: formData.get("accent_color"),
    logo_url: formData.get("logo_url") || null,
    frame_style: formData.get("frame_style"),
    corner_style: formData.get("corner_style"),
    label_position: formData.get("label_position"),
    cta_text: formData.get("cta_text"),
    font: formData.get("font"),
    is_default: true,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  await upsertQrTemplate(supabase, businessId, parsed.data, templateId);
  revalidatePath(`/business/${businessId}/qr`);
}

export async function createQrAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const user = await getCurrentUser();
  const supabase = await createClient();
  const parsed = qrCreateSchema.safeParse({
    type: formData.get("type"),
    label: formData.get("label"),
    assigned_table_id: formData.get("assigned_table_id") || null,
    assigned_zone_id: formData.get("assigned_zone_id") || null,
    template_id: formData.get("template_id") || null,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  await createQr(supabase, businessId, parsed.data, user?.id);
  revalidatePath(`/business/${businessId}/qr`);
}

export async function generateQrsForAllTablesAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const user = await getCurrentUser();
  const supabase = await createClient();
  const templateId = (formData.get("template_id") as string) || null;

  const { data: tables } = await supabase.from("tables").select("id").eq("business_id", businessId);
  const idsWithoutQr: string[] = [];
  for (const t of tables ?? []) {
    const { count } = await supabase
      .from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("assigned_table_id", t.id);
    if (!count) idsWithoutQr.push(t.id);
  }

  await generateQrsForTables(supabase, businessId, idsWithoutQr, templateId, user?.id);
  revalidatePath(`/business/${businessId}/qr`);
}

export async function reassignQrAction(businessId: string, qrId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  await updateQrAssignment(supabase, businessId, qrId, {
    assigned_table_id: (formData.get("assigned_table_id") as string) || null,
    assigned_zone_id: (formData.get("assigned_zone_id") as string) || null,
  });
  revalidatePath(`/business/${businessId}/qr`);
}

export async function toggleQrActiveAction(businessId: string, qrId: string, next: boolean) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  await setQrActive(supabase, businessId, qrId, next);
  revalidatePath(`/business/${businessId}/qr`);
}
