import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    code: (s.code as string | undefined) ?? "",
    next: (s.next as string | undefined) ?? "/home",
    error: (s.error as string | undefined) ?? "",
    error_description: (s.error_description as string | undefined) ?? "",
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        if (search.error) {
          throw new Error(search.error_description || search.error);
        }

        // Implicit flow: tokens arrive in the URL hash fragment
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (hash && hash.includes("access_token=")) {
          const params = new URLSearchParams(hash.slice(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            navigate({ to: search.next as "/home" });
            return;
          }
        }

        // PKCE flow: exchange the ?code= param for a session
        if (search.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(search.code);
          if (error) throw error;
          navigate({ to: search.next as "/home" });
          return;
        }

        // Fallback: session may already have been set by the OAuth wrapper
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate({ to: search.next as "/home" });
          return;
        }

        throw new Error("Nessun codice di autenticazione ricevuto");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore di autenticazione");
        navigate({ to: "/auth" });
      }
    })();
  }, [navigate, search]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
      style={{ background: "#0A0A0A" }}
    >
      <Logo />
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: "#2A2A2A", borderTopColor: "#6A00FF" }}
        />
        <p className="text-sm" style={{ color: "#8E8E93" }}>
          Completamento accesso in corso…
        </p>
      </div>
    </div>
  );
}
