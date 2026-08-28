import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = await isSuperadmin();
    if (admin) redirect("/master");

    const { data: memberships } = await supabase
      .from("memberships")
      .select("business_id")
      .limit(1);
    if (memberships && memberships.length > 0) redirect("/business");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-chrome-text">
        Plataforma para hosteleria
      </h1>
      <p className="max-w-md text-sm text-chrome-muted">
        Cartas digitales, QR propio y estadisticas para tu establecimiento, sobre un motor
        multi-tenant unico.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link href="/business">
            <Button>Ir a mi panel</Button>
          </Link>
        ) : (
          <>
            <Link href="/login">
              <Button>Iniciar sesion</Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary">Crear cuenta</Button>
            </Link>
          </>
        )}
      </div>
      <p className="text-xs text-chrome-muted">
        Busca un establecimiento? Escanea el QR de tu mesa.
      </p>
    </main>
  );
}
