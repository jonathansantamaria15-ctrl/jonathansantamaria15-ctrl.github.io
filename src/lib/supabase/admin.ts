import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely — this is a trusted,
 * server-only escape hatch used for: platform-level operations only a
 * SUPERADMIN may perform (creating businesses, publishing), analytics event
 * ingestion, and QR resolution. The `server-only` import makes bundling this
 * into a client component a build-time error, not just a convention.
 *
 * NEVER import this module from a Client Component or expose
 * SUPABASE_SERVICE_ROLE_KEY via NEXT_PUBLIC_*.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. See .env.example."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
