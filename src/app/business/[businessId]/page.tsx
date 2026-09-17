import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { getBusiness } from "@/lib/services/business-service";
import { getBusinessAnalytics } from "@/lib/services/analytics-service";
import { StatCard, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { publishBusinessAction, unpublishBusinessAction } from "./settings/actions";

export default async function BusinessOverviewPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { role } = await requireBusinessRole(businessId, ["owner", "manager", "employee"]);
  const supabase = await createClient();
  const business = await getBusiness(supabase, businessId);
  const analytics = await getBusinessAnalytics(supabase, businessId, 30);

  const scans = analytics.byType.find((r) => r.type === "qr_scanned")?.count ?? 0;
  const menuOpens = analytics.byType.find((r) => r.type === "menu_opened")?.count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-chrome-text">Resumen (ultimos 30 dias)</h1>
        {business ? (
          <div className="flex gap-2">
            <Link href={`/r/${business.slug}`} target="_blank">
              <Button variant="secondary">Ver preview publica</Button>
            </Link>
            {role === "owner" ? (
              business.status === "published" ? (
                <form action={unpublishBusinessAction.bind(null, businessId)}>
                  <Button variant="danger">Despublicar</Button>
                </form>
              ) : (
                <form action={publishBusinessAction.bind(null, businessId)}>
                  <Button>Publicar</Button>
                </form>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Escaneos QR" value={scans} />
        <StatCard label="Cartas abiertas" value={menuOpens} />
        <StatCard
          label="Productos vistos"
          value={analytics.byType.find((r) => r.type === "product_viewed")?.count ?? 0}
        />
        <StatCard
          label="Consultas al chatbot"
          value={analytics.byType.find((r) => r.type === "chat_query")?.count ?? 0}
        />
      </div>

      {business?.status !== "published" ? (
        <Card>
          <p className="text-sm text-chrome-text">
            Este establecimiento esta en <strong>{business?.status}</strong>. La carta solo es
            visible en la preview privada hasta que lo publiques.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
