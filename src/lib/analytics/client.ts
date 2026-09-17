"use client";

import type { AnalyticsEventType } from "@/lib/types";

const SESSION_KEY = "hosteleria_session_id";

/** A random, anonymous, per-browser-tab id. Never a user identity. */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

export interface TrackContext {
  businessId: string;
  qrId?: string | null;
  tableId?: string | null;
  zoneId?: string | null;
}

export function track(
  ctx: TrackContext,
  type: AnalyticsEventType,
  extra: { sectionId?: string; productId?: string; serviceId?: string; metadata?: Record<string, unknown> } = {}
) {
  const payload = {
    business_id: ctx.businessId,
    type,
    qr_id: ctx.qrId ?? null,
    table_id: ctx.tableId ?? null,
    zone_id: ctx.zoneId ?? null,
    section_id: extra.sectionId ?? null,
    product_id: extra.productId ?? null,
    service_id: extra.serviceId ?? null,
    session_id: getSessionId(),
    metadata: extra.metadata ?? {},
  };

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  } else {
    fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  }
}
