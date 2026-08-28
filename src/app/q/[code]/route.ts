import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveQr } from "@/lib/services/qr-service";
import { trackEvent } from "@/lib/services/analytics-service";

/**
 * The permanent QR target: /q/{code}. Never contains menu content itself --
 * it resolves to a business (+ optional table/zone), logs the scan, and
 * redirects to the current public menu. Reassigning a QR to a different
 * table, or changing the menu entirely, never requires reprinting this URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const admin = createAdminClient();

  const resolved = await resolveQr(admin, code);
  if (!resolved) {
    return NextResponse.redirect(new URL("/q/not-found", request.url));
  }

  await trackEvent(admin, {
    business_id: resolved.qr.business_id,
    type: "qr_scanned",
    qr_id: resolved.qr.id,
    table_id: resolved.qr.assigned_table_id,
    zone_id: resolved.qr.assigned_zone_id,
  }).catch(() => {});

  const url = new URL(`/r/${resolved.business_slug}`, request.url);
  url.searchParams.set("qr", code);
  return NextResponse.redirect(url);
}
