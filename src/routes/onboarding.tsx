// @ts-nocheck
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPORTS, GIORNI, OBIETTIVI, type SportKey } from "@/lib/sports";
import { Logo } from "@/components/Logo";
import { formatObiettivo, obiettivoDefault, type ObiettivoVolume, type VolumeTarget } from "@/lib/obiettivi-settimanali";

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
  obiettivi: string[];
  obiettivo_dettaglio: string;
  pesi: Record<string, number>;
  volume_target: VolumeTarget;
  giorni_disponibili: string[];
  giorni_count: number;
  limitazioni_fisiche: string;
};

const TOTAL_STEPS = 6;

function normalizeWeights(keys: string[], pesi: Record<string, number>): Record<string, number> {
  if (keys.length === 0) return {};
  if (keys.length === 1) return { [keys[0]]: 100 };
  const total = keys.reduce((s, k) => s + (pesi[k] ?? 50), 0);
  if (total === 0) return Object.fromEntries(keys.map((k) => [k, Math.round(100 / keys.length)]));
  return Object.fromEntries(keys.map((k) => [k, Math.round(((pesi[k] ?? 50) / total) * 100)]));
}

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
    obiettivi: [],
    obiettivo_dettaglio: "",
    pesi: {},
    volume_target: {},
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
      const volume_target = { ...f.volume_target };
      if (has) delete volume_target[s];
      else volume_target[s] = obiettivoDefault(s);
      return { ...f, sport_secondari: next, sport_primario: primario, volume_target };
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

  const toggleObiettivo = (key: string) => {
    setForm((f) => {
      const has = f.obiettivi.includes(key);
      const next = has ? f.obiettivi.filter((x) => x !== key) : [...f.obiettivi, key];
      const pesi = { ...f.pesi };
      if (!has) pesi[key] = 50;
      else delete pesi[key];
      return { ...f, obiettivi: next, pesi };
    });
  };

  const updatePeso = (key: string, value: number) => {
    setForm((f) => ({ ...f, pesi: { ...f.pesi, [key]: value } }));
  };

  const updateVolume = (sport: string, patch: Partial<ObiettivoVolume>) => {
    setForm((f) => ({
      ...f,
      volume_target: {
        ...f.volume_target,
        [sport]: { ...(f.volume_target[sport] ?? obiettivoDefault(sport)), ...patch },
      },
    }));
  };

  const canNext = (() => {
    if (step === 1) return form.nome.trim().length > 0 && Number(form.eta) > 0;
    if (step === 2) return form.sport_secondari.length > 0 && form.sport_primario !== "";
    if (step === 3) {
      if (form.obiettivi.length === 0) return false;
      if (form.obiettivi.includes("gara")) return form.obiettivo_dettaglio.trim().length > 0;
      return true;
    }
    if (step === 4) return true;
    if (step === 5) return form.giorni_disponibili.length > 0;
    return true;
  })();

  const handleComplete = async () => {
    if (!userId) return;
    setSaving(true);
    const normalized = normalizeWeights(form.obiettivi, form.pesi);
    const obiettivi_pesati = form.obiettivi.map((k) => ({ key: k, peso: normalized[k] ?? 0 }));
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: form.nome,
        eta: Number(form.eta) || null,
        anni_esperienza: form.anni_esperienza,
        sport_primario: form.sport_primario,
        sport_secondari: form.sport_secondari,
        obiettivo_tipo: form.obiettivi[0] ?? null,
        obiettivi: form.obiettivi,
        obiettivo_dettaglio: form.obiettivo_dettaglio || null,
        volume_target: form.volume_target,
        obiettivi_pesati,
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

  const normalized = normalizeWeights(form.obiettivi, form.pesi);

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
              <h1 className="text-2xl">I tuoi obiettivi</h1>
              <p className="mt-1 text-sm text-muted-foreground">Cosa vuoi raggiungere? Puoi selezionarne più di uno.</p>
            </div>

            <div className="space-y-3">
              {OBIETTIVI.map((o) => {
                const selected = form.obiettivi.includes(o.key);
                const Icon = o.icon;
                return (
                  <button
                    key={o.key} type="button" onClick={() => toggleObiettivo(o.key)}
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
                    {selected && (
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-accent-foreground" style={{ backgroundColor: "var(--color-accent)" }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {form.obiettivi.includes("gara") && (
              <Field label="Quale gara?">
                <input
                  type="text" value={form.obiettivo_dettaglio}
                  onChange={(e) => update("obiettivo_dettaglio", e.target.value)}
                  className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  placeholder="es. Hyrox Milano, 15 marzo"
                />
              </Field>
            )}

            {form.obiettivi.length > 1 && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="label-caps mb-1 text-muted-foreground">Bilanciamento del focus</p>
                <p className="mb-4 text-xs text-muted-foreground">Distribuisci la tua energia tra gli obiettivi.</p>
                <div className="space-y-4">
                  {form.obiettivi.map((key) => {
                    const o = OBIETTIVI.find((x) => x.key === key)!;
                    const Icon = o.icon;
                    const pct = normalized[key] ?? 0;
                    return (
                      <div key={key}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: "var(--color-accent)" }} strokeWidth={1.8} />
                            <span className="text-sm font-medium">{o.titolo}</span>
                          </div>
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <input
                          type="range" min={10} max={90} step={5}
                          value={form.pesi[key] ?? 50}
                          onChange={(e) => updatePeso(key, Number(e.target.value))}
                          className="w-full accent-[var(--color-accent)]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl">Volume settimanale</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Quanto tempo vuoi dedicare a ogni sport? Il Coach AI bilancerà il piano in base a questi target.
              </p>
            </div>

            <div className="space-y-4">
              {form.sport_secondari.map((k) => {
                const s = SPORTS.find((x) => x.key === k)!;
                const Icon = s.icon;
                const obiettivo = form.volume_target[k] ?? obiettivoDefault(k);
                const isKm = obiettivo.unita === "km";
                const range = isKm ? { min: 5, max: 150, step: 5 } : { min: 0.5, max: 15, step: 0.5 };
                return (
                  <div key={k} className="rounded-xl border border-border bg-surface p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `color-mix(in oklch, ${s.color} 15%, transparent)`, color: s.color }}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="font-semibold">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black tabular-nums tracking-tight" style={{ color: s.color }}>
                          {formatObiettivo(obiettivo)}
                        </span>
                        <div className="flex overflow-hidden rounded-full border border-border text-[10px] font-semibold uppercase">
                          {(["km", "ore"] as const).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => updateVolume(k, { unita: u, valore: u === "km" ? 20 : 2 })}
                              className="px-2 py-1"
                              style={
                                obiettivo.unita === u
                                  ? { background: s.color, color: "#fff" }
                                  : { color: "var(--color-muted-foreground)" }
                              }
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <input
                      type="range" min={range.min} max={range.max} step={range.step}
                      value={obiettivo.valore}
                      onChange={(e) => updateVolume(k, { valore: Number(e.target.value) })}
                      className="w-full"
                      style={{ accentColor: s.color }}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {step === 5 && (
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

        {step === 6 && (
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

            <div className="rounded-xl bg-surface p-5 text-sm">
              <div className="font-semibold text-foreground">Benvenuto, {form.nome.split(" ")[0] || "atleta"}.</div>
              <div className="mt-3 space-y-1.5 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{form.sport_secondari.length}</span> sport · {form.giorni_count} giorni/settimana
                </p>
                <p>
                  {form.obiettivi.length === 1
                    ? OBIETTIVI.find((o) => o.key === form.obiettivi[0])?.titolo
                    : `${form.obiettivi.length} obiettivi bilanciati`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.sport_secondari.map((k) => {
                    const s = SPORTS.find((x) => x.key === k)!;
                    const obiettivo = form.volume_target[k] ?? obiettivoDefault(k);
                    return (
                      <span
                        key={k}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `color-mix(in oklch, ${s.color} 14%, transparent)`, color: s.color }}
                      >
                        {s.label} · {formatObiettivo(obiettivo)}/sett
                      </span>
                    );
                  })}
                </div>
              </div>
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
