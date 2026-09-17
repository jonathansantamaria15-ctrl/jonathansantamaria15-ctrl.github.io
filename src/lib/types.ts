// Domain types mirroring supabase/migrations/0001_schema.sql exactly.
// Hand-written (no live Supabase project to `supabase gen types` from in this
// sandbox); keep in sync with the SQL schema when either changes.

export type BusinessStatus = "draft" | "published" | "unpublished";
export type ContentStatus = "draft" | "published" | "hidden";
export type MenuStatus = "draft" | "published" | "archived";
export type MembershipRole = "owner" | "manager" | "employee";
export type InvitationRole = "owner" | "manager" | "employee";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type QrType = "general" | "table" | "zone" | "custom";
export type ZoneKind = "interior" | "terraza" | "barra" | "privado" | "otro";
export type ServiceType =
  | "maps"
  | "phone"
  | "whatsapp"
  | "email"
  | "website"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "reservations"
  | "reviews"
  | "delivery"
  | "wifi";
export type AnalyticsEventType =
  | "qr_scanned"
  | "menu_opened"
  | "section_viewed"
  | "product_viewed"
  | "chat_opened"
  | "chat_query"
  | "service_clicked";

export interface Business {
  id: string;
  slug: string;
  name: string;
  vertical: string;
  status: BusinessStatus;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string;
  opening_hours: Record<string, unknown>;
  plan: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessTheme {
  business_id: string;
  color_primary: string;
  color_secondary: string;
  color_bg: string;
  color_surface: string;
  color_text: string;
  color_accent: string;
  font_heading: string;
  font_body: string;
  button_style: "solid" | "outline" | "ghost" | "pill";
  radius: "none" | "sm" | "md" | "lg" | "full";
  density: "compact" | "comfortable" | "spacious";
  card_style: "elevated" | "flat" | "outlined" | "image-forward";
  nav_style: "tabs" | "chips" | "sidebar";
  hero_style: "full-bleed" | "split" | "minimal" | "logo-centric";
  logo_url: string | null;
  hero_image_url: string | null;
  gallery_urls: string[];
  updated_at: string;
}

export interface Membership {
  id: string;
  business_id: string;
  user_id: string;
  role: MembershipRole;
  invited_by: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  business_id: string;
  email: string;
  role: InvitationRole;
  token: string;
  status: InvitationStatus;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface Menu {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  language: string;
  status: MenuStatus;
  is_default: boolean;
  availability: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MenuSection {
  id: string;
  business_id: string;
  menu_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  position: number;
  status: ContentStatus;
  availability: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  status: ContentStatus;
  is_available: boolean;
  is_featured: boolean;
  is_recommended: boolean;
  is_new: boolean;
  is_popular: boolean;
  ingredients: string[] | null;
  allergens: string[] | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  spice_level: number | null;
  weight_grams: number | null;
  serving_size: string | null;
  calories: number | null;
  pairing_notes: string | null;
  notes: string | null;
  position: number;
  image_url: string | null;
  gallery_urls: string[];
  model_3d_url: string | null;
  ar_enabled: boolean;
  availability_hours: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  business_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  position: number;
}

export interface ProductExtra {
  id: string;
  product_id: string;
  business_id: string;
  name: string;
  price: number;
  position: number;
}

export interface Zone {
  id: string;
  business_id: string;
  name: string;
  kind: ZoneKind;
  position: number;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  business_id: string;
  zone_id: string | null;
  label: string;
  capacity: number | null;
  status: "active" | "inactive";
  created_at: string;
}

export interface QrTemplate {
  id: string;
  business_id: string;
  name: string;
  fg_color: string;
  bg_color: string;
  accent_color: string;
  logo_url: string | null;
  frame_style: "none" | "rounded" | "square" | "scan-me";
  corner_style: "square" | "rounded" | "dot";
  label_position: "top" | "bottom" | "none";
  cta_text: string;
  font: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrCode {
  id: string;
  code: string;
  business_id: string;
  type: QrType;
  label: string;
  assigned_table_id: string | null;
  assigned_zone_id: string | null;
  template_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessService {
  id: string;
  business_id: string;
  type: ServiceType;
  label: string | null;
  value: string;
  is_active: boolean;
  position: number;
}

export interface Media {
  id: string;
  business_id: string;
  url: string;
  storage_path: string | null;
  kind: "logo" | "hero" | "gallery" | "product" | "other";
  alt: string | null;
  width: number | null;
  height: number | null;
  created_by: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: number;
  business_id: string;
  type: AnalyticsEventType;
  qr_id: string | null;
  table_id: string | null;
  zone_id: string | null;
  section_id: string | null;
  product_id: string | null;
  service_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Fully hydrated product with variants/extras, as used by the menu engine. */
export interface ProductWithOptions extends Product {
  variants: ProductVariant[];
  extras: ProductExtra[];
}

export interface SectionWithProducts extends MenuSection {
  products: ProductWithOptions[];
  children: SectionWithProducts[];
}

export interface MenuWithContent extends Menu {
  sections: SectionWithProducts[];
}

/** Everything the public /r/[slug] page needs in one payload. */
export interface PublicBusinessView {
  business: Business;
  theme: BusinessTheme;
  menu: MenuWithContent | null;
  services: BusinessService[];
}
