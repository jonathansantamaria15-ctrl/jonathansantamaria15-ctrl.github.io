import type { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type { Invitation, Membership } from "@/lib/types";
import type { invitationCreateSchema } from "@/lib/schemas";
import type { z } from "zod";
import { ServiceError } from "./business-service";

export async function listMemberships(client: SupabaseClient, businessId: string): Promise<Membership[]> {
  const { data } = await client.from("memberships").select("*").eq("business_id", businessId);
  return (data as Membership[]) ?? [];
}

export async function removeMembership(client: SupabaseClient, businessId: string, membershipId: string) {
  const { error } = await client
    .from("memberships")
    .delete()
    .eq("id", membershipId)
    .eq("business_id", businessId);
  if (error) throw new ServiceError(error.message);
}

export async function createInvitation(
  client: SupabaseClient,
  businessId: string,
  invitedBy: string,
  input: z.infer<typeof invitationCreateSchema>
): Promise<Invitation> {
  const token = nanoid(24);
  const { data, error } = await client
    .from("invitations")
    .insert({ ...input, email: input.email.toLowerCase(), business_id: businessId, token, invited_by: invitedBy })
    .select("*")
    .single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to create invitation");
  return data as Invitation;
}

export async function listInvitations(client: SupabaseClient, businessId: string): Promise<Invitation[]> {
  const { data } = await client
    .from("invitations")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return (data as Invitation[]) ?? [];
}

export async function revokeInvitation(client: SupabaseClient, businessId: string, id: string) {
  const { error } = await client
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) throw new ServiceError(error.message);
}
