"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { businessUpdateSchema, serviceUpsertSchema } from "@/lib/schemas";
import { setBusinessStatus, updateBusiness } from "@/lib/services/business-service";
import { upsertBusinessService } from "@/lib/services/integrations-service";

export async function publishBusinessAction(businessId: string) {
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();
  await setBusinessStatus(supabase, businessId, "published");
  revalidatePath(`/business/${businessId}`);
}

export async function unpublishBusinessAction(businessId: string) {
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();
  await setBusinessStatus(supabase, businessId, "unpublished");
  revalidatePath(`/business/${businessId}`);
}

export async function updateBusinessInfoAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();

  const raw = {
    name: formData.get("name") || undefined,
    tagline: formData.get("tagline") || null,
    description: formData.get("description") || null,
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    address: formData.get("address") || null,
  };
  const parsed = businessUpdateSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await updateBusiness(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/settings`);
}

export async function updateServiceAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();

  const parsed = serviceUpsertSchema.safeParse({
    type: formData.get("type"),
    value: formData.get("value"),
    label: formData.get("label") || null,
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await upsertBusinessService(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/settings`);
  revalidatePath(`/business/${businessId}`);
}
