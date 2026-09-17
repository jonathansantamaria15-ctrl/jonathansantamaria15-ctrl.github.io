import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEvent } from "@/lib/services/analytics-service";

// Public analytics ingestion. Anonymous by design: only a client-generated
// session_id (no auth, no cookies tied to a person) plus coarse context
// (business/section/product/qr/service ids). Writes go through the
// service-role client because RLS deliberately grants anon no direct
// INSERT on analytics_events (see 0003_rls.sql) -- this route is the only
// place that decides what gets recorded.
const trackSchema = z.object({
  business_id: z.string().uuid(),
  type: z.enum([
    "qr_scanned",
    "menu_opened",
    "section_viewed",
    "product_viewed",
    "chat_opened",
    "chat_query",
    "service_clicked",
  ]),
  qr_id: z.string().uuid().nullable().optional(),
  table_id: z.string().uuid().nullable().optional(),
  zone_id: z.string().uuid().nullable().optional(),
  section_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  service_id: z.string().uuid().nullable().optional(),
  session_id: z.string().max(64).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    await trackEvent(admin, parsed.data);
  } catch {
    // Analytics must never break the visitor experience.
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
