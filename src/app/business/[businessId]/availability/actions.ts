"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { setProductAvailability } from "@/lib/services/menu-service";

export async function toggleAvailabilityAction(businessId: string, productId: string, next: boolean) {
  await requireBusinessRole(businessId, ["owner", "manager", "employee"]);
  const supabase = await createClient();
  await setProductAvailability(supabase, productId, next);
  revalidatePath(`/business/${businessId}/availability`);
  revalidatePath(`/business/${businessId}/menu`);
}
