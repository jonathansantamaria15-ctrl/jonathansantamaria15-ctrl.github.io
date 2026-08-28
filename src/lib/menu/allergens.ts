// Controlled vocabulary: the 14 allergens EU food-info regulation (1169/2011)
// requires businesses to declare. Kept as fixed codes (not free text) so the
// dashboard, public menu and chatbot all agree on the same values — nothing
// is ever inferred, only what an OWNER/MANAGER explicitly ticks.
export const ALLERGEN_CODES = [
  "gluten",
  "crustaceos",
  "huevos",
  "pescado",
  "cacahuetes",
  "soja",
  "lacteos",
  "frutos_cascara",
  "apio",
  "mostaza",
  "sesamo",
  "sulfitos",
  "altramuces",
  "moluscos",
] as const;

export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export const ALLERGEN_LABELS: Record<AllergenCode, string> = {
  gluten: "Gluten",
  crustaceos: "Crustaceos",
  huevos: "Huevo",
  pescado: "Pescado",
  cacahuetes: "Cacahuetes",
  soja: "Soja",
  lacteos: "Lacteos",
  frutos_cascara: "Frutos de cascara",
  apio: "Apio",
  mostaza: "Mostaza",
  sesamo: "Sesamo",
  sulfitos: "Sulfitos",
  altramuces: "Altramuces",
  moluscos: "Moluscos",
};

export function isAllergenCode(value: string): value is AllergenCode {
  return (ALLERGEN_CODES as readonly string[]).includes(value);
}

export function allergenLabel(code: string): string {
  return isAllergenCode(code) ? ALLERGEN_LABELS[code] : code;
}
