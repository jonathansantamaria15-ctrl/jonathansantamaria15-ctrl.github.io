import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { hydrateMenu } from "@/lib/services/menu-service";
import { formatPrice } from "@/lib/menu/format";
import clsx from "clsx";
import { toggleAvailabilityAction } from "./actions";
import type { SectionWithProducts } from "@/lib/types";

function flattenSections(sections: SectionWithProducts[]): SectionWithProducts[] {
  return sections.flatMap((s) => [s, ...flattenSections(s.children)]);
}

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  await requireBusinessRole(businessId, ["owner", "manager", "employee"]);
  const supabase = await createClient();
  const menu = await hydrateMenu(supabase, businessId);
  const sections = menu ? flattenSections(menu.sections) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-chrome-text">Disponibilidad</h1>
        <p className="text-sm text-chrome-muted">Toca un producto para marcarlo disponible o agotado.</p>
      </div>

      {sections.map((section) => (
        <div key={section.id}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-chrome-muted">
            {section.name}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {section.products.map((product) => (
              <form key={product.id} action={toggleAvailabilityAction.bind(null, businessId, product.id, !product.is_available)}>
                <button
                  type="submit"
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
                    product.is_available
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium text-chrome-text">{product.name}</span>
                    <span className="block text-xs text-chrome-muted">
                      {formatPrice(product.price, product.currency)}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      product.is_available ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    )}
                  >
                    {product.is_available ? "Disponible" : "Agotado"}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      ))}

      {sections.length === 0 ? (
        <p className="text-sm text-chrome-muted">Todavia no hay productos en la carta.</p>
      ) : null}
    </div>
  );
}
