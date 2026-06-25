import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  ChevronRight,
  Flame,
  Play,
  Activity,
  MessageCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SPORTS, sportInfo, type SportKey } from "@/lib/sports";
import { AddActivityDialog } from "@/components/AddActivityDialog";
import { toast } from "sonner";
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

const WEEKLY_TARGET_HOURS = 6;

function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [, setAnalytics] = useState<AttivitaForAnalytics[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [activeSport, setActiveSport] = useState<SportKey>("corsa");
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
        .limit(30),
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

  const settimana = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return attivita.filter((a) => new Date(a.data).getTime() >= since);
  }, [attivita]);

  const oreSettimana = useMemo(
    () => settimana.reduce((s, a) => s + (a.durata_min ?? 0), 0) / 60,
    [settimana],
  );
  const kmSettimana = useMemo(
    () => settimana.reduce((s, a) => s + (a.distanza_km ?? 0), 0),
    [settimana],
  );

  const streak = useMemo(() => computeStreak(attivita), [attivita]);

  const sport = sportInfo(activeSport);
  const nextWorkout = mockNextWorkout(activeSport);

  return (
    <AppShell>
      {/* ─── Greeting ───────────────────────────────────── */}
      <header className="pt-7 pb-4 animate-fade-up">
        <p className="label-caps" style={{ color: "var(--color-accent)" }}>
          {getGreeting()}
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-wider uppercase">
          {profile?.nome?.split(" ")[0] ?? "Atleta"}
        </h1>
      </header>

      {/* ─── Sport switcher ─────────────────────────────── */}
      <div
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-2 md:mx-0 md:px-0"
        style={{ animation: "fade-up 0.4s 0.05s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {SPORTS.map((s) => {
          const active = s.key === activeSport;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSport(s.key)}
              className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-200"
              style={{
                background: active ? s.color : "#111111",
                border: active ? `1px solid ${s.color}` : "1px solid #2A2A2A",
                boxShadow: active ? `0 0 20px ${s.color}66` : "none",
              }}
            >
              <Icon size={15} strokeWidth={2.5} color="white" />
              <span
                className="font-display text-sm tracking-widest uppercase"
                style={{ color: active ? "white" : "#8E8E93" }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-3 pb-10" style={{ animation: "fade-up 0.45s 0.08s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* ─── Hero workout card ──────────────────────── */}
          <div className="md:col-span-2 lg:col-span-3">
            <HeroWorkoutCard
              sportColor={sport.color}
              sportLabel={sport.label}
              workout={nextWorkout}
            />
          </div>

          {/* ─── Weekly ring + streak ───────────────────── */}
          <div className="grid grid-cols-5 gap-3 md:col-span-2 lg:col-span-2">
            <div className="col-span-3 rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="label-caps" style={mutedText}>Volume settimana</p>
                  <p className="mt-2 metric-num text-3xl">
                    {oreSettimana.toFixed(1)}<span className="ml-1 text-lg" style={mutedText}>h</span>
                  </p>
                  <p className="mt-1 text-xs" style={mutedText}>
                    target {WEEKLY_TARGET_HOURS}h
                  </p>
                </div>
                <WeeklyRing value={oreSettimana} target={WEEKLY_TARGET_HOURS} color={sport.color} />
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-[#1F1F1F] pt-3">
                <MiniStat label="sessioni" value={String(settimana.length)} />
                <span className="h-7 w-px bg-[#1F1F1F]" />
                <MiniStat label="km" value={kmSettimana ? kmSettimana.toFixed(1) : "—"} />
              </div>
            </div>

            <div
              className="col-span-2 flex flex-col justify-between rounded-2xl p-5"
              style={{
                background: streak > 0
                  ? "linear-gradient(155deg, #1A0F08 0%, #111111 100%)"
                  : "#111111",
                border: streak > 0 ? "1px solid #3A1F0A" : "1px solid #2A2A2A",
              }}
            >
              <div className="flex items-center gap-1.5">
                <Flame
                  size={16}
                  strokeWidth={2.5}
                  style={{ color: streak > 0 ? "var(--color-accent-2)" : "#5A5A60" }}
                  fill={streak > 0 ? "var(--color-accent-2)" : "none"}
                />
                <span className="label-caps" style={mutedText}>Streak</span>
              </div>
              <div>
                <p
                  className="metric-num text-4xl"
                  style={{ color: streak > 0 ? "#FFFFFF" : "#5A5A60" }}
                >
                  {streak}
                </p>
                <p className="mt-0.5 text-xs" style={mutedText}>
                  {streak === 1 ? "giorno" : "giorni"} attivi
                </p>
              </div>
            </div>
          </div>

          {/* ─── Coach CTA ──────────────────────────────── */}
          <Link
            to="/coach"
            className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 lg:col-span-1"
            style={{
              background: "linear-gradient(135deg, #1F0807 0%, #111111 100%)",
              border: "1px solid #3A1410",
            }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
              style={{
                background: "var(--gradient-hero)",
                boxShadow: "0 0 18px rgba(255, 59, 48, 0.4)",
              }}
            >
              <MessageCircle size={18} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="font-display text-base tracking-wider uppercase text-white">
                Parla con il Coach
              </p>
              <p className="text-xs" style={mutedText}>
                Piano · Recupero · Analisi · Nutrizione
              </p>
            </div>
            <ChevronRight
              size={18}
              style={{ color: "var(--color-accent)" }}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {/* ─── Upcoming sessions ──────────────────────── */}
          <section className="md:col-span-2 lg:col-span-3">
            <SectionLabel label="Prossime sessioni" />
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
              {mockUpcoming(activeSport).map((u, i) => (
                <UpcomingCard key={i} {...u} />
              ))}
            </div>
          </section>

          {/* ─── Recent activity ────────────────────────── */}
          <section className="md:col-span-2 lg:col-span-3">
            <SectionLabel label="Attività recenti" />
            {loading ? (
              <Skeleton h={180} />
            ) : attivita.length === 0 ? (
              <div className="rounded-2xl border border-dashed py-14 text-center" style={{ borderColor: "#2A2A2A" }}>
                <Activity size={22} className="mx-auto mb-3" style={{ color: "#5A5A60" }} />
                <p className="text-sm" style={mutedText}>Nessuna attività ancora</p>
                <button
                  onClick={() => setAddOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Plus size={13} strokeWidth={3} /> Aggiungi
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl" style={cardStyle}>
                {attivita.slice(0, 5).map((a, i) => {
                  const info = sportInfo(a.sport_type);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-4 px-4 py-3.5"
                      style={{ borderBottom: i < Math.min(4, attivita.length - 1) ? "1px solid #1A1A1A" : "none" }}
                    >
                      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: info.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base tracking-wide uppercase">{info.label}</p>
                        <p className="mt-0.5 metric-num text-xs" style={mutedText}>
                          {a.distanza_km ? `${a.distanza_km.toFixed(1)} KM · ` : ""}
                          {a.durata_min ?? "?"}′
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] uppercase tracking-wider" style={mutedText}>
                        {formatRelDay(a.data)}
                      </span>
                      {a.rpe ? (
                        <span
                          className="metric-num shrink-0 rounded-md px-2 py-1 text-xs"
                          style={{ background: "#1A1A1A", color: "#FFFFFF" }}
                        >
                          {a.rpe}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* FAB removed in favor of Inizia tab */}

      {userId && (
        <AddActivityDialog
          userId={userId}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={load}
        />
      )}
    </AppShell>
  );
}

/* ── Sub-components ───────────────────────────────────── */

const cardStyle = { background: "#111111", border: "1px solid #1F1F1F" } as const;
const mutedText = { color: "#8E8E93" } as const;

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="label-caps" style={{ color: "#8E8E93" }}>{label}</span>
      <div className="h-px flex-1" style={{ background: "#1A1A1A" }} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="metric-num text-lg leading-none">{value}</p>
      <p className="mt-1 label-caps" style={mutedText}>{label}</p>
    </div>
  );
}

function WeeklyRing({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = Math.min(100, (value / target) * 100);
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-20 w-20">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} stroke="#1F1F1F" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="metric-num text-base">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function HeroWorkoutCard({
  sportColor,
  sportLabel,
  workout,
}: {
  sportColor: string;
  sportLabel: string;
  workout: { tipo: string; durata: number; volume: string; rpe: number; note: string };
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6"
      style={{
        background: `linear-gradient(155deg, ${sportColor}22 0%, #111111 55%, #0F0F0F 100%)`,
        border: `1px solid ${sportColor}40`,
      }}
    >
      {/* glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full"
        style={{ background: sportColor, filter: "blur(80px)", opacity: 0.35 }}
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="label-caps" style={{ color: sportColor }}>Prossimo · {sportLabel}</span>
          <span className="label-caps rounded px-1.5 py-0.5" style={{ background: "#1A1A1A", color: "#FFFFFF" }}>
            AI
          </span>
        </div>

        <h2 className="mt-3 font-display text-4xl tracking-wider uppercase text-white">
          {workout.tipo}
        </h2>
        <p className="mt-1.5 text-sm" style={mutedText}>{workout.note}</p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="Durata" value={`${workout.durata}′`} />
          <Metric label="Volume" value={workout.volume} />
          <Metric label="Effort" value={`${workout.rpe}/10`} accent={sportColor} />
        </div>

        {/* Effort bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#1A1A1A" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${workout.rpe * 10}%`,
                background: `linear-gradient(90deg, ${sportColor}, var(--color-accent-2))`,
                boxShadow: `0 0 12px ${sportColor}`,
                transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </div>
        </div>

        <button
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-white animate-pulse-glow"
          style={{ background: sportColor }}
        >
          <Play size={18} strokeWidth={3} fill="white" />
          <span className="font-display text-lg tracking-[0.2em] uppercase">Start</span>
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid #1F1F1F" }}>
      <p className="label-caps" style={mutedText}>{label}</p>
      <p className="metric-num mt-1.5 text-xl" style={{ color: accent ?? "#FFFFFF" }}>{value}</p>
    </div>
  );
}

function UpcomingCard({
  giorno,
  sport,
  tipo,
  durata,
}: {
  giorno: string;
  sport: SportKey;
  tipo: string;
  durata: number;
}) {
  const info = sportInfo(sport);
  const Icon = info.icon;
  return (
    <div
      className="flex w-44 shrink-0 flex-col justify-between rounded-2xl p-4"
      style={{ background: "#111111", border: "1px solid #1F1F1F", minHeight: 120 }}
    >
      <div className="flex items-center justify-between">
        <span className="label-caps" style={mutedText}>{giorno}</span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ background: `${info.color}22`, border: `1px solid ${info.color}40` }}
        >
          <Icon size={12} strokeWidth={2.5} style={{ color: info.color }} />
        </span>
      </div>
      <div>
        <p className="font-display text-base tracking-wider uppercase">{tipo}</p>
        <p className="metric-num mt-1 text-xs" style={mutedText}>{durata}′</p>
      </div>
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return (
    <div
      className="rounded-2xl"
      style={{
        height: h,
        background: "linear-gradient(90deg, #111111 0%, #1A1A1A 50%, #111111 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.8s linear infinite",
      }}
    />
  );
}

/* ── Pure ─────────────────────────────────────────────── */

function computeStreak(attivita: Attivita[]): number {
  if (attivita.length === 0) return 0;
  const days = new Set(
    attivita.map((a) => new Date(a.data).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  // allow today OR yesterday as start
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
    } else if (i === 0) {
      // today missing → check yesterday
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
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
  if (h < 5) return "Notte fonda";
  if (h < 12) return "Buongiorno";
  if (h < 17) return "Buon pomeriggio";
  if (h < 21) return "Buona sera";
  return "Buona notte";
}

function mockNextWorkout(sport: SportKey) {
  const map: Record<SportKey, { tipo: string; durata: number; volume: string; rpe: number; note: string }> = {
    corsa: { tipo: "Interval 6×800", durata: 55, volume: "9 KM", rpe: 8, note: "Recupero 90″ tra ripetute · pace 3:55" },
    ciclismo: { tipo: "Soglia 2×20′", durata: 90, volume: "45 KM", rpe: 7, note: "FTP 92% · cadenza 90 rpm" },
    nuoto: { tipo: "Endurance Set", durata: 60, volume: "2.5 KM", rpe: 6, note: "10×100 stile · 20″ recupero" },
    palestra: { tipo: "Lower Power", durata: 65, volume: "5×5", rpe: 8, note: "Squat 80% 1RM · panca 75%" },
    trail: { tipo: "Salita lunga", durata: 110, volume: "16 KM · D+750", rpe: 7, note: "Cammina sopra 12% pendenza" },
    hiit: { tipo: "AMRAP 20′", durata: 30, volume: "5 round", rpe: 9, note: "All out · 1′ rec tra blocchi" },
    yoga: { tipo: "Mobility Flow", durata: 40, volume: "Full body", rpe: 3, note: "Focus anche e t-spine" },
    altro: { tipo: "Sessione libera", durata: 45, volume: "—", rpe: 6, note: "Scegli tu intensità e durata" },
  };
  return map[sport];
}

function mockUpcoming(sport: SportKey) {
  void sport;
  return [
    { giorno: "Mar", sport: "corsa" as SportKey, tipo: "Recovery", durata: 35 },
    { giorno: "Mer", sport: "palestra" as SportKey, tipo: "Upper", durata: 50 },
    { giorno: "Gio", sport: "ciclismo" as SportKey, tipo: "Endurance", durata: 75 },
    { giorno: "Sab", sport: "trail" as SportKey, tipo: "Long Run", durata: 100 },
  ];
}

// Quiet unused-import warnings (referenced in JSX in alternate states)
void Target; void TrendingUp;
