import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listBusinesses } from "@/lib/services/business-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function BusinessesListPage() {
  const supabase = await createClient();
  const businesses = await listBusinesses(supabase);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-chrome-text">Establecimientos</h1>
          <p className="text-sm text-chrome-muted">{businesses.length} en total.</p>
        </div>
        <Link href="/master/businesses/new">
          <Button>+ Nuevo local</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-chrome-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-chrome-surface text-xs uppercase text-chrome-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Creado</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => (
              <tr key={b.id} className="border-t border-chrome-border">
                <td className="px-4 py-2 font-medium text-chrome-text">{b.name}</td>
                <td className="px-4 py-2">
                  <Badge tone={b.status === "published" ? "success" : "neutral"}>{b.status}</Badge>
                </td>
                <td className="px-4 py-2 text-chrome-muted">/r/{b.slug}</td>
                <td className="px-4 py-2 text-chrome-muted">
                  {new Date(b.created_at).toLocaleDateString("es-ES")}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/master/businesses/${b.id}`} className="text-xs text-chrome-text hover:underline">
                    Administrar
                  </Link>
                </td>
              </tr>
            ))}
            {businesses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-chrome-muted">
                  Todavia no hay establecimientos. Crea el primero.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
