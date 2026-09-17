export function formatPrice(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

const SPICE_LABELS = ["Sin picante", "Suave", "Picante", "Muy picante"];

export function spiceLabel(level: number | null): string | null {
  if (level === null || level === undefined) return null;
  return SPICE_LABELS[level] ?? null;
}
