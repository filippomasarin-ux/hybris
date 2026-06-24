import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Plus, ChevronRight, Zap } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
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
    const { error } = await supabase
      .from("attivita")
      .update({ rpe: editRpe.value })
      .eq("id", editRpe.id);
    if (error) { toast.error("Errore"); return; }
    toast.success("RPE salvato");
    setEditRpe(null);
    load();
  };

  return (
    <AppShell>
      {/* ── Header ─────────────────────────────────────── */}
      <header className="pt-7 pb-5" style={{ animation: "fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--color-accent)" }}>
              {getGreeting()}
            </p>
            <h1 className="mt-0.5 text-3xl font-black tracking-tight">
              {profile?.nome?.split(" ")[0] ?? "Atleta"}
            </h1>
          </div>

          {/* Form status pill */}
          {!loading && (
            <div
              className="mt-1 flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: `color-mix(in oklab, ${stato.color} 12%, oklch(0.115 0.025 295))`, border: `1px solid color-mix(in oklab, ${stato.color} 25%, transparent)` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: stato.color }} />
              <span className="text-xs font-semibold" style={{ color: stato.color }}>{stato.label}</span>
            </div>
          )}
        </div>

        {/* Quick stats row */}
        {!loading && (
          <div
            className="mt-4 flex items-center gap-0 divide-x rounded-xl px-1 py-3"
            style={{
              background: "oklch(0.115 0.025 295)",
              border: "1px solid oklch(1 0 0 / 6%)",
              divideColor: "oklch(1 0 0 / 6%)",
            }}
          >
            <QuickStat value={String(settimana.length)} label="sessioni" />
            <QuickStat value={kmSettimana ? `${kmSettimana.toFixed(1)}` : "—"} label="km" />
            <QuickStat value={attivita[0] ? formatRelDay(attivita[0].data) : "—"} label="ultima" />
          </div>
        )}
      </header>

      <div style={{ animation: "fade-up 0.4s 0.08s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* ── Piano settimana (hero) ──────────────────── */}
        <SectionLabel label="Questa settimana" />
        {loading
          ? <Skeleton h={300} />
          : <WeeklyPlanCard attivita={analytics ?? []} />
        }

        {/* ── Attività recenti ───────────────────────── */}
        <SectionLabel label="Attività recenti" className="mt-8" />
        {loading ? (
          <Skeleton h={180} />
        ) : attivita.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-12 text-center"
            style={{ borderColor: "oklch(1 0 0 / 8%)" }}
          >
            <p className="text-sm" style={{ color: "oklch(0.5 0.02 290)" }}>Nessuna attività ancora.</p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold tracking-wide text-white"
              style={{ background: "var(--color-accent)" }}
            >
              <Plus size={13} /> Prima attività
            </button>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid oklch(1 0 0 / 6%)" }}
          >
            {attivita.slice(0, 5).map((a, i) => {
              const info = sportInfo(a.sport_type);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors"
                  style={{
                    background: i % 2 === 0 ? "oklch(0.115 0.025 295)" : "oklch(0.105 0.022 295)",
                    borderBottom: i < 4 ? "1px solid oklch(1 0 0 / 5%)" : "none",
                  }}
                >
                  {/* Sport color bar */}
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ background: info.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{info.label}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "oklch(0.52 0.02 290)" }}>
                      {a.distanza_km ? `${a.distanza_km.toFixed(1)} km · ` : ""}
                      {a.durata_min ?? "?"} min
                    </p>
                  </div>
                  <span className="shrink-0 text-xs" style={{ color: "oklch(0.48 0.02 290)" }}>
                    {formatRelDay(a.data)}
                  </span>
                  {a.rpe ? (
                    <span
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums"
                      style={{ background: "oklch(0.08 0.018 295)", color: "oklch(0.8 0.02 290)" }}
                    >
                      RPE {a.rpe}
                    </span>
                  ) : (
                    <button
                      onClick={() => setEditRpe({ id: a.id, value: 6 })}
                      className="shrink-0 rounded-lg border px-2 py-1 text-xs font-medium transition-colors"
                      style={{ borderColor: "oklch(1 0 0 / 8%)", color: "oklch(0.5 0.02 290)" }}
                    >
                      + RPE
                    </button>
                  )}
                </div>
              );
            })}
            {attivita.length > 5 && (
              <div
                className="flex items-center justify-center gap-1 py-3 text-xs font-medium"
                style={{ color: "oklch(0.5 0.02 290)", background: "oklch(0.105 0.022 295)" }}
              >
                +{attivita.length - 5} altre attività <ChevronRight size={12} />
              </div>
            )}
          </div>
        )}

        {/* ── Coach CTA ─────────────────────────────── */}
        <a
          href="/coach"
          className="group mt-3 flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, oklch(0.20 0.08 295) 0%, oklch(0.14 0.05 295) 100%)",
            border: "1px solid oklch(0.66 0.28 295 / 20%)",
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "oklch(0.66 0.28 295)",
              boxShadow: "0 0 16px oklch(0.66 0.28 295 / 40%)",
            }}
          >
            <Zap size={16} color="white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Parla con il Coach AI</p>
            <p className="text-xs" style={{ color: "oklch(0.58 0.03 290)" }}>
              Piano · Recupero · Nutrizione · Analisi
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "var(--color-accent)" }} className="transition-transform group-hover:translate-x-0.5" />
        </a>

        {/* ── Analytics ────────────────────────────── */}
        <SectionLabel label="Analytics" className="mt-8" />
        {loading || analytics === null ? (
          <div className="space-y-3">
            <Skeleton h={200} />
            <Skeleton h={180} />
            <Skeleton h={160} />
          </div>
        ) : (
          <div className="space-y-3">
            <TrainingLoadCard attivita={analytics} />
            <VolumeCard attivita={analytics} />
            <AerobicoCard attivita={analytics} />
          </div>
        )}

        <div className="h-10" />
      </div>

      {/* ── FAB ────────────────────────────────────── */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-95 md:bottom-8"
        style={{
          background: "oklch(0.66 0.28 295)",
          boxShadow: "0 0 0 1px oklch(0.66 0.28 295 / 35%), 0 6px 24px oklch(0.66 0.28 295 / 45%)",
        }}
        aria-label="Aggiungi attività"
      >
        <Plus size={22} color="white" strokeWidth={2.5} />
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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ background: "oklch(0 0 0 / 60%)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditRpe(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl p-6 sm:rounded-2xl"
            style={{ background: "oklch(0.12 0.025 295)", border: "1px solid oklch(1 0 0 / 8%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.5 0.02 290)" }}>
              Sforzo percepito
            </p>
            <div className="my-5 text-center">
              <span className="text-7xl font-black tabular-nums" style={{ color: "var(--color-accent)" }}>
                {editRpe.value}
              </span>
              <span className="text-2xl font-black" style={{ color: "oklch(0.4 0.02 290)" }}>/10</span>
            </div>
            <input
              type="range" min={1} max={10} value={editRpe.value}
              onChange={(e) => setEditRpe({ ...editRpe, value: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="mt-1 flex justify-between text-[11px]" style={{ color: "oklch(0.45 0.02 290)" }}>
              <span>Facile</span><span>Massimale</span>
            </div>
            <button
              onClick={saveRpe}
              className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold tracking-wide text-white"
              style={{ background: "oklch(0.66 0.28 295)" }}
            >
              Salva
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function SectionLabel({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`mb-3 flex items-center gap-3 ${className}`}>
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "oklch(0.48 0.02 290)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "oklch(1 0 0 / 5%)" }} />
    </div>
  );
}

function QuickStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 px-3">
      <span className="text-xl font-black tabular-nums tracking-tight">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "oklch(0.48 0.02 290)" }}>
        {label}
      </span>
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return (
    <div
      className="rounded-2xl"
      style={{
        height: h,
        background: "linear-gradient(90deg, oklch(0.115 0.025 295) 0%, oklch(0.135 0.028 295) 50%, oklch(0.115 0.025 295) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.8s linear infinite",
      }}
    />
  );
}

/* ── Pure functions ───────────────────────────────────── */

function computeStato(attivita: Attivita[]) {
  if (attivita.length === 0) return { color: "var(--color-accent)", label: "Pronto" };
  const now = Date.now();
  const oreUltima = (now - new Date(attivita[0].data).getTime()) / 3600000;
  const ultimi4gg = attivita.filter((a) => (now - new Date(a.data).getTime()) / 86400000 <= 4);
  if ((oreUltima < 24 && (attivita[0].rpe ?? 0) >= 8) || ultimi4gg.length >= 3)
    return { color: "#ef4444", label: "Affaticato" };
  if (oreUltima >= 48 && (attivita[0].rpe ?? 6) <= 6)
    return { color: "#10b981", label: "Fresco" };
  return { color: "#eab308", label: "In forma" };
}

function formatRelDay(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Oggi";
  if (days === 1) return "Ieri";
  if (days < 7) return `${days}g fa`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Notte fonda";
  if (h < 12) return "Buongiorno";
  if (h < 17) return "Buon pomeriggio";
  if (h < 21) return "Buona sera";
  return "Buona notte";
}
