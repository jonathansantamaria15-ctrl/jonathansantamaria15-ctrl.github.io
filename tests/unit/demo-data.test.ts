import { describe, it, expect } from "vitest";
import { buildDemoData } from "../../scripts/demo-data";

describe("demo data", () => {
  const demo = buildDemoData();

  it("has a valid business + slug", () => {
    expect(demo.business.name).toContain("Cantabria");
    expect(demo.business.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("covers the full spectrum from a simple item to a complex dish", () => {
    const all = demo.sections.flatMap((s) => s.products);
    const simple = all.find((p) => p.name.toLowerCase().includes("cafe solo"));
    const complex = all.find((p) => (p.ingredients?.length ?? 0) > 0 && (p.allergens?.length ?? 0) > 0);
    expect(simple).toBeDefined();
    expect(simple?.price).toBeLessThan(2);
    expect(complex).toBeDefined();
  });

  it("declares allergens/diet flags only where explicitly set (never blanket-guessed)", () => {
    const all = demo.sections.flatMap((s) => s.products);
    const withoutAllergenInfo = all.filter((p) => p.allergens === undefined || p.allergens === null);
    const withAllergenInfo = all.filter((p) => (p.allergens?.length ?? 0) > 0);
    expect(withoutAllergenInfo.length).toBeGreaterThan(0);
    expect(withAllergenInfo.length).toBeGreaterThan(0);
  });

  it("includes at least one unavailable (agotado) product", () => {
    const all = demo.sections.flatMap((s) => s.products);
    expect(all.some((p) => p.is_available === false)).toBe(true);
  });

  it("includes featured/recommended/new/popular products", () => {
    const all = demo.sections.flatMap((s) => s.products);
    expect(all.some((p) => p.is_featured)).toBe(true);
    expect(all.some((p) => p.is_recommended)).toBe(true);
    expect(all.some((p) => p.is_new)).toBe(true);
    expect(all.some((p) => p.is_popular)).toBe(true);
  });

  it("includes at least one product with variants and one with extras", () => {
    const all = demo.sections.flatMap((s) => s.products);
    expect(all.some((p) => (p.variants?.length ?? 0) > 0)).toBe(true);
    expect(all.some((p) => (p.extras?.length ?? 0) > 0)).toBe(true);
  });

  it("includes one draft section not meant to be publicly visible yet", () => {
    expect(demo.sections.some((s) => s.status === "draft")).toBe(true);
    expect(demo.sections.filter((s) => s.status === "published").length).toBeGreaterThan(0);
  });

  it("enough tables and zones to generate a real QR bulk run", () => {
    const totalTables = demo.tableCounts.reduce((sum, t) => sum + t.count, 0);
    expect(totalTables).toBeGreaterThanOrEqual(10);
    expect(demo.zones.length).toBeGreaterThanOrEqual(2);
  });
});
