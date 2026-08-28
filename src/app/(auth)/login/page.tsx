"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/badge";
import { GoogleButton } from "@/components/auth/google-button";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email o contrasena incorrectos.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-chrome-text">Iniciar sesion</h1>
        <p className="mt-1 text-sm text-chrome-muted">Accede a tu panel de administracion.</p>
      </div>

      {params.get("error") ? (
        <Alert tone="danger">No se pudo completar el inicio de sesion. Intentalo de nuevo.</Alert>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-xs text-chrome-muted">
        <span className="h-px flex-1 bg-chrome-border" /> o <span className="h-px flex-1 bg-chrome-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="flex justify-between text-xs text-chrome-muted">
        <Link href="/forgot-password" className="hover:text-chrome-text">
          Olvide mi contrasena
        </Link>
        <Link href="/signup" className="hover:text-chrome-text">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
