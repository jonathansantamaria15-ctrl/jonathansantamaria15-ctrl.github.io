"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) {
    redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/business");
}
