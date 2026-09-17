import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { hydrateMenu } from "@/lib/services/menu-service";
import { ProductForm } from "../product-form";

export default async function NewProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { businessId } = await params;
  const { section } = await searchParams;
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const menu = await hydrateMenu(supabase, businessId);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-semibold text-chrome-text">Nuevo producto</h1>
      <ProductForm businessId={businessId} sections={menu?.sections ?? []} defaultSectionId={section} />
    </div>
  );
}
