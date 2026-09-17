import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/badge";
import { acceptInvite } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propietario",
  manager: "Gerente",
  employee: "Empleado",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invitations")
    .select("email, role, status, expires_at, business:businesses(name)")
    .eq("token", token)
    .maybeSingle();

  const user = await getCurrentUser();

  const invalid =
    !invite ||
    invite.status !== "pending" ||
    new Date(invite.expires_at as string) < new Date();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <Card className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-chrome-text">Invitacion</h1>

        {invalid ? (
          <Alert tone="danger">Esta invitacion no es valida o ha caducado.</Alert>
        ) : (
          <>
            <p className="text-sm text-chrome-muted">
              Te han invitado a unirte a{" "}
              <strong className="text-chrome-text">
                {(invite!.business as unknown as { name: string } | null)?.name ?? "un establecimiento"}
              </strong>{" "}
              como <strong className="text-chrome-text">{ROLE_LABEL[invite!.role] ?? invite!.role}</strong>.
            </p>
            <p className="text-xs text-chrome-muted">
              Debes iniciar sesion con <strong>{invite!.email}</strong> para aceptarla.
            </p>

            {error ? <Alert tone="danger">{error}</Alert> : null}

            <form action={acceptInvite.bind(null, token)}>
              <Button type="submit" className="w-full">
                {user ? "Aceptar invitacion" : "Iniciar sesion y aceptar"}
              </Button>
            </form>
            {!user ? (
              <p className="text-center text-xs text-chrome-muted">
                No tienes cuenta?{" "}
                <Link
                  href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                  className="text-chrome-text hover:underline"
                >
                  Crea una
                </Link>
              </p>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
