import type { BusinessTheme } from "@/lib/types";
import { themeToCssVars } from "@/lib/theme/tokens";
import { googleFontsHref } from "@/lib/theme/fonts";

/**
 * Applies a business's visual identity to everything rendered inside it via
 * CSS custom properties (see globals.css / tailwind.config.ts `tenant.*`).
 * The same components render every tenant; only these variables differ.
 */
export function ThemeProvider({
  theme,
  children,
}: {
  theme: BusinessTheme;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Next.js hoists <link> rendered by Server Components into <head>. */}
      <link rel="stylesheet" href={googleFontsHref(theme.font_heading, theme.font_body)} />
      <div
        style={themeToCssVars(theme)}
        className="min-h-screen bg-tenant-bg font-tenant-body text-tenant-text"
      >
        {children}
      </div>
    </>
  );
}
