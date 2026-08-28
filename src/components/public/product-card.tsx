import Image from "next/image";
import clsx from "clsx";
import type { BusinessTheme, ProductWithOptions } from "@/lib/types";
import { formatPrice } from "@/lib/menu/format";

export function ProductCard({
  product,
  cardStyle,
  onSelect,
}: {
  product: ProductWithOptions;
  cardStyle: BusinessTheme["card_style"];
  onSelect?: () => void;
}) {
  const badges: { label: string; tone: string }[] = [];
  if (!product.is_available) badges.push({ label: "Agotado", tone: "bg-neutral-900/80 text-white" });
  if (product.is_new) badges.push({ label: "Nuevo", tone: "bg-tenant-accent text-white" });
  if (product.is_recommended) badges.push({ label: "Recomendado", tone: "bg-tenant-primary text-white" });
  if (product.is_popular) badges.push({ label: "Popular", tone: "bg-tenant-primary text-white" });

  const imageForward = cardStyle === "image-forward" && product.image_url;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={clsx(
        "flex w-full gap-3 rounded-tenant text-left transition-opacity",
        !product.is_available && "opacity-60",
        cardStyle === "elevated" && "bg-tenant-surface p-3 shadow-sm",
        cardStyle === "outlined" && "border border-tenant-secondary/20 p-3",
        cardStyle === "flat" && "p-3",
        imageForward && "flex-col overflow-hidden bg-tenant-surface p-0 shadow-sm"
      )}
    >
      {product.image_url ? (
        <div
          className={clsx(
            "relative shrink-0 overflow-hidden bg-tenant-secondary/10",
            imageForward ? "h-36 w-full" : "h-20 w-20 rounded-tenant"
          )}
        >
          <Image
            src={product.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 40vw, 200px"
          />
        </div>
      ) : null}

      <div className={clsx("flex min-w-0 flex-1 flex-col gap-1", imageForward && "p-3")}>
        <div className="flex flex-wrap gap-1">
          {badges.map((b) => (
            <span key={b.label} className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold", b.tone)}>
              {b.label}
            </span>
          ))}
        </div>
        <h3 className="font-tenant-heading text-base font-medium leading-snug">{product.name}</h3>
        {product.description ? (
          <p className="line-clamp-2 text-xs text-tenant-secondary">{product.description}</p>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-sm font-semibold">{formatPrice(product.price, product.currency)}</span>
          {product.compare_at_price ? (
            <span className="text-xs text-tenant-secondary line-through">
              {formatPrice(product.compare_at_price, product.currency)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
