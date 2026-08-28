import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Load the repo root .env.local (same project, same Supabase credentials the
// Next app uses) so nothing needs to be configured twice.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env.local") });
config({ path: path.resolve(here, "../.env") });

let cached: SupabaseClient | null = null;

/**
 * Service-role client: this is the MCP server's entire authorization model.
 * Whoever can run this process (you, via Claude Code/Desktop, holding the
 * service role key) has the same access as SUPERADMIN -- that's intentional
 * per the product spec ("Claude = agente MASTER"). Every tool still runs
 * its inputs through zod + product rules; this key just replaces "log in as
 * a human" for a trusted local agent. Never expose this key to a browser.
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local at the repo root and fill in your Supabase project credentials."
    );
  }

  cached = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return cached;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
