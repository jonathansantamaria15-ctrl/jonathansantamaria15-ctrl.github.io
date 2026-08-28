import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessBySlug, getBusinessTheme } from "@/lib/services/business-service";
import { hydrateMenu } from "@/lib/services/menu-service";
import { listBusinessServices } from "@/lib/services/integrations-service";
import { resolveQr } from "@/lib/services/qr-service";
import { DEFAULT_THEME } from "@/lib/theme/tokens";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { MenuExperience } from "@/components/public/menu-experience";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return {};
  return {
    title: business.name,
    description: business.tagline ?? business.description ?? undefined,
  };
}

export default async function PublicBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ qr?: string }>;
}) {
  const { slug } = await params;
  const { qr } = await searchParams;

  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) notFound();

  const [theme, menu, services] = await Promise.all([
    getBusinessTheme(supabase, business.id),
    hydrateMenu(supabase, business.id),
    listBusinessServices(supabase, business.id),
  ]);

  let qrContext = { qrId: null as string | null, tableId: null as string | null, zoneId: null as string | null };
  let tableLabel: string | null = null;
  if (qr) {
    const admin = createAdminClient();
    const resolved = await resolveQr(admin, qr);
    if (resolved && resolved.qr.business_id === business.id) {
      qrContext = {
        qrId: resolved.qr.id,
        tableId: resolved.qr.assigned_table_id,
        zoneId: resolved.qr.assigned_zone_id,
      };
      tableLabel = resolved.qr.label;
    }
  }

  return (
    <ThemeProvider theme={theme ?? { ...DEFAULT_THEME, business_id: business.id }}>
      <MenuExperience
        business={business}
        theme={theme ?? { ...DEFAULT_THEME, business_id: business.id }}
        menu={menu}
        services={services}
        qrContext={qrContext}
        tableLabel={tableLabel}
      />
    </ThemeProvider>
  );
}
