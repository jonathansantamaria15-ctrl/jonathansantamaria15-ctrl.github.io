"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { getDefaultMenu, upsertSection, deleteSection, upsertProduct, deleteProduct } from "@/lib/services/menu-service";
import { productUpsertSchema, sectionUpsertSchema } from "@/lib/schemas";
import { ALLERGEN_CODES, type AllergenCode } from "@/lib/menu/allergens";

export async function createSectionAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const menu = await getDefaultMenu(supabase, businessId);
  if (!menu) throw new Error("No default menu");

  const parsed = sectionUpsertSchema.safeParse({
    menu_id: menu.id,
    name: formData.get("name"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await upsertSection(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/menu`);
}

export async function updateSectionStatusAction(businessId: string, sectionId: string, status: "draft" | "published" | "hidden") {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_sections")
    .update({ status })
    .eq("id", sectionId)
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(`/business/${businessId}/menu`);
}

export async function renameSectionAction(businessId: string, sectionId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  const menu = await getDefaultMenu(supabase, businessId);
  if (!menu) throw new Error("No default menu");
  const parsed = sectionUpsertSchema.safeParse({
    id: sectionId,
    menu_id: menu.id,
    name: formData.get("name"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  await upsertSection(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/menu`);
}

export async function deleteSectionAction(businessId: string, sectionId: string) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  await deleteSection(supabase, businessId, sectionId);
  revalidatePath(`/business/${businessId}/menu`);
}

function parseLines(text: string | null): { name: string; value: number }[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, priceRaw] = line.split(":").map((s) => s.trim());
      return { name, value: Number(priceRaw?.replace(",", ".")) || 0 };
    })
    .filter((v) => v.name);
}

export async function saveProductAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();

  const id = (formData.get("id") as string) || undefined;
  const ingredientsRaw = (formData.get("ingredients") as string) || "";
  const allergens = ALLERGEN_CODES.filter((code) => formData.get(`allergen_${code}`) === "on") as AllergenCode[];

  const raw = {
    id,
    section_id: formData.get("section_id"),
    name: formData.get("name"),
    description: (formData.get("description") as string) || null,
    price: Number(formData.get("price")),
    compare_at_price: formData.get("compare_at_price") ? Number(formData.get("compare_at_price")) : null,
    status: formData.get("status") ?? "draft",
    is_available: formData.get("is_available") === "on",
    is_featured: formData.get("is_featured") === "on",
    is_recommended: formData.get("is_recommended") === "on",
    is_new: formData.get("is_new") === "on",
    is_popular: formData.get("is_popular") === "on",
    ingredients: ingredientsRaw.trim() ? ingredientsRaw.split(",").map((s) => s.trim()).filter(Boolean) : null,
    allergens: allergens.length > 0 ? allergens : null,
    is_vegetarian: formData.get("is_vegetarian") === "on" ? true : null,
    is_vegan: formData.get("is_vegan") === "on" ? true : null,
    is_gluten_free: formData.get("is_gluten_free") === "on" ? true : null,
    spice_level: formData.get("spice_level") ? Number(formData.get("spice_level")) : null,
    weight_grams: formData.get("weight_grams") ? Number(formData.get("weight_grams")) : null,
    serving_size: (formData.get("serving_size") as string) || null,
    calories: formData.get("calories") ? Number(formData.get("calories")) : null,
    pairing_notes: (formData.get("pairing_notes") as string) || null,
    notes: (formData.get("notes") as string) || null,
    image_url: (formData.get("image_url") as string) || null,
    variants: parseLines(formData.get("variants_text") as string).map((v, i) => ({
      name: v.name,
      price_delta: v.value,
      is_default: i === 0,
      position: i,
    })),
    extras: parseLines(formData.get("extras_text") as string).map((e, i) => ({
      name: e.name,
      price: e.value,
      position: i,
    })),
  };

  const parsed = productUpsertSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await upsertProduct(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/menu`);
  redirect(`/business/${businessId}/menu`);
}

export async function deleteProductAction(businessId: string, productId: string) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();
  await deleteProduct(supabase, businessId, productId);
  revalidatePath(`/business/${businessId}/menu`);
}
