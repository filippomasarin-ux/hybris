import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Mail, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Mode = "login" | "signup" | "email-sent";

const inputClass = [
  "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors",
  "placeholder:text-[oklch(0.38_0.02_290)]",
].join(" ");

const inputStyle = {
  background: "oklch(0.07 0.015 295)",
  borderColor: "oklch(1 0 0 / 8%)",
  color: "var(--color-foreground)",
};

const inputFocusStyle = {
  ...inputStyle,
  borderColor: "oklch(0.66 0.28 295 / 60%)",
  boxShadow: "0 0 0 3px oklch(0.66 0.28 295 / 12%)",
};

function Field({
  label, type, value, onChange, placeholder, autoComplete, required, minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: "oklch(0.5 0.02 290)" }}
      >
        {label}
      </label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={inputClass}
        style={focused ? inputFocusStyle : inputStyle}
        placeholder={placeholder}
      />
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completato")
          .eq("id", session.user.id)
          .maybeSingle();
        navigate({ to: profile?.onboarding_completato ? "/home" : "/onboarding" });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: nome },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/onboarding" });
        } else {
          setMode("email-sent");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore di autenticazione");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast.error("Impossibile reinviare l'email");
    } else {
      toast.success("Email inviata di nuovo!");
    }
    setResending(false);
  };

  if (mode === "email-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm text-center" style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "oklch(0.66 0.28 295 / 14%)", border: "1px solid oklch(0.66 0.28 295 / 25%)" }}
          >
            <Mail size={26} style={{ color: "var(--color-accent)" }} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Controlla la email</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "oklch(0.55 0.02 290)" }}>
            Link di conferma inviato a{" "}
            <span className="font-semibold text-foreground">{email}</span>.
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{ borderColor: "oklch(1 0 0 / 10%)", color: "var(--color-foreground)", background: "oklch(0.115 0.025 295)" }}
          >
            {resending ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Reinvia email
          </button>
          <div className="mt-4">
            <button
              onClick={() => setMode("login")}
              className="text-sm underline-offset-4 hover:underline"
              style={{ color: "oklch(0.5 0.02 290)" }}
            >
              ← Torna al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.66 0.28 295 / 18%) 0%, transparent 65%)",
            animation: "breathe 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.62 0.21 25 / 12%) 0%, transparent 65%)",
            animation: "breathe 7s 2s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* ─── Left: Branding ─────────────────────── */}
        <div className="hidden flex-col justify-between px-10 py-12 lg:flex xl:px-16">
          <Logo size="md" />
          <div style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
            <h1 className="font-display text-6xl tracking-widest uppercase xl:text-7xl">
              HYBRIS
            </h1>
            <p className="mt-4 text-lg uppercase tracking-[0.3em]" style={{ color: "#8E8E93" }}>
              Oltre ogni limite
            </p>
            <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: "oklch(0.55 0.02 290)" }}>
              Il coach AI multi-sport che ti sfida ogni giorno. Piani generati dall'AI, analisi del carico e una community di atleti.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "oklch(0.4 0.015 290)" }}>
            Hybris · v1.0
          </p>
        </div>


        {/* ─── Right: Form ────────────────────────── */}
        <div className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-sm" style={{ animation: "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both" }}>
            {/* Mobile-only logo */}
            <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
              <Logo />
              <p className="text-sm" style={{ color: "oklch(0.5 0.02 290)" }}>
                Il tuo coach personale, sempre con te.
              </p>
            </div>

            {/* Card */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: "oklch(0.10 0.022 295)",
                border: "1px solid oklch(1 0 0 / 7%)",
                boxShadow: "0 1px 0 oklch(1 0 0 / 5%) inset, 0 24px 60px oklch(0 0 0 / 50%)",
              }}
            >
              {/* Tab switcher */}
              <div
                className="mb-6 flex rounded-xl p-1"
                style={{ background: "oklch(0.07 0.015 295)" }}
              >
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-150"
                    style={
                      mode === m
                        ? { background: "oklch(0.115 0.025 295)", color: "var(--color-foreground)", boxShadow: "0 1px 3px oklch(0 0 0 / 40%)" }
                        : { color: "oklch(0.5 0.02 290)" }
                    }
                  >
                    {m === "login" ? "Accedi" : "Registrati"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <Field label="Nome" type="text" required value={nome} onChange={setNome} placeholder="Come ti chiami?" />
                )}
                <Field label="Email" type="email" required autoComplete="email" value={email} onChange={setEmail} placeholder="tu@example.com" />
                <Field
                  label="Password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={setPassword}
                  placeholder="Almeno 6 caratteri"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl py-3 text-sm font-bold tracking-wide text-white transition-all duration-150 hover:brightness-110 disabled:opacity-50"
                  style={{
                    background: "oklch(0.66 0.28 295)",
                    boxShadow: "0 0 0 1px oklch(0.66 0.28 295 / 40%), 0 4px 20px oklch(0.66 0.28 295 / 35%)",
                  }}
                >
                  {loading ? "Attendi…" : mode === "signup" ? "Crea account" : "Accedi"}
                </button>
              </form>
            </div>

            <p className="mt-5 text-center text-xs" style={{ color: "oklch(0.4 0.015 290)" }}>
              Continuando accetti i termini di servizio di RunHub AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
