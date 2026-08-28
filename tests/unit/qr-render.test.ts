import { describe, it, expect } from "vitest";
import { contrastRatio, isScannableContrast, renderQrSvg } from "@/lib/qr/render";

describe("QR contrast validation", () => {
  it("black on white has maximum contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(isScannableContrast("#000000", "#ffffff")).toBe(true);
  });

  it("rejects near-identical colors", () => {
    expect(isScannableContrast("#808080", "#828282")).toBe(false);
  });
});

describe("renderQrSvg", () => {
  const template = {
    fg_color: "#111827",
    bg_color: "#ffffff",
    accent_color: "#b45309",
    logo_url: null,
    frame_style: "rounded" as const,
    corner_style: "square" as const,
    label_position: "bottom" as const,
    cta_text: "Escanea",
    font: "Inter",
  };

  it("produces a valid, non-empty SVG containing the label", () => {
    const svg = renderQrSvg({ url: "https://example.com/q/abc123", template, label: "Mesa 7" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("Mesa 7");
    expect(svg).toContain("</svg>");
  });

  it("falls back to safe black/white when the template contrast is unscannable", () => {
    const badTemplate = { ...template, fg_color: "#eeeeee", bg_color: "#ffffff" };
    const svg = renderQrSvg({ url: "https://example.com/q/abc123", template: badTemplate, label: "Mesa 7" });
    expect(svg).toContain('fill="#000000"');
  });

  it("includes a quiet zone (margin) around the module grid", () => {
    const svg = renderQrSvg({ url: "https://example.com/q/x", template, label: "X" });
    // First module rect should be offset by frame padding + 4-module quiet zone, never at 0,0.
    const match = svg.match(/<rect x="(\d+)" y="(\d+)" width="8"/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(30);
  });
});
