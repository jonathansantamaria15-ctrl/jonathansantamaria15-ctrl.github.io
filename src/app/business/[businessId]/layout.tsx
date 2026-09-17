import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessRole } from "@/lib/auth";
import { getBusiness, getBusinessTheme } from "@/lib/services/business-service";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MembershipRole } from "@/lib/types";

const NAV: { href: (id: string) => string; label: string; roles: MembershipRole[] }[] = [
  { href: (id) => `/business/${id}`, label: "Resumen", roles: ["owner", "manager", "employee"] },
  { href: (id) => `/business/${id}/availability`, label: "Disponibilidad", roles: ["owner", "manager", "employee"] },
  { href: (id) => `/business/${id}/menu`, label: "Carta", roles: ["owner", "manager"] },
  { href: (id) => `/business/${id}/theme`, label: "Tema", roles: ["owner", "manager"] },
  { href: (id) => `/business/${id}/tables`, label: "Mesas y zonas", roles: ["owner", "manager"] },
  { href: (id) => `/business/${id}/qr`, label: "Codigos QR", roles: ["owner", "manager"] },
  { href: (id) => `/business/${id}/team`, label: "Equipo", roles: ["owner"] },
  { href: (id) => `/business/${id}/settings`, label: "Ajustes", roles: ["owner"] },
  { href: (id) => `/business/${id}/stats`, label: "Estadisticas", roles: ["owner", "manager"] },
];

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { role } = await requireBusinessRole(businessId, ["owner", "manager", "employee"]);

  const supabase = await createClient();
  const [business, theme] = await Promise.all([
    getBusiness(supabase, businessId),
    getBusinessTheme(supabase, businessId),
  ]);
  if (!business) notFound();

  const visibleNav = NAV.filter((item) => item.roles.includes(role));
  const accent = theme?.color_primary ?? "#1f2937";

  return (
    <div className="min-h-screen">
      <header
        className="border-b border-chrome-border bg-chrome-surface"
        style={{ borderTopColor: accent, borderTopWidth: 3 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {theme?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.logo_url} alt="" className="h-7 w-7 rounded" />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {business.name.slice(0, 1)}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold leading-none text-chrome-text">{business.name}</p>
              <Badge tone={business.status === "published" ? "success" : "neutral"} className="mt-1">
                {business.status}
              </Badge>
            </div>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {visibleNav.map((item) => (
            <Link
              key={item.label}
              href={item.href(businessId)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-chrome-muted hover:bg-chrome-border/40 hover:text-chrome-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
