import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { getBusinessAnalytics } from "@/lib/services/analytics-service";
import { Card } from "@/components/ui/card";
import { DailyChart } from "@/components/charts/daily-chart";

export default async function StatsPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const analytics = await getBusinessAnalytics(supabase, businessId, 30);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-chrome-text">Estadisticas (30 dias)</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">Actividad diaria</h2>
        <DailyChart data={analytics.daily.map((d) => ({ day: d.day, count: Number(d.count) }))} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Por tipo de evento</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {analytics.byType.map((r) => (
              <li key={r.type} className="flex justify-between">
                <span className="text-chrome-muted">{r.type}</span>
                <span className="font-medium text-chrome-text">{r.count}</span>
              </li>
            ))}
            {analytics.byType.length === 0 ? <li className="text-chrome-muted">Sin datos aun.</li> : null}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Productos mas vistos</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {analytics.topProducts.map((p) => (
              <li key={p.product_id} className="flex justify-between">
                <span className="text-chrome-muted">{p.name}</span>
                <span className="font-medium text-chrome-text">{p.views}</span>
              </li>
            ))}
            {analytics.topProducts.length === 0 ? <li className="text-chrome-muted">Sin datos aun.</li> : null}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">QR / mesas con mas escaneos</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {analytics.topQr.map((q) => (
              <li key={q.qr_id} className="flex justify-between">
                <span className="text-chrome-muted">{q.label}</span>
                <span className="font-medium text-chrome-text">{q.scans}</span>
              </li>
            ))}
            {analytics.topQr.length === 0 ? <li className="text-chrome-muted">Sin datos aun.</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
