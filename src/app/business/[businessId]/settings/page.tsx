import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { getBusiness } from "@/lib/services/business-service";
import { listBusinessServices } from "@/lib/services/integrations-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { ServiceType } from "@/lib/types";
import { updateBusinessInfoAction, updateServiceAction } from "./actions";

const SERVICE_TYPES: { type: ServiceType; label: string; placeholder: string }[] = [
  { type: "maps", label: "Google Maps", placeholder: "https://maps.google.com/..." },
  { type: "phone", label: "Telefono", placeholder: "+34 600 000 000" },
  { type: "whatsapp", label: "WhatsApp", placeholder: "+34600000000" },
  { type: "email", label: "Email", placeholder: "hola@restaurante.com" },
  { type: "website", label: "Web", placeholder: "https://restaurante.com" },
  { type: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { type: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { type: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { type: "reservations", label: "Reservas", placeholder: "https://..." },
  { type: "reviews", label: "Resenas / Google", placeholder: "https://g.page/..." },
  { type: "delivery", label: "Delivery", placeholder: "https://glovoapp.com/..." },
  { type: "wifi", label: "Wi-Fi", placeholder: "Contrasena: carta2024" },
];

export default async function SettingsPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner"]);
  const supabase = await createClient();
  const [business, services] = await Promise.all([
    getBusiness(supabase, businessId),
    listBusinessServices(supabase, businessId),
  ]);
  if (!business) return null;

  const byType = new Map(services.map((s) => [s.type, s]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-chrome-text">Ajustes</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">Informacion del establecimiento</h2>
        <form action={updateBusinessInfoAction.bind(null, businessId)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={business.name} required />
          </div>
          <div>
            <Label htmlFor="tagline">Eslogan</Label>
            <Input id="tagline" name="tagline" defaultValue={business.tagline ?? ""} />
          </div>
          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" defaultValue={business.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Direccion</Label>
            <Input id="address" name="address" defaultValue={business.address ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Descripcion</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={business.description ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-chrome-text">Servicios e integraciones</h2>
        <p className="mb-4 text-xs text-chrome-muted">
          Solo los activados apareceran en la carta publica.
        </p>
        <div className="flex flex-col gap-3">
          {SERVICE_TYPES.map((s) => {
            const existing = byType.get(s.type);
            return (
              <form
                key={s.type}
                action={updateServiceAction.bind(null, businessId)}
                className="flex flex-col gap-2 border-b border-chrome-border pb-3 last:border-0 sm:flex-row sm:items-center"
              >
                <input type="hidden" name="type" value={s.type} />
                <span className="w-36 shrink-0 text-sm font-medium text-chrome-text">{s.label}</span>
                <Input name="value" defaultValue={existing?.value ?? ""} placeholder={s.placeholder} className="flex-1" />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-chrome-muted">
                  <input type="checkbox" name="is_active" defaultChecked={existing?.is_active ?? false} />
                  Activo
                </label>
                <Button type="submit" size="sm" variant="secondary">
                  Guardar
                </Button>
              </form>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
