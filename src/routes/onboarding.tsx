import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPORTS, GIORNI, OBIETTIVI, type SportKey } from "@/lib/sports";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  component: OnboardingPage,
});

type FormState = {
  nome: string;
  eta: number | "";
  anni_esperienza: number;
  sport_secondari: SportKey[];
  sport_primario: SportKey | "";
  obiettivo_tipo: string;
  obiettivo_dettaglio: string;
  giorni_disponibili: string[];
  giorni_count: number;
  limitazioni_fisiche: string;
};

const TOTAL_STEPS = 5;

function OnboardingPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    nome: "",
    eta: "",
    anni_esperienza: 1,
    sport_secondari: [],
    sport_primario: "",
    obiettivo_tipo: "",
    obiettivo_dettaglio: "",
    giorni_disponibili: [],
    giorni_count: 3,
    limitazioni_fisiche: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, onboarding_completato")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.onboarding_completato) navigate({ to: "/home" });
      if (profile?.nome) setForm((f) => ({ ...f, nome: profile.nome ?? "" }));
    })();
  }, [navigate]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleSport = (s: SportKey) => {
    setForm((f) => {
      const has = f.sport_secondari.includes(s);
      const next = has ? f.sport_secondari.filter((x) => x !== s) : [...f.sport_secondari, s];
      const primario = next.includes(f.sport_primario as SportKey) ? f.sport_primario : (next[0] ?? "");
      return { ...f, sport_secondari: next, sport_primario: primario };
    });
  };

  const toggleGiorno = (g: string) => {
    setForm((f) => ({
      ...f,
      giorni_disponibili: f.giorni_disponibili.includes(g)
        ? f.giorni_disponibili.filter((x) => x !== g)
        : [...f.giorni_disponibili, g],
    }));
  };

  const canNext = (() => {
    if (step === 1) return form.nome.trim().length > 0 && Number(form.eta) > 0;
    if (step === 2) return form.sport_secondari.length > 0 && form.sport_primario !== "";
    if (step === 3) {
      if (!form.obiettivo_tipo) return false;
      if (form.obiettivo_tipo === "gara") return form.obiettivo_dettaglio.trim().length > 0;
      return true;
    }
    if (step === 4) return form.giorni_disponibili.length > 0;
    return true;
  })();

  const handleComplete = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: form.nome,
        eta: Number(form.eta) || null,
        anni_esperienza: form.anni_esperienza,
        sport_primario: form.sport_primario,
        sport_secondari: form.sport_secondari,
        obiettivo_tipo: form.obiettivo_tipo,
        obiettivo_dettaglio: form.obiettivo_dettaglio || null,
        giorni_disponibili: form.giorni_disponibili,
        limitazioni_fisiche: form.limitazioni_fisiche || null,
        onboarding_completato: true,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Errore nel salvare il profilo");
      return;
    }
    toast.success("Pronto, sei dentro!");
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Logo />
          <span className="label-caps text-muted-foreground">Step {step} di {TOTAL_STEPS}</span>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 pb-32">
        {step === 1 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl">Iniziamo da te</h1>
              <p className="mt-1 text-sm text-muted-foreground">Due dati base per personalizzare tutto.</p>
            </div>

            <Field label="Nome">
              <input
                type="text" value={form.nome}
                onChange={(e) => update("nome", e.target.value)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="Il tuo nome"
              />
            </Field>

            <Field label="Età">
              <input
                type="number" inputMode="numeric" min={10} max={100}
                value={form.eta}
                onChange={(e) => update("eta", e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="es. 32"
              />
            </Field>

            <Field label={`Anni di esperienza · ${form.anni_esperienza}${form.anni_esperienza === 20 ? "+" : ""}`}>
              <input
                type="range" min={0} max={20} value={form.anni_esperienza}
                onChange={(e) => update("anni_esperienza", Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </Field>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl">I tuoi sport</h1>
              <p className="mt-1 text-sm text-muted-foreground">Seleziona tutto quello che pratichi.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => {
                const selected = form.sport_secondari.includes(s.key);
                const Icon = s.icon;
                return (
                  <button
                    key={s.key} type="button" onClick={() => toggleSport(s.key)}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all"
                    style={
                      selected
                        ? { backgroundColor: s.color, color: "white", borderColor: s.color }
                        : { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }
                    }
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} /> {s.label}
                  </button>
                );
              })}
            </div>

            {form.sport_secondari.length > 0 && (
              <div>
                <label className="label-caps mb-2 block text-muted-foreground">Sport principale</label>
                <div className="flex flex-wrap gap-2">
                  {form.sport_secondari.map((k) => {
                    const s = SPORTS.find((x) => x.key === k)!;
                    const Icon = s.icon;
                    const isPrimary = form.sport_primario === k;
                    return (
                      <button
                        key={k} type="button" onClick={() => update("sport_primario", k)}
                        className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all"
                        style={
                          isPrimary
                            ? { borderColor: s.color, backgroundColor: "var(--color-surface)", color: "var(--color-foreground)" }
                            : { borderColor: "transparent", backgroundColor: "var(--color-muted)", color: "var(--color-muted-foreground)" }
                        }
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} /> {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl">Il tuo obiettivo</h1>
              <p className="mt-1 text-sm text-muted-foreground">Cosa vuoi raggiungere con FitCoach?</p>
            </div>

            <div className="space-y-3">
              {OBIETTIVI.map((o) => {
                const selected = form.obiettivo_tipo === o.key;
                const Icon = o.icon;
                return (
                  <button
                    key={o.key} type="button" onClick={() => update("obiettivo_tipo", o.key)}
                    className="flex w-full items-start gap-4 rounded-xl border-2 bg-surface p-4 text-left transition-all"
                    style={{ borderColor: selected ? "var(--color-accent)" : "var(--color-border)" }}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: selected ? "var(--color-accent)" : "var(--color-muted)", color: selected ? "var(--color-accent-foreground)" : "var(--color-foreground)" }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold">{o.titolo}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{o.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {form.obiettivo_tipo === "gara" && (
              <Field label="Quale gara?">
                <input
                  type="text" value={form.obiettivo_dettaglio}
                  onChange={(e) => update("obiettivo_dettaglio", e.target.value)}
                  className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  placeholder="es. Hyrox Milano, 15 marzo"
                />
              </Field>
            )}
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl">La tua disponibilità</h1>
              <p className="mt-1 text-sm text-muted-foreground">Quanto puoi allenarti?</p>
            </div>

            <div className="rounded-xl bg-surface p-6 shadow-card">
              <div className="flex items-baseline justify-between">
                <span className="label-caps text-muted-foreground">Giorni a settimana</span>
                <span className="text-4xl font-bold text-accent">{form.giorni_count}</span>
              </div>
              <input
                type="range" min={2} max={7} value={form.giorni_count}
                onChange={(e) => update("giorni_count", Number(e.target.value))}
                className="mt-3 w-full accent-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="label-caps mb-2 block text-muted-foreground">Quali giorni?</label>
              <div className="flex flex-wrap gap-2">
                {GIORNI.map((g) => {
                  const selected = form.giorni_disponibili.includes(g.key);
                  return (
                    <button
                      key={g.key} type="button" onClick={() => toggleGiorno(g.key)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-all"
                      style={
                        selected
                          ? { backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)", borderColor: "var(--color-primary)" }
                          : { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }
                      }
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Limitazioni fisiche o infortuni recenti (opzionale)">
              <textarea
                value={form.limitazioni_fisiche}
                onChange={(e) => update("limitazioni_fisiche", e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="es. fastidio al ginocchio destro"
              />
            </Field>
          </section>
        )}

        {step === 5 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl">Tutto pronto</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Da ora il Coach AI conoscerà i tuoi dati e ti darà consigli su misura.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6">
              <p className="label-caps text-muted-foreground">Strava</p>
              <p className="mt-2 text-sm text-muted-foreground">
                La connessione a Strava sarà attiva a breve. Per ora puoi
                aggiungere le tue attività manualmente in pochi secondi.
              </p>
            </div>

            <div className="rounded-xl bg-[oklch(0.97_0.02_175)] p-5 text-sm">
              <div className="font-semibold text-foreground">Benvenuto, {form.nome.split(" ")[0] || "atleta"}.</div>
              <p className="mt-1 text-muted-foreground">
                Hai impostato {form.giorni_count} giorni di allenamento per
                {" "}{OBIETTIVI.find((o) => o.key === form.obiettivo_tipo)?.titolo.toLowerCase()}.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Indietro
            </button>
          ) : (
            <Link to="/auth" className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              Esci
            </Link>
          )}

          {step < TOTAL_STEPS ? (
            <button
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Avanti
            </button>
          ) : (
            <button
              disabled={saving}
              onClick={handleComplete}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Salvo…" : "Inizia ad allenarti"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-caps mb-1.5 block text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
