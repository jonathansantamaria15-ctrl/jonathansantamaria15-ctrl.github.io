import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { listMemberships, listInvitations } from "@/lib/services/membership-service";
import { getSiteUrl } from "@/lib/site";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { inviteAction, revokeInvitationAction, removeMemberAction } from "./actions";

export default async function TeamPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();
  const [memberships, invitations] = await Promise.all([
    listMemberships(supabase, businessId),
    listInvitations(supabase, businessId),
  ]);
  const pending = invitations.filter((i) => i.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-chrome-text">Equipo</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">Invitar</h2>
        <form action={inviteAction.bind(null, businessId)} className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="persona@email.com" />
          </div>
          <div>
            <Label htmlFor="role">Rol</Label>
            <select id="role" name="role" className="rounded-lg border border-chrome-border bg-chrome-bg px-2 py-2 text-sm">
              <option value="manager">Gerente</option>
              <option value="employee">Empleado</option>
            </select>
          </div>
          <Button type="submit">Enviar invitacion</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">Miembros ({memberships.length})</h2>
        <ul className="flex flex-col divide-y divide-chrome-border">
          {memberships.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-chrome-muted">{m.user_id.slice(0, 8)}...</span>
              <div className="flex items-center gap-2">
                <Badge>{m.role}</Badge>
                {m.role !== "owner" ? (
                  <form action={removeMemberAction.bind(null, businessId, m.id)}>
                    <Button size="sm" variant="ghost" type="submit">
                      Quitar
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">Invitaciones pendientes ({pending.length})</h2>
        <ul className="flex flex-col divide-y divide-chrome-border">
          {pending.map((inv) => (
            <li key={inv.id} className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-chrome-text">
                  {inv.email} <Badge className="ml-1">{inv.role}</Badge>
                </p>
                <p className="break-all text-xs text-chrome-muted">
                  {getSiteUrl()}/invite/{inv.token}
                </p>
              </div>
              <form action={revokeInvitationAction.bind(null, businessId, inv.id)}>
                <Button size="sm" variant="ghost" type="submit">
                  Revocar
                </Button>
              </form>
            </li>
          ))}
          {pending.length === 0 ? <li className="py-2 text-sm text-chrome-muted">Ninguna.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
