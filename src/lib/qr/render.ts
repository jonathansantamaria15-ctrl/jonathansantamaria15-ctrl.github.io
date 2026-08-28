import QRCode from "qrcode";
import type { QrTemplate } from "@/lib/types";

const MODULE_PX = 8;
const QUIET_ZONE_MODULES = 4; // required by the QR spec for reliable scanning
const MAX_LOGO_RATIO = 0.22; // keeps logo overlay within error-correction budget (level H)

export class QrRenderError extends Error {}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new QrRenderError(`Invalid color: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG-style contrast ratio between two hex colors, in [1, 21]. */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Minimum ratio for the QR pattern to reliably scan on a phone camera. */
export const MIN_QR_CONTRAST = 2.5;

export function isScannableContrast(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= MIN_QR_CONTRAST;
}

export interface RenderQrOptions {
  url: string;
  template: Pick<
    QrTemplate,
    "fg_color" | "bg_color" | "accent_color" | "logo_url" | "frame_style" | "corner_style" | "label_position" | "cta_text" | "font"
  >;
  label: string;
}

/**
 * Renders a fully self-contained SVG: quiet-zone-correct QR matrix +
 * optional logo, frame and label, driven entirely by the business's QR
 * template. Falls back to guaranteed-scannable colors if the template's
 * colors don't meet MIN_QR_CONTRAST, rather than shipping an unreadable code.
 */
export function renderQrSvg({ url, template, label }: RenderQrOptions): string {
  const fg = isScannableContrast(template.fg_color, template.bg_color) ? template.fg_color : "#000000";
  const bg = isScannableContrast(template.fg_color, template.bg_color) ? template.bg_color : "#ffffff";

  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const codePx = (size + QUIET_ZONE_MODULES * 2) * MODULE_PX;

  const framePad = template.frame_style === "none" ? 0 : 28;
  const labelH = template.label_position === "none" ? 0 : 40;
  const ctaH = template.frame_style === "scan-me" ? 36 : 0;

  const totalW = codePx + framePad * 2;
  const topLabelH = template.label_position === "top" ? labelH : 0;
  const bottomLabelH = template.label_position === "bottom" ? labelH : 0;
  const totalH = codePx + framePad * 2 + topLabelH + bottomLabelH + ctaH;

  const codeOffsetX = framePad;
  const codeOffsetY = framePad + topLabelH;
  const rx = template.corner_style === "rounded" ? 12 : template.corner_style === "dot" ? MODULE_PX / 2 : 0;

  let modulesPath = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) {
        const x = codeOffsetX + (col + QUIET_ZONE_MODULES) * MODULE_PX;
        const y = codeOffsetY + (row + QUIET_ZONE_MODULES) * MODULE_PX;
        modulesPath += `<rect x="${x}" y="${y}" width="${MODULE_PX}" height="${MODULE_PX}" rx="${rx}" />`;
      }
    }
  }

  let logoMarkup = "";
  if (template.logo_url) {
    const logoSize = Math.min(codePx * MAX_LOGO_RATIO, codePx * MAX_LOGO_RATIO);
    const logoX = codeOffsetX + codePx / 2 - logoSize / 2;
    const logoY = codeOffsetY + codePx / 2 - logoSize / 2;
    const pad = logoSize * 0.14;
    logoMarkup = `
      <rect x="${logoX - pad}" y="${logoY - pad}" width="${logoSize + pad * 2}" height="${logoSize + pad * 2}" rx="${logoSize * 0.2}" fill="${bg}" />
      <image href="${template.logo_url}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid slice" />
    `;
  }

  const frameMarkup =
    template.frame_style === "none"
      ? ""
      : `<rect x="0.5" y="${topLabelH + 0.5}" width="${totalW - 1}" height="${codePx + framePad * 2 - 1}" rx="16" fill="none" stroke="${template.accent_color}" stroke-width="2" />`;

  const topLabelMarkup =
    template.label_position === "top"
      ? `<text x="${totalW / 2}" y="${labelH * 0.65}" text-anchor="middle" font-family="${template.font ?? "Inter"}, sans-serif" font-size="20" font-weight="700" fill="${template.accent_color}">${escapeXml(label)}</text>`
      : "";
  const bottomLabelY = topLabelH + framePad * 2 + codePx + labelH * 0.65;
  const bottomLabelMarkup =
    template.label_position === "bottom"
      ? `<text x="${totalW / 2}" y="${bottomLabelY}" text-anchor="middle" font-family="${template.font ?? "Inter"}, sans-serif" font-size="20" font-weight="700" fill="${template.accent_color}">${escapeXml(label)}</text>`
      : "";

  const ctaMarkup =
    template.frame_style === "scan-me"
      ? `<rect x="0" y="${totalH - ctaH}" width="${totalW}" height="${ctaH}" rx="18" fill="${template.accent_color}" />
         <text x="${totalW / 2}" y="${totalH - ctaH / 2 + 5}" text-anchor="middle" font-family="${template.font ?? "Inter"}, sans-serif" font-size="14" font-weight="600" fill="#ffffff">${escapeXml(template.cta_text)}</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="${bg}" />
  ${frameMarkup}
  ${topLabelMarkup}
  <g fill="${fg}">${modulesPath}</g>
  ${logoMarkup}
  ${bottomLabelMarkup}
  ${ctaMarkup}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

/** Plain (uncustomized) PNG buffer -- colors only, no logo compositing. */
export async function renderQrPng(url: string, fgColor: string, bgColor: string): Promise<Buffer> {
  const fg = isScannableContrast(fgColor, bgColor) ? fgColor : "#000000";
  const bg = isScannableContrast(fgColor, bgColor) ? bgColor : "#ffffff";
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: QUIET_ZONE_MODULES,
    scale: MODULE_PX,
    color: { dark: fg, light: bg },
  });
}
