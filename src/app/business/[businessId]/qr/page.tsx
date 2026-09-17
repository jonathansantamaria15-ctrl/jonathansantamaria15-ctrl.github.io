import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { listQrCodes, listQrTemplates, listTables, listZones } from "@/lib/services/qr-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  saveTemplateAction,
  createQrAction,
  generateQrsForAllTablesAction,
  reassignQrAction,
  toggleQrActiveAction,
} from "./actions";

export default async function QrPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const [templates, qrCodes, tables, zones] = await Promise.all([
    listQrTemplates(supabase, businessId),
    listQrCodes(supabase, businessId),
    listTables(supabase, businessId),
    listZones(supabase, businessId),
  ]);
  const template = templates[0];
  const tableLabel = new Map(tables.map((t) => [t.id, t.label]));
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-chrome-text">Codigos QR</h1>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-chrome-text">Plantilla</h2>
        <p className="mb-3 text-xs text-chrome-muted">
          Se aplica a todos los QR de este establecimiento. El codigo en si nunca cambia: solo
          cambia su apariencia y a que mesa/zona esta asignado.
        </p>
        <form action={saveTemplateAction.bind(null, businessId, template?.id)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fg_color">Color del codigo</Label>
            <input type="color" id="fg_color" name="fg_color" defaultValue={template?.fg_color ?? "#111827"} className="h-9 w-16 rounded border border-chrome-border bg-transparent" />
          </div>
          <div>
            <Label htmlFor="bg_color">Fondo</Label>
            <input type="color" id="bg_color" name="bg_color" defaultValue={template?.bg_color ?? "#ffffff"} className="h-9 w-16 rounded border border-chrome-border bg-transparent" />
          </div>
          <div>
            <Label htmlFor="accent_color">Color de acento (marco/texto)</Label>
            <input type="color" id="accent_color" name="accent_color" defaultValue={template?.accent_color ?? "#b45309"} className="h-9 w-16 rounded border border-chrome-border bg-transparent" />
          </div>
          <div>
            <Label htmlFor="logo_url">Logo (URL, opcional)</Label>
            <Input id="logo_url" name="logo_url" type="url" defaultValue={template?.logo_url ?? ""} />
          </div>
          <div>
            <Label htmlFor="frame_style">Marco</Label>
            <select id="frame_style" name="frame_style" defaultValue={template?.frame_style ?? "rounded"} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="none">Sin marco</option>
              <option value="rounded">Redondeado</option>
              <option value="square">Recto</option>
              <option value="scan-me">Con &quot;escanea aqui&quot;</option>
            </select>
          </div>
          <div>
            <Label htmlFor="corner_style">Esquinas de los modulos</Label>
            <select id="corner_style" name="corner_style" defaultValue={template?.corner_style ?? "square"} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="square">Cuadradas</option>
              <option value="rounded">Redondeadas</option>
              <option value="dot">Puntos</option>
            </select>
          </div>
          <div>
            <Label htmlFor="label_position">Posicion de la etiqueta</Label>
            <select id="label_position" name="label_position" defaultValue={template?.label_position ?? "bottom"} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="top">Arriba</option>
              <option value="bottom">Abajo</option>
              <option value="none">Sin etiqueta</option>
            </select>
          </div>
          <div>
            <Label htmlFor="cta_text">Texto de llamada a la accion</Label>
            <Input id="cta_text" name="cta_text" defaultValue={template?.cta_text ?? "Escanea para ver la carta"} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Guardar plantilla</Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Crear QR</h2>
          <form action={createQrAction.bind(null, businessId)} className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <select id="type" name="type" className="rounded-lg border border-chrome-border bg-chrome-bg px-2 py-2 text-sm">
              <option value="general">General (establecimiento)</option>
              <option value="table">Mesa</option>
              <option value="zone">Zona</option>
              <option value="custom">Personalizado</option>
            </select>
            <Label htmlFor="label">Etiqueta</Label>
            <Input id="label" name="label" placeholder="Mesa 3" required />
            <Label htmlFor="assigned_table_id">Mesa (opcional)</Label>
            <select id="assigned_table_id" name="assigned_table_id" className="rounded-lg border border-chrome-border bg-chrome-bg px-2 py-2 text-sm">
              <option value="">—</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              Crear QR
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-chrome-text">Generar en bloque</h2>
          <p className="mb-3 text-xs text-chrome-muted">
            Crea un QR de tipo &quot;mesa&quot; para cada mesa que todavia no tenga uno, con la
            plantilla actual.
          </p>
          <form action={generateQrsForAllTablesAction.bind(null, businessId)}>
            <input type="hidden" name="template_id" value={template?.id ?? ""} />
            <Button type="submit">Generar QR para mesas sin QR</Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">QR existentes ({qrCodes.length})</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="flex flex-col gap-2 rounded-xl border border-chrome-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-chrome-text">{qr.label}</span>
                <Badge tone={qr.is_active ? "success" : "neutral"}>{qr.is_active ? "activo" : "inactivo"}</Badge>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${qr.id}?format=svg`} alt={`QR ${qr.label}`} className="mx-auto h-32 w-32 object-contain" />
              <p className="text-center text-xs text-chrome-muted">
                {qr.assigned_table_id ? tableLabel.get(qr.assigned_table_id) : qr.assigned_zone_id ? zoneName.get(qr.assigned_zone_id) : qr.type}
              </p>
              <div className="flex justify-center gap-2 text-xs">
                <a href={`/api/qr/${qr.id}?format=svg&download=1`} className="text-chrome-text hover:underline">
                  SVG
                </a>
                <a href={`/api/qr/${qr.id}?format=png&download=1`} className="text-chrome-text hover:underline">
                  PNG
                </a>
              </div>
              <form action={reassignQrAction.bind(null, businessId, qr.id)} className="flex gap-1">
                <select name="assigned_table_id" defaultValue={qr.assigned_table_id ?? ""} className="flex-1 rounded border border-chrome-border bg-chrome-bg px-1 py-1 text-xs">
                  <option value="">Sin mesa</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="secondary">
                  Reasignar
                </Button>
              </form>
              <form action={toggleQrActiveAction.bind(null, businessId, qr.id, !qr.is_active)}>
                <Button type="submit" size="sm" variant={qr.is_active ? "danger" : "secondary"} className="w-full">
                  {qr.is_active ? "Desactivar" : "Activar"}
                </Button>
              </form>
            </div>
          ))}
          {qrCodes.length === 0 ? <p className="text-sm text-chrome-muted">Todavia no hay codigos QR.</p> : null}
        </div>
      </Card>
    </div>
  );
}
