import { redirect } from "next/navigation";
import { requireUser, isSuperadmin } from "@/lib/auth";
import { claimSuperadminAction } from "@/lib/actions/auth-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/badge";

export default async function ClaimSuperadminPage({
  searchParams,
}: {
  searchParams: Promise<{ claim_failed?: string }>;
}) {
  const user = await requireUser();
  const { claim_failed } = await searchParams;

  if (await isSuperadmin()) redirect("/master");

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <Card className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-chrome-text">Panel MASTER</h1>
        <p className="text-sm text-chrome-muted">
          Todavia no hay ningun SUPERADMIN en esta plataforma. Como primer usuario autenticado
          ({user.email}), puedes reclamar ese rol una unica vez.
        </p>
        {claim_failed ? (
          <Alert tone="danger">
            Ya existe un SUPERADMIN en la plataforma. Pide a esa persona que te invite.
          </Alert>
        ) : null}
        <form action={claimSuperadminAction}>
          <Button type="submit" className="w-full">
            Convertirme en SUPERADMIN
          </Button>
        </form>
      </Card>
    </div>
  );
}
