// A curated, safe set of open-source Google Fonts. Claude (via MCP) picks
// from this list rather than supplying arbitrary font names/URLs, which
// keeps the public experience fast (one stylesheet request) and avoids
// loading untrusted font sources.
export const HEADING_FONTS = [
  "Fraunces",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Poppins",
  "Space Grotesk",
] as const;

export const BODY_FONTS = [
  "Inter",
  "Karla",
  "Source Sans 3",
  "Work Sans",
  "Nunito Sans",
  "IBM Plex Sans",
] as const;

export type HeadingFont = (typeof HEADING_FONTS)[number];
export type BodyFont = (typeof BODY_FONTS)[number];

const FALLBACK_HEADING = "Fraunces";
const FALLBACK_BODY = "Inter";

export function googleFontsHref(headingFont: string, bodyFont: string): string {
  const heading = (HEADING_FONTS as readonly string[]).includes(headingFont)
    ? headingFont
    : FALLBACK_HEADING;
  const body = (BODY_FONTS as readonly string[]).includes(bodyFont) ? bodyFont : FALLBACK_BODY;

  const families = new Set([heading, body]);
  const params = [...families]
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
