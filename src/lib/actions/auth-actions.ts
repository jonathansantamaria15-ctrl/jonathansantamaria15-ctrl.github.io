"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** One-time, zero-config: the first authenticated user may claim SUPERADMIN. */
export async function claimSuperadminAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/master");

  const { data, error } = await supabase.rpc("bootstrap_superadmin");
  if (error || !data) {
    redirect("/master?claim_failed=1");
  }
  redirect("/master");
}
