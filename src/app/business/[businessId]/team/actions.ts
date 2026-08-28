"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole, getCurrentUser } from "@/lib/auth";
import { invitationCreateSchema } from "@/lib/schemas";
import { createInvitation, revokeInvitation, removeMembership } from "@/lib/services/membership-service";

export async function inviteAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner"]);
  const user = await getCurrentUser();
  const supabase = await createClient();

  const parsed = invitationCreateSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await createInvitation(supabase, businessId, user!.id, parsed.data);
  revalidatePath(`/business/${businessId}/team`);
}

export async function revokeInvitationAction(businessId: string, invitationId: string) {
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();
  await revokeInvitation(supabase, businessId, invitationId);
  revalidatePath(`/business/${businessId}/team`);
}

export async function removeMemberAction(businessId: string, membershipId: string) {
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();
  await removeMembership(supabase, businessId, membershipId);
  revalidatePath(`/business/${businessId}/team`);
}
