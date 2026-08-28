// Zod validation shared by BUSINESS dashboard server actions and the MCP
// server tools, so both entry points enforce identical product rules.
import { z } from "zod";
import { ALLERGEN_CODES } from "@/lib/menu/allergens";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/theme/fonts";

export const businessCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(80)
    .optional(),
  vertical: z.string().trim().min(2).max(40).default("restaurant"),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  ownerEmail: z.string().trim().email().optional(),
});
export type BusinessCreateInput = z.input<typeof businessCreateSchema>;

export const businessUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  tagline: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  timezone: z.string().trim().max(60).optional(),
  opening_hours: z.record(z.string(), z.unknown()).optional(),
});
export type BusinessUpdateInput = z.input<typeof businessUpdateSchema>;

export const themeUpdateSchema = z.object({
  color_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  color_secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  color_bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  color_surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  color_text: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  color_accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font_heading: z.enum(HEADING_FONTS).optional(),
  font_body: z.enum(BODY_FONTS).optional(),
  button_style: z.enum(["solid", "outline", "ghost", "pill"]).optional(),
  radius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
  density: z.enum(["compact", "comfortable", "spacious"]).optional(),
  card_style: z.enum(["elevated", "flat", "outlined", "image-forward"]).optional(),
  nav_style: z.enum(["tabs", "chips", "sidebar"]).optional(),
  hero_style: z.enum(["full-bleed", "split", "minimal", "logo-centric"]).optional(),
  logo_url: z.string().url().nullable().optional(),
  hero_image_url: z.string().url().nullable().optional(),
  gallery_urls: z.array(z.string().url()).max(20).optional(),
});
export type ThemeUpdateInput = z.input<typeof themeUpdateSchema>;

export const menuCreateSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Carta principal"),
  description: z.string().trim().max(500).optional(),
  language: z.string().trim().max(10).default("es"),
});

export const sectionUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  menu_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  position: z.number().int().min(0).optional(),
  status: z.enum(["draft", "published", "hidden"]).optional(),
});
export type SectionUpsertInput = z.input<typeof sectionUpsertSchema>;

const variantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price_delta: z.number().default(0),
  is_default: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
});

const extraSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().min(0).default(0),
  position: z.number().int().min(0).default(0),
});

export const productUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  section_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).nullable().optional(),
  currency: z.string().trim().length(3).default("EUR"),
  status: z.enum(["draft", "published", "hidden"]).optional(),
  is_available: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_recommended: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_popular: z.boolean().optional(),
  // Declared-only. Omit/null = unknown; never inferred by the caller (MCP tool
  // descriptions instruct Claude accordingly — see MCP.md).
  ingredients: z.array(z.string().trim().min(1).max(60)).max(50).nullable().optional(),
  allergens: z.array(z.enum(ALLERGEN_CODES)).max(20).nullable().optional(),
  is_vegetarian: z.boolean().nullable().optional(),
  is_vegan: z.boolean().nullable().optional(),
  is_gluten_free: z.boolean().nullable().optional(),
  spice_level: z.number().int().min(0).max(3).nullable().optional(),
  weight_grams: z.number().min(0).nullable().optional(),
  serving_size: z.string().trim().max(60).nullable().optional(),
  calories: z.number().min(0).nullable().optional(),
  pairing_notes: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
  position: z.number().int().min(0).optional(),
  image_url: z.string().url().nullable().optional(),
  gallery_urls: z.array(z.string().url()).max(20).optional(),
  model_3d_url: z.string().url().nullable().optional(),
  ar_enabled: z.boolean().optional(),
  variants: z.array(variantSchema).max(20).optional(),
  extras: z.array(extraSchema).max(30).optional(),
});
export type ProductUpsertInput = z.input<typeof productUpsertSchema>;

export const zoneCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["interior", "terraza", "barra", "privado", "otro"]).default("interior"),
  position: z.number().int().min(0).optional(),
});

export const tableCreateSchema = z.object({
  label: z.string().trim().min(1).max(40),
  zone_id: z.string().uuid().nullable().optional(),
  capacity: z.number().int().min(1).max(60).nullable().optional(),
});

export const tablesBulkCreateSchema = z.object({
  zone_id: z.string().uuid().nullable().optional(),
  count: z.number().int().min(1).max(200),
  label_prefix: z.string().trim().min(1).max(30).default("Mesa"),
  start_at: z.number().int().min(1).default(1),
  capacity: z.number().int().min(1).max(60).nullable().optional(),
});

export const qrTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80).default("Plantilla principal"),
  fg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#111827"),
  bg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#b45309"),
  logo_url: z.string().url().nullable().optional(),
  frame_style: z.enum(["none", "rounded", "square", "scan-me"]).default("rounded"),
  corner_style: z.enum(["square", "rounded", "dot"]).default("square"),
  label_position: z.enum(["top", "bottom", "none"]).default("bottom"),
  cta_text: z.string().trim().max(60).default("Escanea para ver la carta"),
  font: z.enum(BODY_FONTS).default("Inter"),
  is_default: z.boolean().default(true),
});

export const qrCreateSchema = z.object({
  type: z.enum(["general", "table", "zone", "custom"]),
  label: z.string().trim().min(1).max(60),
  assigned_table_id: z.string().uuid().nullable().optional(),
  assigned_zone_id: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
});

export const qrBulkForTablesSchema = z.object({
  table_ids: z.array(z.string().uuid()).min(1).max(500),
  template_id: z.string().uuid().nullable().optional(),
});

export const serviceUpsertSchema = z.object({
  type: z.enum([
    "maps",
    "phone",
    "whatsapp",
    "email",
    "website",
    "instagram",
    "facebook",
    "tiktok",
    "reservations",
    "reviews",
    "delivery",
    "wifi",
  ]),
  label: z.string().trim().max(60).nullable().optional(),
  value: z.string().trim().min(1).max(300),
  is_active: z.boolean().default(true),
  position: z.number().int().min(0).optional(),
});

export const invitationCreateSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["manager", "employee"]),
});
