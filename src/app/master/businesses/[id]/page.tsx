import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/services/business-service";
import { getBusinessAnalytics } from "@/lib/services/analytics-service";
import { listMemberships, listInvitations } from "@/lib/services/membership-service";
import { Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publishAction, unpublishAction, assignOwnerAction } from "../actions";

export default async function MasterBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const business = await getBusiness(supabase, id);
  if (!business) notFound();

  const [analytics, memberships, invitations] = await Promise.all([
    getBusinessAnalytics(supabase, id),
    listMemberships(supabase, id),
    listInvitations(supabase, id),
  ]);

  const owner = memberships.find((m) => m.role === "owner");
  const totalEvents = analytics.byType.reduce((acc, r) => acc + Number(r.count), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-chrome-text">{business.name}</h1>
            <Badge tone={business.status === "published" ? "success" : "neutral"}>
              {business.status}
            </Badge>
          </div>
          <p className="text-sm text-chrome-muted">/r/{business.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/r/${business.slug}`} target="_blank">
            <Button variant="secondary">Preview</Button>
          </Link>
          <Link href={`/business/${business.id}`}>
            <Button variant="secondary">Panel del negocio</Button>
          </Link>
          {business.status === "published" ? (
            <form action={unpublishAction.bind(null, business.id)}>
              <Button variant="danger">Despublicar</Button>
            </form>
          ) : (
            <form action={publishAction.bind(null, business.id)}>
              <Button>Publicar</Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Eventos (30d)" value={totalEvents} />
        <StatCard
          label="Escaneos QR"
          value={analytics.byType.find((r) => r.type === "qr_scanned")?.count ?? 0}
        />
        <StatCard
          label="Cartas abiertas"
          value={analytics.byType.find((r) => r.type === "menu_opened")?.count ?? 0}
        />
        <StatCard label="Miembros" value={memberships.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Propietario</h2>
          {owner ? (
            <p className="text-sm text-chrome-muted">Asignado (user id {owner.user_id.slice(0, 8)}...)</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-chrome-muted">Todavia no tiene propietario asignado.</p>
              <form action={assignOwnerAction.bind(null, business.id)} className="flex gap-2">
                <Input name="email" type="email" required placeholder="propietario@email.com" />
                <Button type="submit">Invitar</Button>
              </form>
            </>
          )}

          {invitations.filter((i) => i.status === "pending" && i.role === "owner").length > 0 ? (
            <p className="mt-2 text-xs text-chrome-muted">Invitacion de propietario pendiente de aceptar.</p>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Equipo</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {memberships.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span className="text-chrome-muted">{m.user_id.slice(0, 8)}...</span>
                <Badge>{m.role}</Badge>
              </li>
            ))}
            {memberships.length === 0 ? (
              <li className="text-chrome-muted">Sin miembros todavia.</li>
            ) : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
