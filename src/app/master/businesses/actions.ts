"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth";
import { businessCreateSchema, invitationCreateSchema } from "@/lib/schemas";
import { createBusiness, setBusinessStatus, inviteOwner } from "@/lib/services/business-service";

export async function createBusinessAction(formData: FormData) {
  await requireSuperadmin();
  const supabase = await createClient();

  const parsed = businessCreateSchema.safeParse({
    name: formData.get("name"),
    ownerEmail: formData.get("ownerEmail") || undefined,
    tagline: formData.get("tagline") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const business = await createBusiness(supabase, parsed.data);
  revalidatePath("/master/businesses");
  redirect(`/master/businesses/${business.id}`);
}

export async function publishAction(businessId: string) {
  await requireSuperadmin();
  const supabase = await createClient();
  await setBusinessStatus(supabase, businessId, "published");
  revalidatePath(`/master/businesses/${businessId}`);
  revalidatePath("/master/businesses");
}

export async function unpublishAction(businessId: string) {
  await requireSuperadmin();
  const supabase = await createClient();
  await setBusinessStatus(supabase, businessId, "unpublished");
  revalidatePath(`/master/businesses/${businessId}`);
  revalidatePath("/master/businesses");
}

export async function assignOwnerAction(businessId: string, formData: FormData) {
  await requireSuperadmin();
  const supabase = await createClient();
  const parsed = invitationCreateSchema.shape.email.safeParse(formData.get("email"));
  if (!parsed.success) throw new Error("Email invalido");
  await inviteOwner(supabase, businessId, parsed.data);
  revalidatePath(`/master/businesses/${businessId}`);
}
