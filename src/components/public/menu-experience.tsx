"use client";

import { useEffect, useState } from "react";
import type { Business, BusinessService, BusinessTheme, MenuWithContent, ProductWithOptions } from "@/lib/types";
import { track, type TrackContext } from "@/lib/analytics/client";
import { Hero } from "./hero";
import { CategoryNav } from "./category-nav";
import { ProductCard } from "./product-card";
import { ProductDetail } from "./product-detail";
import { FooterServices } from "./footer-services";
import { ChatbotLauncher } from "@/components/chatbot/chatbot-launcher";

export function MenuExperience({
  business,
  theme,
  menu,
  services,
  qrContext,
  tableLabel,
}: {
  business: Business;
  theme: BusinessTheme;
  menu: MenuWithContent | null;
  services: BusinessService[];
  qrContext: { qrId: string | null; tableId: string | null; zoneId: string | null };
  tableLabel: string | null;
}) {
  const [openProduct, setOpenProduct] = useState<ProductWithOptions | null>(null);
  const trackCtx: TrackContext = { businessId: business.id, qrId: qrContext.qrId, tableId: qrContext.tableId, zoneId: qrContext.zoneId };

  useEffect(() => {
    track(trackCtx, "menu_opened");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = menu?.sections ?? [];

  return (
    <>
      {tableLabel ? (
        <div className="bg-tenant-primary px-4 py-1.5 text-center text-xs font-medium text-white">
          {tableLabel}
        </div>
      ) : null}

      <Hero business={business} theme={theme} />
      <CategoryNav sections={sections} navStyle={theme.nav_style} />

      <div className="flex flex-col gap-8 px-4 py-6">
        {sections.map((section) => (
          <section
            key={section.id}
            id={`section-${section.id}`}
            className="scroll-mt-20"
            onMouseEnter={() => track(trackCtx, "section_viewed", { sectionId: section.id })}
          >
            <h2 className="mb-3 font-tenant-heading text-lg font-semibold">{section.name}</h2>
            {section.description ? (
              <p className="mb-3 text-sm text-tenant-secondary">{section.description}</p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {section.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cardStyle={theme.card_style}
                  onSelect={() => {
                    setOpenProduct(product);
                    track(trackCtx, "product_viewed", { productId: product.id, sectionId: section.id });
                  }}
                />
              ))}
              {section.products.length === 0 ? (
                <p className="text-sm text-tenant-secondary">Sin productos en esta categoria todavia.</p>
              ) : null}
            </div>
          </section>
        ))}

        {sections.length === 0 ? (
          <p className="py-12 text-center text-sm text-tenant-secondary">
            La carta de este establecimiento todavia no esta disponible.
          </p>
        ) : null}
      </div>

      <FooterServices
        services={services}
        onServiceClick={(service) => track(trackCtx, "service_clicked", { serviceId: service.id })}
      />

      <ProductDetail product={openProduct} onClose={() => setOpenProduct(null)} />

      <ChatbotLauncher business={business} menu={menu} trackCtx={trackCtx} />
    </>
  );
}
