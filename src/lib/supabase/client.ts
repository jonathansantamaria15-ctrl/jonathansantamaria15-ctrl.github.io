"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses the public anon key only — RLS is the
 * only thing standing between a signed-in user and someone else's data, so
 * every query made with this client must be trusted to enforce itself via
 * the policies in supabase/migrations/0003_rls.sql.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
