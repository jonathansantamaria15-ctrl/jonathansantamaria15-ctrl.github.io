import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlatformSummary } from "@/lib/services/analytics-service";
import { listBusinesses } from "@/lib/services/business-service";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MasterDashboardPage() {
  const supabase = await createClient();
  const [summary, recentBusinesses] = await Promise.all([
    getPlatformSummary(supabase),
    listBusinesses(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-chrome-text">Resumen de la plataforma</h1>
        <p className="text-sm text-chrome-muted">Vision global de todos los establecimientos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Establecimientos" value={summary?.businesses_total ?? 0} />
        <StatCard label="Publicados" value={summary?.businesses_published ?? 0} />
        <StatCard label="Usuarios" value={summary?.users_total ?? 0} />
        <StatCard label="Escaneos QR" value={summary?.qr_scans_total ?? 0} />
        <StatCard label="Visitas a carta" value={summary?.visits_total ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="MRR"
          value="—"
          hint="Facturacion no activada todavia (esquema preparado, plan de suscripciones pendiente)."
        />
        <StatCard
          label="Altas / bajas (30d)"
          value="—"
          hint="Se calculara cuando exista sistema comercial completo."
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-chrome-text">Actividad reciente</h2>
          <Link href="/master/businesses" className="text-xs text-chrome-muted hover:text-chrome-text">
            Ver todos
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-chrome-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-chrome-surface text-xs uppercase text-chrome-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {recentBusinesses.slice(0, 8).map((b) => (
                <tr key={b.id} className="border-t border-chrome-border">
                  <td className="px-4 py-2">
                    <Link href={`/master/businesses/${b.id}`} className="hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={b.status === "published" ? "success" : "neutral"}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-chrome-muted">
                    {new Date(b.created_at).toLocaleDateString("es-ES")}
                  </td>
                </tr>
              ))}
              {recentBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-chrome-muted">
                    Todavia no hay establecimientos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
