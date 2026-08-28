import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ALLERGEN_CODES, ALLERGEN_LABELS } from "@/lib/menu/allergens";
import type { ProductWithOptions, SectionWithProducts } from "@/lib/types";
import { saveProductAction } from "../actions";

function flatten(sections: SectionWithProducts[]): { id: string; name: string }[] {
  return sections.flatMap((s) => [{ id: s.id, name: s.name }, ...flatten(s.children)]);
}

export function ProductForm({
  businessId,
  sections,
  product,
  defaultSectionId,
}: {
  businessId: string;
  sections: SectionWithProducts[];
  product?: ProductWithOptions;
  defaultSectionId?: string;
}) {
  const flatSections = flatten(sections);
  const allergenSet = new Set(product?.allergens ?? []);

  return (
    <form action={saveProductAction.bind(null, businessId)} className="flex flex-col gap-6">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-chrome-text">Datos basicos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="section_id">Categoria</Label>
            <select
              id="section_id"
              name="section_id"
              required
              defaultValue={product?.section_id ?? defaultSectionId}
              className="w-full rounded-lg border border-chrome-border bg-chrome-bg px-3 py-2 text-sm"
            >
              {flatSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required defaultValue={product?.name} />
          </div>
          <div>
            <Label htmlFor="price">Precio (EUR)</Label>
            <Input id="price" name="price" type="number" step="0.01" min="0" required defaultValue={product?.price} />
          </div>
          <div>
            <Label htmlFor="compare_at_price">Precio anterior (oferta, opcional)</Label>
            <Input
              id="compare_at_price"
              name="compare_at_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.compare_at_price ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Descripcion</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={product?.description ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="image_url">URL de imagen</Label>
            <Input id="image_url" name="image_url" type="url" defaultValue={product?.image_url ?? ""} />
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-chrome-text">Estado y destacados</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <span>Publicar:</span>
            <select name="status" defaultValue={product?.status ?? "draft"} className="rounded border border-chrome-border bg-chrome-bg px-2 py-1">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="hidden">Oculto</option>
            </select>
          </label>
          {[
            ["is_available", "Disponible", product?.is_available ?? true],
            ["is_featured", "Destacado", product?.is_featured],
            ["is_recommended", "Recomendado", product?.is_recommended],
            ["is_new", "Nuevo", product?.is_new],
            ["is_popular", "Popular", product?.is_popular],
          ].map(([name, label, checked]) => (
            <label key={name as string} className="flex items-center gap-1.5">
              <input type="checkbox" name={name as string} defaultChecked={Boolean(checked)} />
              {label as string}
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-chrome-text">Informacion declarada</h2>
        <p className="text-xs text-chrome-muted">
          Deja en blanco lo que no sepas con certeza. Nunca se inventa: si no lo declaras aqui, no
          se muestra al comensal.
        </p>
        <div>
          <Label htmlFor="ingredients">Ingredientes (separados por comas)</Label>
          <Input id="ingredients" name="ingredients" defaultValue={product?.ingredients?.join(", ") ?? ""} />
        </div>
        <div>
          <Label>Alergenos declarados</Label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {ALLERGEN_CODES.map((code) => (
              <label key={code} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" name={`allergen_${code}`} defaultChecked={allergenSet.has(code)} />
                {ALLERGEN_LABELS[code]}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            ["is_vegetarian", "Vegetariano", product?.is_vegetarian],
            ["is_vegan", "Vegano", product?.is_vegan],
            ["is_gluten_free", "Sin gluten", product?.is_gluten_free],
          ].map(([name, label, checked]) => (
            <label key={name as string} className="flex items-center gap-1.5">
              <input type="checkbox" name={name as string} defaultChecked={Boolean(checked)} />
              {label as string}
            </label>
          ))}
          <label className="flex items-center gap-1.5">
            Picante:
            <select name="spice_level" defaultValue={product?.spice_level ?? ""} className="rounded border border-chrome-border bg-chrome-bg px-2 py-1">
              <option value="">No declarado</option>
              <option value="0">Sin picante</option>
              <option value="1">Suave</option>
              <option value="2">Picante</option>
              <option value="3">Muy picante</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="weight_grams">Peso (g)</Label>
            <Input id="weight_grams" name="weight_grams" type="number" defaultValue={product?.weight_grams ?? ""} />
          </div>
          <div>
            <Label htmlFor="serving_size">Racion / tamano</Label>
            <Input id="serving_size" name="serving_size" defaultValue={product?.serving_size ?? ""} />
          </div>
          <div>
            <Label htmlFor="calories">Calorias (kcal)</Label>
            <Input id="calories" name="calories" type="number" defaultValue={product?.calories ?? ""} />
          </div>
        </div>
        <div>
          <Label htmlFor="pairing_notes">Recomendacion / maridaje</Label>
          <Input id="pairing_notes" name="pairing_notes" defaultValue={product?.pairing_notes ?? ""} />
        </div>
        <div>
          <Label htmlFor="notes">Notas adicionales</Label>
          <Input id="notes" name="notes" defaultValue={product?.notes ?? ""} />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-chrome-text">Variantes y suplementos</h2>
        <p className="text-xs text-chrome-muted">
          Una linea por opcion, formato <code>Nombre: diferencia de precio</code>. Ej: Grande: 2.5
        </p>
        <div>
          <Label htmlFor="variants_text">Variantes (tamano, tipo...)</Label>
          <Textarea
            id="variants_text"
            name="variants_text"
            rows={3}
            defaultValue={product?.variants.map((v) => `${v.name}: ${v.price_delta}`).join("\n") ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="extras_text">Suplementos</Label>
          <Textarea
            id="extras_text"
            name="extras_text"
            rows={3}
            defaultValue={product?.extras.map((e) => `${e.name}: ${e.price}`).join("\n") ?? ""}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          Guardar producto
        </Button>
      </div>
    </form>
  );
}
