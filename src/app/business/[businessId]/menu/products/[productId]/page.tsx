import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { hydrateMenu, getProductWithOptions } from "@/lib/services/menu-service";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ businessId: string; productId: string }>;
}) {
  const { businessId, productId } = await params;
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const [menu, product] = await Promise.all([
    hydrateMenu(supabase, businessId),
    getProductWithOptions(supabase, businessId, productId),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-semibold text-chrome-text">Editar producto</h1>
      <ProductForm businessId={businessId} sections={menu?.sections ?? []} product={product} />
    </div>
  );
}
