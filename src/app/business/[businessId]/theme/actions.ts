"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { themeUpdateSchema } from "@/lib/schemas";
import { setBusinessTheme } from "@/lib/services/business-service";

export async function saveThemeAction(businessId: string, formData: FormData) {
  await requireBusinessRole(businessId, ["owner", "manager"]);
  const supabase = await createClient();

  const galleryRaw = (formData.get("gallery_urls") as string) ?? "";
  const parsed = themeUpdateSchema.safeParse({
    color_primary: formData.get("color_primary"),
    color_secondary: formData.get("color_secondary"),
    color_bg: formData.get("color_bg"),
    color_surface: formData.get("color_surface"),
    color_text: formData.get("color_text"),
    color_accent: formData.get("color_accent"),
    font_heading: formData.get("font_heading"),
    font_body: formData.get("font_body"),
    button_style: formData.get("button_style"),
    radius: formData.get("radius"),
    density: formData.get("density"),
    card_style: formData.get("card_style"),
    nav_style: formData.get("nav_style"),
    hero_style: formData.get("hero_style"),
    logo_url: (formData.get("logo_url") as string) || null,
    hero_image_url: (formData.get("hero_image_url") as string) || null,
    gallery_urls: galleryRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));

  await setBusinessTheme(supabase, businessId, parsed.data);
  revalidatePath(`/business/${businessId}/theme`);
  revalidatePath(`/r/${businessId}`);
}
