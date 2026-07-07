import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Mail, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Mode = "login" | "signup" | "email-sent";

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
        className="mb-1.5 block uppercase"
        style={{
          color: "#8E8E93",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.15em",
        }}
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
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
        style={{
          background: "#1A1A1A",
          border: `1px solid ${focused ? "#6A00FF" : "#2A2A2A"}`,
          color: "#F7F7FF",
        }}
      />
      <style>{`input::placeholder{color:#5A5A60}`}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore Google sign-in");
    } finally {
      setGoogleLoading(false);
    }
  };

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
    if (error) toast.error("Impossibile reinviare l'email");
    else toast.success("Email inviata di nuovo!");
    setResending(false);
  };

  if (mode === "email-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "#0A0A0A" }}>
        <div className="w-full max-w-sm text-center" style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(106,0,255,0.14)", border: "1px solid rgba(106,0,255,0.25)" }}
          >
            <Mail size={26} style={{ color: "#6A00FF" }} />
          </div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: "#F7F7FF" }}>Controlla la email</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#8E8E93" }}>
            Link di conferma inviato a <span className="font-semibold" style={{ color: "#F7F7FF" }}>{email}</span>.
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{ border: "1px solid #2A2A2A", color: "#F7F7FF", background: "#1A1A1A" }}
          >
            <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
            Reinvia email
          </button>
          <div className="mt-4">
            <button
              onClick={() => setMode("login")}
              className="text-sm underline-offset-4 hover:underline"
              style={{ color: "#8E8E93" }}
            >
              ← Torna al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12" style={{ background: "#0A0A0A" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/3 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(106,0,255,0.18) 0%, transparent 65%)",
            animation: "breathe 9s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm" style={{ animation: "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both" }}>
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ boxShadow: "0 0 40px rgba(106,0,255,0.3)" }}
          >
            <svg width="80" height="80" viewBox="0 0 72 72" fill="none" aria-hidden="true">
              <rect x="0" y="0" width="21" height="72" fill="#6A00FF" />
              <rect x="51" y="0" width="21" height="72" fill="#B5179E" />
              <polygon points="0,41 0,29 72,13 72,25" fill="#00F5D4" />
            </svg>
          </div>
          <h1
            className="font-display"
            style={{ fontSize: "48px", letterSpacing: "0.15em", color: "#F7F7FF", lineHeight: 1 }}
          >
            HYBRIS
          </h1>
          <p
            className="mt-3 uppercase"
            style={{ fontSize: "13px", color: "#8E8E93", letterSpacing: "0.2em", fontWeight: 400 }}
          >
            Oltre ogni limite
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl px-8 py-8"
          style={{
            background: "#111111",
            border: "1px solid #3A3A3A",
            boxShadow: "0 0 0 1px rgba(106,0,255,0.15), 0 24px 48px rgba(0,0,0,0.6)",
          }}
        >
          {/* Title */}
          <h2
            className="mb-6 text-center font-black tracking-tight"
            style={{ color: "#F7F7FF", fontSize: "20px" }}
          >
            {mode === "signup" ? "Crea il tuo account" : "Bentornato"}
          </h2>


          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm transition-colors hover:brightness-125 disabled:opacity-50"
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: "#F7F7FF",
              fontWeight: 500,
            }}
          >
            <GoogleIcon />
            {googleLoading ? "Attendi…" : "Continua con Google"}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "#2A2A2A" }} />
            <span
              className="uppercase"
              style={{ color: "#8E8E93", fontSize: "12px", letterSpacing: "0.15em" }}
            >
              oppure
            </span>
            <div className="h-px flex-1" style={{ background: "#2A2A2A" }} />
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
              className="mt-2 w-full rounded-xl transition-all duration-150 disabled:opacity-50"
              style={{
                background: "#6A00FF",
                color: "#F7F7FF",
                height: "48px",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#5800D4"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#6A00FF"; }}
            >
              {loading ? "Attendi…" : mode === "signup" ? "Crea account" : "Accedi"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center" style={{ color: "#5A5A60", fontSize: "11px", fontWeight: 400 }}>
          Continuando accetti i Termini di servizio di Hybris
        </p>
      </div>
    </div>
  );
}
