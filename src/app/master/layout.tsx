import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/master", label: "Resumen" },
  { href: "/master/businesses", label: "Establecimientos" },
];

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  await requireSuperadmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-chrome-border bg-chrome-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-wide text-chrome-text">
              MASTER
            </span>
            <nav className="flex gap-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-chrome-muted hover:text-chrome-text"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
