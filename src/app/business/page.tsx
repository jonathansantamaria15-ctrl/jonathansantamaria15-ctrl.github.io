import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, isSuperadmin } from "@/lib/auth";
import { listBusinesses } from "@/lib/services/business-service";

export default async function BusinessRootPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("business_id, business:businesses(name, slug)")
    .order("created_at", { ascending: true });

  if (memberships && memberships.length === 1) {
    redirect(`/business/${memberships[0].business_id}`);
  }

  if (memberships && memberships.length > 1) {
    return (
      <div className="mx-auto max-w-md py-16 px-4">
        <h1 className="mb-4 text-lg font-semibold text-chrome-text">Elige un establecimiento</h1>
        <ul className="flex flex-col gap-2">
          {memberships.map((m) => (
            <li key={m.business_id}>
              <Link
                href={`/business/${m.business_id}`}
                className="block rounded-lg border border-chrome-border bg-chrome-surface px-4 py-3 text-sm hover:bg-chrome-border/40"
              >
                {(m.business as unknown as { name: string } | null)?.name ?? m.business_id}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (await isSuperadmin()) {
    const businesses = await listBusinesses(supabase);
    return (
      <div className="mx-auto max-w-md py-16 px-4">
        <h1 className="mb-2 text-lg font-semibold text-chrome-text">
          No perteneces a ningun establecimiento
        </h1>
        <p className="mb-4 text-sm text-chrome-muted">
          Como SUPERADMIN puedes administrar cualquiera desde el panel MASTER.
        </p>
        <Link href="/master/businesses" className="text-sm text-chrome-text hover:underline">
          Ir a MASTER →
        </Link>
        <ul className="mt-4 flex flex-col gap-2">
          {businesses.slice(0, 5).map((b) => (
            <li key={b.id}>
              <Link href={`/business/${b.id}`} className="text-sm text-chrome-muted hover:text-chrome-text">
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 px-4 text-center">
      <h1 className="mb-2 text-lg font-semibold text-chrome-text">Sin establecimientos</h1>
      <p className="text-sm text-chrome-muted">
        Todavia no perteneces a ningun establecimiento. Si esperabas una invitacion, revisa tu
        email.
      </p>
    </div>
  );
}
