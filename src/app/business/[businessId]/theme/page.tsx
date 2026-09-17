import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { getBusinessTheme } from "@/lib/services/business-service";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/theme/fonts";
import { DEFAULT_THEME } from "@/lib/theme/tokens";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveThemeAction } from "./actions";

function ColorField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" id={id} name={id} defaultValue={value} className="h-9 w-12 rounded border border-chrome-border bg-transparent" />
        <span className="text-xs text-chrome-muted">{value}</span>
      </div>
    </div>
  );
}

export default async function ThemePage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const theme = (await getBusinessTheme(supabase, businessId)) ?? DEFAULT_THEME;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-chrome-text">Tema visual</h1>
      <p className="mb-4 text-sm text-chrome-muted">
        Define la identidad de tu carta publica. Los cambios se aplican al instante en /r/...
      </p>

      <form action={saveThemeAction.bind(null, businessId)} className="flex flex-col gap-6">
        <Card className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ColorField id="color_primary" label="Primario" value={theme.color_primary} />
          <ColorField id="color_secondary" label="Secundario" value={theme.color_secondary} />
          <ColorField id="color_accent" label="Acento" value={theme.color_accent} />
          <ColorField id="color_bg" label="Fondo" value={theme.color_bg} />
          <ColorField id="color_surface" label="Superficie" value={theme.color_surface} />
          <ColorField id="color_text" label="Texto" value={theme.color_text} />
        </Card>

        <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="font_heading">Tipografia de titulos</Label>
            <select id="font_heading" name="font_heading" defaultValue={theme.font_heading} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              {HEADING_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="font_body">Tipografia de texto</Label>
            <select id="font_body" name="font_body" defaultValue={theme.font_body} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              {BODY_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="button_style">Estilo de botones</Label>
            <select id="button_style" name="button_style" defaultValue={theme.button_style} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="solid">Solido</option>
              <option value="outline">Contorno</option>
              <option value="ghost">Sutil</option>
              <option value="pill">Pildora</option>
            </select>
          </div>
          <div>
            <Label htmlFor="radius">Bordes</Label>
            <select id="radius" name="radius" defaultValue={theme.radius} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="none">Rectos</option>
              <option value="sm">Suaves</option>
              <option value="md">Medios</option>
              <option value="lg">Redondeados</option>
              <option value="full">Muy redondeados</option>
            </select>
          </div>
          <div>
            <Label htmlFor="card_style">Estilo de tarjetas</Label>
            <select id="card_style" name="card_style" defaultValue={theme.card_style} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="elevated">Elevadas</option>
              <option value="flat">Planas</option>
              <option value="outlined">Con borde</option>
              <option value="image-forward">Imagen grande</option>
            </select>
          </div>
          <div>
            <Label htmlFor="nav_style">Navegacion de categorias</Label>
            <select id="nav_style" name="nav_style" defaultValue={theme.nav_style} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="tabs">Pestanas</option>
              <option value="chips">Chips</option>
              <option value="sidebar">Lateral</option>
            </select>
          </div>
          <div>
            <Label htmlFor="hero_style">Estilo de cabecera</Label>
            <select id="hero_style" name="hero_style" defaultValue={theme.hero_style} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="full-bleed">Imagen completa</option>
              <option value="split">Dividida</option>
              <option value="minimal">Minimal</option>
              <option value="logo-centric">Logo centrado</option>
            </select>
          </div>
          <div>
            <Label htmlFor="density">Densidad</Label>
            <select id="density" name="density" defaultValue={theme.density} className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm">
              <option value="compact">Compacta</option>
              <option value="comfortable">Comoda</option>
              <option value="spacious">Espaciosa</option>
            </select>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <Label htmlFor="logo_url">Logo (URL)</Label>
            <Input id="logo_url" name="logo_url" type="url" defaultValue={theme.logo_url ?? ""} />
          </div>
          <div>
            <Label htmlFor="hero_image_url">Imagen principal / hero (URL)</Label>
            <Input id="hero_image_url" name="hero_image_url" type="url" defaultValue={theme.hero_image_url ?? ""} />
          </div>
          <div>
            <Label htmlFor="gallery_urls">Galeria ambiental (una URL por linea)</Label>
            <textarea
              id="gallery_urls"
              name="gallery_urls"
              rows={4}
              defaultValue={theme.gallery_urls.join("\n")}
              className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm"
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg">
            Guardar tema
          </Button>
        </div>
      </form>
    </div>
  );
}
