"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/badge";
import { GoogleButton } from "@/components/auth/google-button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-chrome-text">Revisa tu email</h1>
        <p className="text-sm text-chrome-muted">
          Te hemos enviado un enlace de confirmacion a {email}. Abrelo para activar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-chrome-text">Crear cuenta</h1>
        <p className="mt-1 text-sm text-chrome-muted">
          Necesaria para aceptar invitaciones de un establecimiento o, si eres el primer usuario,
          para convertirte en administrador de la plataforma.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <GoogleButton />

      <div className="flex items-center gap-3 text-xs text-chrome-muted">
        <span className="h-px flex-1 bg-chrome-border" /> o <span className="h-px flex-1 bg-chrome-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="fullName">Nombre</Label>
          <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center text-xs text-chrome-muted">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="text-chrome-text hover:underline">
          Inicia sesion
        </Link>
      </p>
    </div>
  );
}
