// Closed, rule-based chatbot engine. NO LLM, NO external knowledge: every
// answer is derived exclusively from the products/sections passed in (the
// business's own published menu data). When information was not declared,
// the engine says so explicitly instead of guessing -- see NEVER_INVENT.
import type { MenuWithContent, ProductWithOptions, SectionWithProducts } from "@/lib/types";
import { formatPrice } from "@/lib/menu/format";
import { ALLERGEN_CODES, ALLERGEN_LABELS, type AllergenCode } from "@/lib/menu/allergens";
import { normalize, tokenize, similarity } from "./normalize";

export interface ChatbotAnswer {
  text: string;
  products: ProductWithOptions[];
}

const FALLBACK_NO_MATCH: ChatbotAnswer = {
  text:
    "No he encontrado nada con esa descripcion en la carta publicada. Puedes preguntarme por precio, ingredientes, alergenos, tipo de plato o recomendaciones.",
  products: [],
};

function flattenProducts(sections: SectionWithProducts[]): { product: ProductWithOptions; section: SectionWithProducts }[] {
  return sections.flatMap((s) => [
    ...s.products.map((product) => ({ product, section: s })),
    ...flattenProducts(s.children),
  ]);
}

function listAnswer(matches: ProductWithOptions[], intro: string): ChatbotAnswer {
  if (matches.length === 0) {
    return {
      text: "No hay ningun plato de la carta publicada que cumpla eso ahora mismo.",
      products: [],
    };
  }
  const names = matches.slice(0, 8).map((p) => `${p.name} (${formatPrice(p.price, p.currency)})`);
  return {
    text: `${intro}: ${names.join(", ")}${matches.length > 8 ? "..." : ""}.`,
    products: matches,
  };
}

function findAllergenCode(query: string): AllergenCode | null {
  const q = normalize(query);
  for (const code of ALLERGEN_CODES) {
    if (q.includes(normalize(code)) || q.includes(normalize(ALLERGEN_LABELS[code]))) return code;
  }
  // A few common synonyms not equal to the stored code/label.
  const synonyms: Record<string, AllergenCode> = {
    marisco: "crustaceos",
    mariscos: "crustaceos",
    leche: "lacteos",
    nueces: "frutos_cascara",
    "frutos secos": "frutos_cascara",
    huevo: "huevos",
  };
  for (const [syn, code] of Object.entries(synonyms)) {
    if (q.includes(normalize(syn))) return code;
  }
  return null;
}

function extractMaxPrice(query: string): number | null {
  const m = query.match(/(?:menos de|por debajo de|bajo|hasta|maximo de?)\s*(\d+(?:[.,]\d+)?)/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function extractMinPrice(query: string): number | null {
  const m = query.match(/(?:mas de|desde|a partir de|minimo de?)\s*(\d+(?:[.,]\d+)?)/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function findProductQuestionTarget(query: string): { field: "ingredients" | "allergens" | "price" | "general"; name: string } | null {
  const patterns: { re: RegExp; field: "ingredients" | "allergens" | "price" | "general" }[] = [
    { re: /que lleva(?:\s+el|\s+la|\s+los|\s+las)?\s+(.+)/i, field: "ingredients" },
    { re: /ingredientes de(?:l|\s+la)?\s+(.+)/i, field: "ingredients" },
    { re: /alergenos de(?:l|\s+la)?\s+(.+)/i, field: "allergens" },
    { re: /(?:cuanto cuesta|precio de|cual es el precio de)\s+(?:el|la|los|las)?\s*(.+)/i, field: "price" },
  ];
  for (const { re, field } of patterns) {
    const m = query.match(re);
    if (m) return { field, name: m[1].replace(/[?¿.!]/g, "").trim() };
  }
  return null;
}

function bestProductMatch(
  name: string,
  products: ProductWithOptions[]
): ProductWithOptions | null {
  let best: { product: ProductWithOptions; score: number } | null = null;
  for (const product of products) {
    const score = similarity(name, product.name);
    if (score > 0.45 && (!best || score > best.score)) best = { product, score };
  }
  return best?.product ?? null;
}

export function answerQuery(menu: MenuWithContent | null, query: string): ChatbotAnswer {
  const trimmed = query.trim();
  if (!trimmed) return FALLBACK_NO_MATCH;

  const all = menu ? flattenProducts(menu.sections).map((x) => x.product) : [];
  if (all.length === 0) {
    return { text: "La carta de este establecimiento todavia no esta disponible.", products: [] };
  }

  // --- Specific-product questions (ingredients / allergens / price) -----------
  const target = findProductQuestionTarget(trimmed);
  if (target) {
    const product = bestProductMatch(target.name, all);
    if (!product) {
      return {
        text: `No he encontrado ningun plato llamado "${target.name}" en la carta.`,
        products: [],
      };
    }
    if (target.field === "price") {
      return { text: `${product.name}: ${formatPrice(product.price, product.currency)}.`, products: [product] };
    }
    if (target.field === "ingredients") {
      if (!product.ingredients || product.ingredients.length === 0) {
        return {
          text: `La carta no contiene informacion confirmada sobre los ingredientes de ${product.name}. Consulta con el personal.`,
          products: [product],
        };
      }
      return { text: `${product.name} lleva: ${product.ingredients.join(", ")}.`, products: [product] };
    }
    if (target.field === "allergens") {
      if (!product.allergens || product.allergens.length === 0) {
        return {
          text: `La carta no contiene informacion confirmada sobre alergenos para ${product.name}. Consulta con el personal.`,
          products: [product],
        };
      }
      return {
        text: `${product.name} declara: ${product.allergens.map((a) => ALLERGEN_LABELS[a as AllergenCode] ?? a).join(", ")}.`,
        products: [product],
      };
    }
  }

  // --- Recommendations ---------------------------------------------------------
  if (/recom|aconsej|lo mejor de la casa/i.test(trimmed)) {
    const recommended = all.filter((p) => p.is_recommended || p.is_popular);
    return listAnswer(recommended, "El establecimiento recomienda");
  }

  // --- Compose filters (can combine) --------------------------------------------
  let pool = all;
  const appliedDescriptions: string[] = [];

  const maxPrice = extractMaxPrice(trimmed);
  if (maxPrice !== null) {
    pool = pool.filter((p) => p.price <= maxPrice);
    appliedDescriptions.push(`por menos de ${formatPrice(maxPrice)}`);
  }
  const minPrice = extractMinPrice(trimmed);
  if (minPrice !== null) {
    pool = pool.filter((p) => p.price >= minPrice);
    appliedDescriptions.push(`por mas de ${formatPrice(minPrice)}`);
  }

  const q = normalize(trimmed);

  if (/vegetarian/i.test(q)) {
    pool = pool.filter((p) => p.is_vegetarian === true);
    appliedDescriptions.push("vegetarianos");
  }
  if (/vegan/i.test(q)) {
    pool = pool.filter((p) => p.is_vegan === true);
    appliedDescriptions.push("veganos");
  }
  if (/sin gluten|gluten\s*free|celiac/i.test(q)) {
    pool = pool.filter((p) => p.is_gluten_free === true);
    appliedDescriptions.push("sin gluten (declarado)");
  }

  const noSpicy = /(no\s+(sea[n]?\s+)?picantes?|sin picante|poco picante|nada picante)/i.test(q);
  const wantsSpicy = !noSpicy && /picant/i.test(q);
  if (noSpicy) {
    pool = pool.filter((p) => p.spice_level === 0);
    appliedDescriptions.push("no picantes");
  } else if (wantsSpicy) {
    pool = pool.filter((p) => (p.spice_level ?? 0) >= 2);
    appliedDescriptions.push("picantes");
  }

  const allergenCode = /sin |alergi|alerg/i.test(q) ? findAllergenCode(q) : null;
  if (allergenCode) {
    pool = pool.filter((p) => p.allergens !== null && !p.allergens.includes(allergenCode));
    appliedDescriptions.push(`sin ${ALLERGEN_LABELS[allergenCode].toLowerCase()} (declarado)`);
  }

  // --- Category / section keyword match ------------------------------------------
  if (menu) {
    const queryTokens = tokenize(trimmed);
    const sectionMatch = flattenProducts(menu.sections)
      .map((x) => x.section)
      .filter((s, i, arr) => arr.findIndex((o) => o.id === s.id) === i)
      .find((section) => {
        const sectionTokens = tokenize(section.name);
        return sectionTokens.some((st) => queryTokens.some((qt) => similarity(qt, st) > 0.75));
      });
    if (sectionMatch) {
      const sectionProductIds = new Set(sectionMatch.products.map((p) => p.id));
      pool = pool.filter((p) => sectionProductIds.has(p.id));
      appliedDescriptions.push(`de "${sectionMatch.name}"`);
    }
  }

  if (appliedDescriptions.length > 0) {
    return listAnswer(pool, `Platos ${appliedDescriptions.join(", ")}`);
  }

  // --- Generic free-text search across name + description ------------------------
  const queryTokens = tokenize(trimmed);
  if (queryTokens.length > 0) {
    const textMatches = all.filter((p) => {
      const haystack = normalize(`${p.name} ${p.description ?? ""}`);
      return queryTokens.some((t) => haystack.includes(t));
    });
    if (textMatches.length > 0) {
      return listAnswer(textMatches, "He encontrado esto en la carta");
    }
  }

  return FALLBACK_NO_MATCH;
}
