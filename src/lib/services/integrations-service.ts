import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessService } from "@/lib/types";
import type { serviceUpsertSchema } from "@/lib/schemas";
import type { z } from "zod";
import { ServiceError } from "./business-service";

export async function upsertBusinessService(
  client: SupabaseClient,
  businessId: string,
  input: z.infer<typeof serviceUpsertSchema>
): Promise<BusinessService> {
  const { data, error } = await client
    .from("business_services")
    .upsert({ ...input, business_id: businessId }, { onConflict: "business_id,type" })
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to save service");
  return data as BusinessService;
}

export async function listBusinessServices(
  client: SupabaseClient,
  businessId: string
): Promise<BusinessService[]> {
  const { data } = await client
    .from("business_services")
    .select("*")
    .eq("business_id", businessId)
    .order("position", { ascending: true });
  return (data as BusinessService[]) ?? [];
}
