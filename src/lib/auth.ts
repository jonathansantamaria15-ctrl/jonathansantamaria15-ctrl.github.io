import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isSuperadmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_superadmin");
  return Boolean(data);
}

/** Returns the caller's role on a given business, or null if not a member. */
export async function getBusinessRole(businessId: string): Promise<MembershipRole | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_business_role", { p_business_id: businessId });
  return (data as MembershipRole | null) ?? null;
}

/** Redirects to /login if unauthenticated, otherwise returns the user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects away unless the caller is SUPERADMIN. */
export async function requireSuperadmin() {
  await requireUser();
  const admin = await isSuperadmin();
  if (!admin) redirect("/master/claim");
  return true;
}

/** Redirects away unless the caller holds one of `roles` on `businessId` (or is SUPERADMIN). */
export async function requireBusinessRole(businessId: string, roles: MembershipRole[]) {
  await requireUser();
  const admin = await isSuperadmin();
  if (admin) return { role: "owner" as MembershipRole, isSuperadmin: true };

  const role = await getBusinessRole(businessId);
  if (!role || !roles.includes(role)) redirect("/business");
  return { role, isSuperadmin: false };
}
