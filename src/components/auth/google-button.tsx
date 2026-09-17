"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleButton({ next = "/" }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      onClick={handleClick}
      disabled={loading}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.4-1.1 2.6-2.4 3.4v2.8h3.9c2.3-2.1 3.5-5.2 3.5-8.4z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-2.8c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3C3.4 21.3 7.4 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.4 14.5c-.2-.7-.4-1.4-.4-2.5s.1-1.8.4-2.5v-3H1.4C.5 8.1 0 10 0 12s.5 3.9 1.4 5.5l4-3z"
        />
        <path
          fill="#EA4335"
          d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3c.9-2.8 3.5-4.7 6.6-4.7z"
        />
      </svg>
      Continuar con Google
    </Button>
  );
}
