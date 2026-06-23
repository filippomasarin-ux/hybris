import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SportDot } from "@/components/SportChip";
import { sportInfo } from "@/lib/sports";
import { AddActivityDialog } from "@/components/AddActivityDialog";
import { toast } from "sonner";
import { WeeklyPlanCard } from "@/components/WeeklyPlanCard";
import { TrainingLoadCard } from "@/components/TrainingLoadCard";
import { VolumeCard } from "@/components/VolumeCard";
import { AerobicoCard } from "@/components/AerobicoCard";
import { getAttivitaAnalytics } from "@/lib/attivita.functions";
import type { AttivitaForAnalytics } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/home")({
  ssr: false,
  component: HomePage,
});

type Attivita = {
  id: string;
  sport_type: string | null;
  data: string;
  durata_min: number | null;
  distanza_km: number | null;
  rpe: number | null;
};

type Profile = { nome: string | null };

function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [analytics, setAnalytics] = useState<AttivitaForAnalytics[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editRpe, setEditRpe] = useState<{ id: string; value: number } | null>(null);
  const fetchAnalytics = useServerFn(getAttivitaAnalytics);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUserId(auth.user.id);
    const [{ data: p }, { data: a }, an] = await Promise.all([
      supabase.from("profiles").select("nome").eq("id", auth.user.id).maybeSingle(),
      supabase
        .from("attivita")
        .select("id, sport_type, data, durata_min, distanza_km, rpe")
        .eq("user_id", auth.user.id)
        .order("data", { ascending: false })
        .limit(20),
      fetchAnalytics().catch(() => [] as AttivitaForAnalytics[]),
    ]);
    setProfile(p);
    setAttivita(a ?? []);
    setAnalytics(an as AttivitaForAnalytics[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stato = useMemo(() => computeStato(attivita), [attivita]);
  const settimana = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return attivita.filter((a) => new Date(a.data).getTime() >= since);
  }, [attivita]);
  const kmSettimana = settimana.reduce((s, a) => s + (a.distanza_km ?? 0), 0);

  const saveRpe = async () => {
    if (!editRpe) return;
    const { error } = await supabase.from("attivita").update({ rpe: editRpe.value }).eq("id", editRpe.id);
    if (error) {
      toast.error("Errore");
      return;
    }
    toast.success("RPE salvato");
    setEditRpe(null);
    load();
  };

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <p className="label-caps text-muted-foreground">Ciao</p>
        <h1 className="text-2xl">{profile?.nome?.split(" ")[0] ?? "Atleta"}</h1>
      </header>

      <div className="space-y-4 px-5 pb-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton h={160} /> <Skeleton h={120} /> <Skeleton h={240} />
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-caps text-muted-foreground">Come stai oggi</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stato.color }}
                    />
                    <span className="text-xl font-semibold">{stato.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{stato.message}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <Stat label="Attività" value={`${settimana.length}`} sub="questa settimana" />
                <Stat label="Km totali" value={kmSettimana ? kmSettimana.toFixed(1) : "—"} sub="settimanali" />
                <Stat label="Ultima" value={attivita[0] ? formatRelDay(attivita[0].data) : "—"} sub="attività" />
              </div>
            </section>

            {/* Analytics avanzate */}
            {analytics === null ? (
              <div className="space-y-4">
                <Skeleton h={220} /> <Skeleton h={240} /> <Skeleton h={260} />
              </div>
            ) : (
              <>
                <TrainingLoadCard attivita={analytics} />
                <VolumeCard attivita={analytics} />
                <AerobicoCard attivita={analytics} />
              </>
            )}

            <section className="rounded-2xl bg-surface p-5 shadow-card">

              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Ultime attività</h2>
                {attivita.length > 3 && (
                  <span className="text-xs text-muted-foreground">{attivita.length} totali</span>
                )}
              </div>

              {attivita.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-10 text-center">
                  <p className="text-sm text-muted-foreground">Nessuna attività ancora.</p>
                  <button
                    onClick={() => setAddOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" /> Aggiungi la prima
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {attivita.slice(0, 5).map((a) => {
                    const info = sportInfo(a.sport_type);
                    return (
                      <li key={a.id} className="flex items-center gap-3 py-3">
                        <SportDot sport={a.sport_type ?? undefined} size={10} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium">{info.label}</span>
                            <span className="text-xs text-muted-foreground">{formatRelDay(a.data)}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {a.distanza_km ? `${a.distanza_km.toFixed(1)} km · ` : ""}{a.durata_min ?? "?"} min
                          </div>
                        </div>
                        {a.rpe ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                            RPE {a.rpe}
                          </span>
                        ) : (
                          <button
                            onClick={() => setEditRpe({ id: a.id, value: 6 })}
                            className="rounded-full border border-input px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                          >
                            + RPE
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <WeeklyPlanCard />


            <a
              href="/coach"
              className="block rounded-2xl border border-border bg-surface p-5 transition-all hover:border-ring hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-accent-foreground"
                  style={{ backgroundColor: "var(--color-accent)" }}
                >
                  <CoachSparkle />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Chiedi al Coach AI</p>
                  <p className="text-xs text-muted-foreground">Piani, recupero, nutrizione, analisi</p>
                </div>
                <span className="text-muted-foreground">→</span>
              </div>
            </a>
          </>
        )}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-8"
        aria-label="Aggiungi attività"
      >
        <Plus className="h-6 w-6" />
      </button>

      {userId && (
        <AddActivityDialog
          userId={userId}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={load}
        />
      )}

      {editRpe && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditRpe(null)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Quanto è stata dura?</h3>
            <div className="my-5 rounded-xl bg-muted p-4">
              <div className="text-center text-5xl font-bold text-accent">{editRpe.value}</div>
              <input
                type="range" min={1} max={10} value={editRpe.value}
                onChange={(e) => setEditRpe({ ...editRpe, value: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--color-accent)]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Facile</span><span>Massimale</span>
              </div>
            </div>
            <button onClick={saveRpe} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
              Salva
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return <div className="animate-pulse rounded-2xl bg-muted" style={{ height: h }} />;
}

function computeStato(attivita: Attivita[]) {
  if (attivita.length === 0) {
    return { color: "var(--color-accent)", label: "Pronto", message: "Aggiungi la tua prima attività per ricevere consigli personalizzati." };
  }
  const now = Date.now();
  const ultima = attivita[0];
  const oreUltima = (now - new Date(ultima.data).getTime()) / 3600000;
  const ultimi4gg = attivita.filter((a) => (now - new Date(a.data).getTime()) / 86400000 <= 4);

  if ((oreUltima < 24 && (ultima.rpe ?? 0) >= 8) || ultimi4gg.length >= 3) {
    return { color: "var(--color-destructive)", label: "Affaticato", message: "Hai accumulato carico. Privilegia recupero o sessioni leggere." };
  }
  if (oreUltima >= 48 && (ultima.rpe ?? 6) <= 6) {
    return { color: "var(--color-accent)", label: "Fresco", message: "Hai riposato — sei pronto per una sessione di qualità." };
  }
  return { color: "var(--color-warning)", label: "Normale", message: "Forma stabile, continua con il tuo piano." };
}

function CoachSparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l.8 2.4 2.2.6-2.2.6-.8 2.4-.8-2.4-2.2-.6 2.2-.6.8-2.4z" />
    </svg>
  );
}

function formatRelDay(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "Oggi";
  if (days === 1) return "Ieri";
  if (days < 7) return `${days}g fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
