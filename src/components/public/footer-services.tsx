import type { BusinessService, ServiceType } from "@/lib/types";

const SERVICE_META: Record<ServiceType, { label: string; href: (v: string) => string; icon: string }> = {
  maps: { label: "Como llegar", href: (v) => v, icon: "📍" },
  phone: { label: "Llamar", href: (v) => `tel:${v}`, icon: "📞" },
  whatsapp: { label: "WhatsApp", href: (v) => `https://wa.me/${v.replace(/[^0-9]/g, "")}`, icon: "💬" },
  email: { label: "Email", href: (v) => `mailto:${v}`, icon: "✉️" },
  website: { label: "Web", href: (v) => v, icon: "🌐" },
  instagram: { label: "Instagram", href: (v) => v, icon: "📷" },
  facebook: { label: "Facebook", href: (v) => v, icon: "📘" },
  tiktok: { label: "TikTok", href: (v) => v, icon: "🎵" },
  reservations: { label: "Reservar", href: (v) => v, icon: "📅" },
  reviews: { label: "Opiniones", href: (v) => v, icon: "⭐" },
  delivery: { label: "Pedir a domicilio", href: (v) => v, icon: "🛵" },
  wifi: { label: "Wi-Fi", href: () => "#wifi", icon: "📶" },
};

export function FooterServices({
  services,
  onServiceClick,
}: {
  services: BusinessService[];
  onServiceClick?: (service: BusinessService) => void;
}) {
  const active = services.filter((s) => s.is_active);
  if (active.length === 0) return null;

  return (
    <footer className="border-t border-tenant-secondary/15 px-4 py-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tenant-secondary">
        Servicios
      </h2>
      <div className="flex flex-wrap gap-2">
        {active.map((service) => {
          const meta = SERVICE_META[service.type];
          if (service.type === "wifi") {
            return (
              <span
                key={service.id}
                className="flex items-center gap-1.5 rounded-full bg-tenant-surface px-3 py-2 text-sm"
              >
                <span aria-hidden>{meta.icon}</span>
                {service.label ?? "Wi-Fi"}: {service.value}
              </span>
            );
          }
          return (
            <a
              key={service.id}
              href={meta.href(service.value)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onServiceClick?.(service)}
              className="flex items-center gap-1.5 rounded-full bg-tenant-surface px-3 py-2 text-sm text-tenant-text transition-colors hover:bg-tenant-primary hover:text-white"
            >
              <span aria-hidden>{meta.icon}</span>
              {service.label ?? meta.label}
            </a>
          );
        })}
      </div>
    </footer>
  );
}
