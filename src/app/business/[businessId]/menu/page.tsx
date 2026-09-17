import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { hydrateMenu } from "@/lib/services/menu-service";
import { formatPrice } from "@/lib/menu/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SectionWithProducts } from "@/lib/types";
import { createSectionAction, updateSectionStatusAction, deleteSectionAction, deleteProductAction } from "./actions";

function SectionBlock({ section, businessId }: { section: SectionWithProducts; businessId: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-chrome-text">{section.name}</h3>
          <Badge tone={section.status === "published" ? "success" : "neutral"}>{section.status}</Badge>
        </div>
        <div className="flex gap-1.5">
          {section.status !== "published" ? (
            <form action={updateSectionStatusAction.bind(null, businessId, section.id, "published")}>
              <Button size="sm" variant="secondary" type="submit">
                Publicar
              </Button>
            </form>
          ) : (
            <form action={updateSectionStatusAction.bind(null, businessId, section.id, "draft")}>
              <Button size="sm" variant="secondary" type="submit">
                Pasar a borrador
              </Button>
            </form>
          )}
          <form action={deleteSectionAction.bind(null, businessId, section.id)}>
            <Button size="sm" variant="danger" type="submit">
              Eliminar
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-chrome-border">
        {section.products.map((product) => (
          <div key={product.id} className="flex items-center justify-between py-2">
            <div>
              <Link
                href={`/business/${businessId}/menu/products/${product.id}`}
                className="text-sm font-medium text-chrome-text hover:underline"
              >
                {product.name}
              </Link>
              <div className="flex gap-1.5 pt-0.5">
                <Badge tone={product.status === "published" ? "success" : "neutral"}>{product.status}</Badge>
                {!product.is_available ? <Badge tone="danger">Agotado</Badge> : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-chrome-muted">{formatPrice(product.price, product.currency)}</span>
              <form action={deleteProductAction.bind(null, businessId, product.id)}>
                <Button size="sm" variant="ghost" type="submit">
                  Eliminar
                </Button>
              </form>
            </div>
          </div>
        ))}
        {section.products.length === 0 ? (
          <p className="py-2 text-sm text-chrome-muted">Sin productos todavia.</p>
        ) : null}
      </div>

      <Link href={`/business/${businessId}/menu/products/new?section=${section.id}`}>
        <Button size="sm" variant="secondary">
          + Producto
        </Button>
      </Link>
    </Card>
  );
}

export default async function MenuPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const menu = await hydrateMenu(supabase, businessId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-chrome-text">Carta</h1>
      </div>

      <Card>
        <form action={createSectionAction.bind(null, businessId)} className="flex gap-2">
          <Input name="name" placeholder="Nombre de la nueva categoria" required className="flex-1" />
          <Button type="submit">Anadir categoria</Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {menu?.sections.map((section) => (
          <SectionBlock key={section.id} section={section} businessId={businessId} />
        ))}
      </div>

      {!menu || menu.sections.length === 0 ? (
        <p className="text-sm text-chrome-muted">Crea tu primera categoria para empezar.</p>
      ) : null}
    </div>
  );
}
