import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Menu,
  MenuSection,
  MenuWithContent,
  Product,
  ProductExtra,
  ProductVariant,
  ProductWithOptions,
  SectionWithProducts,
} from "@/lib/types";
import type { ProductUpsertInput, SectionUpsertInput } from "@/lib/schemas";
import { ServiceError } from "./business-service";

export async function getDefaultMenu(client: SupabaseClient, businessId: string): Promise<Menu | null> {
  const { data } = await client
    .from("menus")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_default", true)
    .maybeSingle();
  return (data as Menu | null) ?? null;
}

export async function updateMenu(client: SupabaseClient, id: string, patch: Partial<Menu>): Promise<Menu> {
  const { data, error } = await client.from("menus").update(patch).eq("id", id).select("*").single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to update menu");
  return data as Menu;
}

export async function upsertSection(
  client: SupabaseClient,
  businessId: string,
  input: SectionUpsertInput
): Promise<MenuSection> {
  const payload = { ...input, business_id: businessId };
  const query = input.id
    ? client.from("menu_sections").update(payload).eq("id", input.id).eq("business_id", businessId)
    : client.from("menu_sections").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error || !data) throw new ServiceError(error?.message ?? "Failed to save section");
  return data as MenuSection;
}

export async function deleteSection(client: SupabaseClient, businessId: string, id: string) {
  const { error } = await client.from("menu_sections").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw new ServiceError(error.message);
}

export async function reorderSections(
  client: SupabaseClient,
  businessId: string,
  orderedIds: string[]
) {
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from("menu_sections").update({ position: index }).eq("id", id).eq("business_id", businessId)
    )
  );
}

export async function upsertProduct(
  client: SupabaseClient,
  businessId: string,
  input: ProductUpsertInput
): Promise<Product> {
  const { variants, extras, id, ...rest } = input;
  const payload = { ...rest, business_id: businessId };

  const query = id
    ? client.from("products").update(payload).eq("id", id).eq("business_id", businessId)
    : client.from("products").insert(payload);

  const { data: product, error } = await query.select("*").single();
  if (error || !product) throw new ServiceError(error?.message ?? "Failed to save product");

  if (variants) {
    await client.from("product_variants").delete().eq("product_id", product.id);
    if (variants.length > 0) {
      await client
        .from("product_variants")
        .insert(variants.map((v) => ({ ...v, product_id: product.id, business_id: businessId })));
    }
  }
  if (extras) {
    await client.from("product_extras").delete().eq("product_id", product.id);
    if (extras.length > 0) {
      await client
        .from("product_extras")
        .insert(extras.map((e) => ({ ...e, product_id: product.id, business_id: businessId })));
    }
  }

  return product as Product;
}

export async function upsertProductsBulk(
  client: SupabaseClient,
  businessId: string,
  inputs: ProductUpsertInput[]
): Promise<Product[]> {
  const results: Product[] = [];
  for (const input of inputs) {
    results.push(await upsertProduct(client, businessId, input));
  }
  return results;
}

export async function deleteProduct(client: SupabaseClient, businessId: string, id: string) {
  const { error } = await client.from("products").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw new ServiceError(error.message);
}

/** Employees use this (via the set_product_availability RPC) — the only
 * write path RLS grants that role directly on product data. */
export async function setProductAvailability(
  client: SupabaseClient,
  productId: string,
  isAvailable: boolean
) {
  const { error } = await client.rpc("set_product_availability", {
    p_product_id: productId,
    p_is_available: isAvailable,
  });
  if (error) throw new ServiceError(error.message);
}

export async function getProductWithOptions(
  client: SupabaseClient,
  businessId: string,
  productId: string
): Promise<ProductWithOptions | null> {
  const { data } = await client
    .from("products")
    .select("*, product_variants(*), product_extras(*)")
    .eq("id", productId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!data) return null;
  const { product_variants, product_extras, ...product } = data as Product & {
    product_variants: ProductVariant[];
    product_extras: ProductExtra[];
  };
  return {
    ...(product as Product),
    variants: (product_variants ?? []).sort((a, b) => a.position - b.position),
    extras: (product_extras ?? []).sort((a, b) => a.position - b.position),
  };
}

export async function reorderProducts(
  client: SupabaseClient,
  businessId: string,
  orderedIds: string[]
) {
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from("products").update({ position: index }).eq("id", id).eq("business_id", businessId)
    )
  );
}

/**
 * Loads a menu with its full section tree + products + variants/extras for
 * a business. `publicOnly` restricts to published rows only (used by the
 * PUBLIC /r/[slug] page and the chatbot — never trust the frontend alone,
 * but this mirrors what RLS would allow an anonymous visitor to see anyway).
 */
export async function hydrateMenu(
  client: SupabaseClient,
  businessId: string,
  opts: { publicOnly?: boolean } = {}
): Promise<MenuWithContent | null> {
  let menuQuery = client.from("menus").select("*").eq("business_id", businessId).eq("is_default", true);
  if (opts.publicOnly) menuQuery = menuQuery.eq("status", "published");
  const { data: menu } = await menuQuery.maybeSingle();
  if (!menu) return null;

  let sectionsQuery = client
    .from("menu_sections")
    .select("*")
    .eq("menu_id", menu.id)
    .order("position", { ascending: true });
  if (opts.publicOnly) sectionsQuery = sectionsQuery.eq("status", "published");
  const { data: sectionRows } = await sectionsQuery;
  const sections = (sectionRows as MenuSection[]) ?? [];

  let productsQuery = client
    .from("products")
    .select("*, product_variants(*), product_extras(*)")
    .eq("business_id", businessId)
    .order("position", { ascending: true });
  if (opts.publicOnly) productsQuery = productsQuery.eq("status", "published");
  const { data: productRows } = await productsQuery;

  const productsBySection = new Map<string, ProductWithOptions[]>();
  for (const row of (productRows as (Product & {
    product_variants: ProductVariant[];
    product_extras: ProductExtra[];
  })[]) ?? []) {
    const { product_variants, product_extras, ...product } = row;
    const hydrated: ProductWithOptions = {
      ...(product as Product),
      variants: (product_variants ?? []).sort((a, b) => a.position - b.position),
      extras: (product_extras ?? []).sort((a, b) => a.position - b.position),
    };
    const list = productsBySection.get(product.section_id) ?? [];
    list.push(hydrated);
    productsBySection.set(product.section_id, list);
  }

  const byId = new Map<string, SectionWithProducts>();
  for (const section of sections) {
    byId.set(section.id, { ...section, products: productsBySection.get(section.id) ?? [], children: [] });
  }
  const roots: SectionWithProducts[] = [];
  for (const section of sections) {
    const node = byId.get(section.id)!;
    if (section.parent_id && byId.has(section.parent_id)) {
      byId.get(section.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return { ...(menu as Menu), sections: roots };
}
