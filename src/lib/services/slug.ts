import type { SupabaseClient } from "@supabase/supabase-js";

const COMBINING_MARKS = /[̀-ͯ]/g;

export function slugify(input: string): string {
  const cleaned = input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "local";
}

export async function uniqueSlug(client: SupabaseClient, base: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  // Small tenant volumes expected; a short probe loop is simpler and safer
  // than a DB-side sequence/trigger for this.
  while (n < 200) {
    const { data } = await client.from("businesses").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  throw new Error("Could not allocate a unique slug");
}
