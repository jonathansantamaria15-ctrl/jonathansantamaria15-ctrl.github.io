"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { ProductWithOptions } from "@/lib/types";
import { formatPrice, spiceLabel } from "@/lib/menu/format";
import { allergenLabel } from "@/lib/menu/allergens";
import { Gallery } from "./gallery";

function DietBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-tenant-secondary/30 px-2.5 py-1 text-xs text-tenant-text">
      {label}
    </span>
  );
}

export function ProductDetail({
  product,
  onClose,
}: {
  product: ProductWithOptions | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [product]);

  if (!product) return null;

  const dietBadges: string[] = [];
  if (product.is_vegetarian) dietBadges.push("Vegetariano");
  if (product.is_vegan) dietBadges.push("Vegano");
  if (product.is_gluten_free) dietBadges.push("Sin gluten");
  const spice = spiceLabel(product.spice_level);
  if (spice && product.spice_level && product.spice_level > 0) dietBadges.push(spice);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-tenant-bg sm:max-w-lg sm:rounded-2xl"
      >
        {product.image_url ? (
          <div className="relative h-56 w-full">
            <Image src={product.image_url} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
          </div>
        ) : null}

        {product.gallery_urls.length > 0 ? (
          <Gallery images={product.gallery_urls} alt={product.name} />
        ) : null}

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-tenant-heading text-xl font-semibold">{product.name}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-full bg-tenant-surface p-2 text-tenant-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!product.is_available ? (
            <p className="text-sm font-medium text-red-600">Agotado temporalmente</p>
          ) : null}

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">{formatPrice(product.price, product.currency)}</span>
            {product.compare_at_price ? (
              <span className="text-sm text-tenant-secondary line-through">
                {formatPrice(product.compare_at_price, product.currency)}
              </span>
            ) : null}
          </div>

          {product.description ? (
            <p className="text-sm leading-relaxed text-tenant-secondary">{product.description}</p>
          ) : null}

          {dietBadges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dietBadges.map((b) => (
                <DietBadge key={b} label={b} />
              ))}
            </div>
          ) : null}

          {product.variants.length > 0 ? (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-tenant-secondary">
                Opciones
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {product.variants.map((v) => (
                  <li key={v.id} className="flex justify-between">
                    <span>{v.name}</span>
                    <span className="text-tenant-secondary">
                      {v.price_delta > 0 ? `+${formatPrice(v.price_delta, product.currency)}` : "incluido"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.extras.length > 0 ? (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-tenant-secondary">
                Suplementos
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {product.extras.map((ex) => (
                  <li key={ex.id} className="flex justify-between">
                    <span>{ex.name}</span>
                    <span className="text-tenant-secondary">+{formatPrice(ex.price, product.currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.ingredients && product.ingredients.length > 0 ? (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-tenant-secondary">
                Ingredientes
              </h3>
              <p className="text-sm text-tenant-secondary">{product.ingredients.join(", ")}</p>
            </section>
          ) : null}

          {product.allergens && product.allergens.length > 0 ? (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-tenant-secondary">
                Alergenos declarados
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.allergens.map((a) => (
                  <span key={a} className="rounded-full bg-tenant-surface px-2 py-0.5 text-xs">
                    {allergenLabel(a)}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {(product.weight_grams || product.serving_size || product.calories) ? (
            <dl className="grid grid-cols-3 gap-2 text-center text-xs">
              {product.weight_grams ? (
                <div className="rounded-tenant bg-tenant-surface py-2">
                  <dt className="text-tenant-secondary">Peso</dt>
                  <dd className="font-medium">{product.weight_grams} g</dd>
                </div>
              ) : null}
              {product.serving_size ? (
                <div className="rounded-tenant bg-tenant-surface py-2">
                  <dt className="text-tenant-secondary">Racion</dt>
                  <dd className="font-medium">{product.serving_size}</dd>
                </div>
              ) : null}
              {product.calories ? (
                <div className="rounded-tenant bg-tenant-surface py-2">
                  <dt className="text-tenant-secondary">Calorias</dt>
                  <dd className="font-medium">{product.calories} kcal</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {product.pairing_notes ? (
            <p className="text-sm italic text-tenant-secondary">{product.pairing_notes}</p>
          ) : null}
          {product.notes ? <p className="text-xs text-tenant-secondary">{product.notes}</p> : null}
        </div>
      </div>
    </div>
  );
}
