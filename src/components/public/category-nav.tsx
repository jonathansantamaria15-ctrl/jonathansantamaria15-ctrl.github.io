"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { BusinessTheme, SectionWithProducts } from "@/lib/types";

export function CategoryNav({
  sections,
  navStyle,
}: {
  sections: SectionWithProducts[];
  navStyle: BusinessTheme["nav_style"];
}) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id.replace("section-", ""));
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    for (const section of sections) {
      const el = document.getElementById(`section-${section.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  const isChip = navStyle === "chips";

  return (
    <nav
      aria-label="Categorias"
      className="sticky top-0 z-20 border-b border-tenant-secondary/15 bg-tenant-bg/95 backdrop-blur"
    >
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <a
              key={section.id}
              href={`#section-${section.id}`}
              className={clsx(
                "shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors",
                isChip
                  ? "rounded-full"
                  : "rounded-tenant border-b-2 border-transparent px-2",
                isActive
                  ? isChip
                    ? "bg-tenant-primary text-white"
                    : "border-tenant-primary text-tenant-primary"
                  : "text-tenant-secondary hover:text-tenant-text"
              )}
            >
              {section.name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
