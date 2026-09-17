import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { listZones, listTables } from "@/lib/services/qr-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createZoneAction, createTableAction, createTablesBulkAction, deleteTableAction } from "./actions";

export default async function TablesPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const [zones, tables] = await Promise.all([listZones(supabase, businessId), listTables(supabase, businessId)]);
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-chrome-text">Mesas y zonas</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Zonas</h2>
          <form action={createZoneAction.bind(null, businessId)} className="mb-3 flex gap-2">
            <Input name="name" placeholder="Terraza" required className="flex-1" />
            <select name="kind" className="rounded-lg border border-chrome-border bg-chrome-bg px-2 text-sm">
              <option value="interior">Interior</option>
              <option value="terraza">Terraza</option>
              <option value="barra">Barra</option>
              <option value="privado">Privado</option>
              <option value="otro">Otro</option>
            </select>
            <Button type="submit" size="sm">
              Anadir
            </Button>
          </form>
          <ul className="flex flex-col gap-1.5 text-sm">
            {zones.map((z) => (
              <li key={z.id} className="flex items-center justify-between">
                <span>{z.name}</span>
                <Badge>{z.kind}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Anadir mesa</h2>
          <form action={createTableAction.bind(null, businessId)} className="flex flex-col gap-2">
            <Label htmlFor="label">Etiqueta</Label>
            <Input id="label" name="label" placeholder="Mesa 1" required />
            <Label htmlFor="zone_id">Zona</Label>
            <select id="zone_id" name="zone_id" className="rounded-lg border border-chrome-border bg-chrome-bg px-2 py-2 text-sm">
              <option value="">Sin zona</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              Anadir mesa
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Crear mesas en bloque</h2>
          <form
            action={createTablesBulkAction.bind(null, businessId)}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <Label htmlFor="label_prefix">Prefijo</Label>
              <Input id="label_prefix" name="label_prefix" defaultValue="Mesa" className="w-32" />
            </div>
            <div>
              <Label htmlFor="start_at">Empieza en</Label>
              <Input id="start_at" name="start_at" type="number" defaultValue={1} min={1} className="w-24" />
            </div>
            <div>
              <Label htmlFor="count">Cantidad</Label>
              <Input id="count" name="count" type="number" defaultValue={10} min={1} max={200} required className="w-24" />
            </div>
            <div>
              <Label htmlFor="zone_id_bulk">Zona</Label>
              <select id="zone_id_bulk" name="zone_id" className="rounded-lg border border-chrome-border bg-chrome-bg px-2 py-2 text-sm">
                <option value="">Sin zona</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Crear mesas</Button>
          </form>
          <p className="mt-2 text-xs text-chrome-muted">
            Ej: 20 interiores (prefijo &quot;Mesa&quot;) + 8 de terraza (prefijo &quot;Terraza&quot;, zona
            Terraza) en dos envios.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">Mesas ({tables.length})</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {tables.map((t) => (
            <div key={t.id} className="flex flex-col gap-1 rounded-lg border border-chrome-border p-2 text-center">
              <span className="text-sm font-medium text-chrome-text">{t.label}</span>
              <span className="text-xs text-chrome-muted">{t.zone_id ? zoneName.get(t.zone_id) : "—"}</span>
              <form action={deleteTableAction.bind(null, businessId, t.id)}>
                <Button size="sm" variant="ghost" type="submit" className="w-full">
                  Eliminar
                </Button>
              </form>
            </div>
          ))}
          {tables.length === 0 ? <p className="text-sm text-chrome-muted">Sin mesas todavia.</p> : null}
        </div>
      </Card>
    </div>
  );
}
