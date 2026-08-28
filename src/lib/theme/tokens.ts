import type { CSSProperties } from "react";
import type { BusinessTheme } from "@/lib/types";

const RADIUS_MAP: Record<BusinessTheme["radius"], string> = {
  none: "0px",
  sm: "0.25rem",
  md: "0.75rem",
  lg: "1.25rem",
  full: "9999px",
};

export const DEFAULT_THEME: BusinessTheme = {
  business_id: "",
  color_primary: "#1f2937",
  color_secondary: "#6b7280",
  color_bg: "#ffffff",
  color_surface: "#f8f8f7",
  color_text: "#111827",
  color_accent: "#b45309",
  font_heading: "Fraunces",
  font_body: "Inter",
  button_style: "solid",
  radius: "md",
  density: "comfortable",
  card_style: "elevated",
  nav_style: "tabs",
  hero_style: "full-bleed",
  logo_url: null,
  hero_image_url: null,
  gallery_urls: [],
  updated_at: "",
};

/** Maps a business theme to CSS custom properties consumed by globals.css / Tailwind. */
export function themeToCssVars(theme: BusinessTheme): CSSProperties {
  return {
    "--tenant-primary": theme.color_primary,
    "--tenant-secondary": theme.color_secondary,
    "--tenant-bg": theme.color_bg,
    "--tenant-surface": theme.color_surface,
    "--tenant-text": theme.color_text,
    "--tenant-accent": theme.color_accent,
    "--tenant-font-heading": `"${theme.font_heading}", serif`,
    "--tenant-font-body": `"${theme.font_body}", sans-serif`,
    "--tenant-radius": RADIUS_MAP[theme.radius],
  } as CSSProperties;
}

export const DENSITY_GAP: Record<BusinessTheme["density"], string> = {
  compact: "gap-2",
  comfortable: "gap-4",
  spacious: "gap-6",
};

export const DENSITY_PADDING: Record<BusinessTheme["density"], string> = {
  compact: "p-3",
  comfortable: "p-4",
  spacious: "p-6",
};
