import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsEventType } from "@/lib/types";
import { ServiceError } from "./business-service";

export interface TrackEventInput {
  business_id: string;
  type: AnalyticsEventType;
  qr_id?: string | null;
  table_id?: string | null;
  zone_id?: string | null;
  section_id?: string | null;
  product_id?: string | null;
  service_id?: string | null;
  session_id?: string | null;
  metadata?: Record<string, unknown>;
}

/** Writes one analytics event. Always called with the service-role client
 * (see /api/track) — anon clients have no direct INSERT grant on the table. */
export async function trackEvent(client: SupabaseClient, input: TrackEventInput) {
  const { error } = await client.from("analytics_events").insert(input);
  if (error) throw new ServiceError(error.message);
}

export interface AnalyticsSummary {
  byType: { type: string; count: number }[];
  daily: { day: string; count: number }[];
  topProducts: { product_id: string; name: string; views: number }[];
  topQr: { qr_id: string; label: string; scans: number }[];
}

export async function getBusinessAnalytics(
  client: SupabaseClient,
  businessId: string,
  sinceDays = 30
): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const [byType, daily, topProducts, topQr] = await Promise.all([
    client.rpc("analytics_summary", { p_business_id: businessId, p_since: since }),
    client.rpc("analytics_daily", { p_business_id: businessId, p_since: since }),
    client.rpc("analytics_top_products", { p_business_id: businessId, p_since: since, p_limit: 10 }),
    client.rpc("analytics_top_qr", { p_business_id: businessId, p_since: since, p_limit: 10 }),
  ]);

  return {
    byType: byType.data ?? [],
    daily: daily.data ?? [],
    topProducts: topProducts.data ?? [],
    topQr: topQr.data ?? [],
  };
}

export interface PlatformSummary {
  businesses_total: number;
  businesses_published: number;
  users_total: number;
  qr_scans_total: number;
  visits_total: number;
}

export async function getPlatformSummary(client: SupabaseClient): Promise<PlatformSummary | null> {
  const { data, error } = await client.rpc("platform_summary").maybeSingle();
  if (error) return null;
  return data as PlatformSummary;
}
