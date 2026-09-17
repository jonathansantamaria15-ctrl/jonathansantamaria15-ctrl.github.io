import { describe, it, expect } from "vitest";
import { answerQuery } from "@/lib/chatbot/engine";
import type { MenuWithContent, ProductWithOptions } from "@/lib/types";

function product(overrides: Partial<ProductWithOptions>): ProductWithOptions {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    business_id: "biz-1",
    section_id: overrides.section_id ?? "sec-1",
    name: "Producto",
    description: null,
    price: 10,
    compare_at_price: null,
    currency: "EUR",
    status: "published",
    is_available: true,
    is_featured: false,
    is_recommended: false,
    is_new: false,
    is_popular: false,
    ingredients: null,
    allergens: null,
    is_vegetarian: null,
    is_vegan: null,
    is_gluten_free: null,
    spice_level: null,
    weight_grams: null,
    serving_size: null,
    calories: null,
    pairing_notes: null,
    notes: null,
    position: 0,
    image_url: null,
    gallery_urls: [],
    model_3d_url: null,
    ar_enabled: false,
    availability_hours: {},
    metadata: {},
    created_at: "",
    updated_at: "",
    variants: [],
    extras: [],
    ...overrides,
  };
}

const menu: MenuWithContent = {
  id: "menu-1",
  business_id: "biz-1",
  name: "Carta",
  description: null,
  language: "es",
  status: "published",
  is_default: true,
  availability: {},
  created_at: "",
  updated_at: "",
  sections: [
    {
      id: "sec-entrantes",
      business_id: "biz-1",
      menu_id: "menu-1",
      parent_id: null,
      name: "Entrantes",
      description: null,
      image_url: null,
      position: 0,
      status: "published",
      availability: {},
      created_at: "",
      updated_at: "",
      children: [],
      products: [
        product({
          id: "p-croquetas",
          section_id: "sec-entrantes",
          name: "Croquetas de jamon",
          price: 9.5,
          ingredients: ["jamon", "bechamel"],
          allergens: ["gluten", "lacteos", "huevos"],
        }),
        product({
          id: "p-hummus",
          section_id: "sec-entrantes",
          name: "Hummus de la casa",
          price: 7,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          allergens: ["sesamo"],
        }),
      ],
    },
    {
      id: "sec-carnes",
      business_id: "biz-1",
      menu_id: "menu-1",
      parent_id: null,
      name: "Carnes",
      description: null,
      image_url: null,
      position: 1,
      status: "published",
      availability: {},
      created_at: "",
      updated_at: "",
      children: [],
      products: [
        product({
          id: "p-solomillo",
          section_id: "sec-carnes",
          name: "Solomillo a la brasa",
          price: 22.5,
          is_recommended: true,
          spice_level: 0,
          allergens: [],
        }),
        product({
          id: "p-costillar",
          section_id: "sec-carnes",
          name: "Costillar picante",
          price: 17.5,
          spice_level: 3,
        }),
      ],
    },
    {
      id: "sec-postres",
      business_id: "biz-1",
      menu_id: "menu-1",
      parent_id: null,
      name: "Postres",
      description: null,
      image_url: null,
      position: 2,
      status: "published",
      availability: {},
      created_at: "",
      updated_at: "",
      children: [],
      products: [
        product({
          id: "p-tarta",
          section_id: "sec-postres",
          name: "Tarta de queso",
          price: 6,
          allergens: ["lacteos", "huevos", "gluten"],
        }),
      ],
    },
  ],
};

describe("chatbot engine (closed, no external knowledge)", () => {
  it("filters by dietary flag: vegetariano", () => {
    const res = answerQuery(menu, "Que tenéis vegetariano?");
    expect(res.products.map((p) => p.id)).toEqual(["p-hummus"]);
  });

  it("filters by max price", () => {
    const res = answerQuery(menu, "Algo por menos de 10 euros");
    const ids = res.products.map((p) => p.id);
    expect(ids).toContain("p-hummus");
    expect(ids).toContain("p-croquetas");
    expect(ids).not.toContain("p-solomillo");
  });

  it("filters carnes que no sean picantes (category + spice combined)", () => {
    const res = answerQuery(menu, "Quiero carnes que no sean picantes");
    const ids = res.products.map((p) => p.id);
    expect(ids).toContain("p-solomillo");
    expect(ids).not.toContain("p-costillar");
  });

  it("answers ingredient questions for a specific product when declared", () => {
    const res = answerQuery(menu, "Que lleva las croquetas de jamon?");
    expect(res.text).toContain("jamon");
    expect(res.text).toContain("bechamel");
  });

  it("gives the safe fallback when asked about undeclared info, never invents it", () => {
    const res = answerQuery(menu, "La tarta de queso lleva frutos secos?");
    // "frutos secos" isn't a recognized allergen trigger here, so it falls
    // through to the ingredient/allergen question path or generic search;
    // either way it must not assert a fact that wasn't declared.
    expect(res.text.toLowerCase()).not.toMatch(/\bsi\b.*frutos secos|contiene frutos secos/);
  });

  it("answers a direct ingredients question with the safe fallback when nothing is declared", () => {
    const res = answerQuery(menu, "Que lleva el solomillo a la brasa?");
    expect(res.text).toMatch(/no contiene informacion confirmada/i);
    expect(res.text).toMatch(/consulta con el personal/i);
  });

  it("answers price questions", () => {
    const res = answerQuery(menu, "Cuanto cuesta el solomillo a la brasa?");
    expect(res.text).toContain("22,50");
  });

  it("surfaces recommendations", () => {
    const res = answerQuery(menu, "Que recomendais?");
    expect(res.products.map((p) => p.id)).toContain("p-solomillo");
  });

  it("filters allergen-free (sin gluten via allergen exclusion) only among declared products", () => {
    const res = answerQuery(menu, "Tenéis algo sin lacteos?");
    const ids = res.products.map((p) => p.id);
    expect(ids).not.toContain("p-croquetas");
    expect(ids).not.toContain("p-tarta");
  });

  it("matches a category by section name", () => {
    const res = answerQuery(menu, "Que hay de postres?");
    expect(res.products.map((p) => p.id)).toEqual(["p-tarta"]);
  });

  it("returns the generic fallback for nonsense/unrelated queries", () => {
    const res = answerQuery(menu, "cual es la capital de Francia?");
    expect(res.products).toHaveLength(0);
    expect(res.text).toMatch(/no he encontrado/i);
  });

  it("never returns a product for a name that doesn't exist", () => {
    const res = answerQuery(menu, "Cuanto cuesta la paella valenciana?");
    expect(res.products).toHaveLength(0);
    expect(res.text).toMatch(/no he encontrado ningun plato/i);
  });

  it("handles an empty menu without crashing", () => {
    const res = answerQuery(null, "hola");
    expect(res.products).toHaveLength(0);
  });
});
