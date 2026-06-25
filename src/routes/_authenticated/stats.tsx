import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, Trophy, Award } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TrainingLoadCard } from "@/components/TrainingLoadCard";
import { VolumeCard } from "@/components/VolumeCard";
import { AerobicoCard } from "@/components/AerobicoCard";
import { getAttivitaAnalytics } from "@/lib/attivita.functions";
import type { AttivitaForAnalytics } from "@/lib/analytics";
import { SPORTS, sportInfo } from "@/lib/sports";

export const Route = createFileRoute("/_authenticated/stats")({
  ssr: false,
  component: StatsPage,
});

function StatsPage() {
  const [analytics, setAnalytics] = useState<AttivitaForAnalytics[] | null>(null);
  const fetchAnalytics = useServerFn(getAttivitaAnalytics);

  useEffect(() => {
    fetchAnalytics()
      .then((d) => setAnalytics(d as AttivitaForAnalytics[]))
      .catch(() => setAnalytics([]));
  }, [fetchAnalytics]);

  const totals = useMemo(() => {
    const list = analytics ?? [];
    const tot = list.reduce(
      (acc, a) => {
        acc.km += a.distanza_km ?? 0;
        acc.min += a.durata_min ?? 0;
        acc.n += 1;
        return acc;
      },
      { km: 0, min: 0, n: 0 },
    );
    return tot;
  }, [analytics]);

  const perSport = useMemo(() => {
    const list = analytics ?? [];
    const map = new Map<string, number>();
    for (const a of list) {
      if (!a.sport_type) continue;
      map.set(a.sport_type, (map.get(a.sport_type) ?? 0) + (a.durata_min ?? 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [analytics]);

  return (
    <AppShell>
      <header className="pt-7 pb-5 animate-fade-up">
        <p className="label-caps" style={{ color: "var(--color-accent)" }}>Performance</p>
        <h1 className="mt-1 font-display text-4xl tracking-wider uppercase">Stats</h1>
      </header>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-3 pb-5 animate-fade-up">
        <TotalCard label="Sessioni" value={String(totals.n)} icon={<TrendingUp size={14} />} />
        <TotalCard label="Ore tot" value={(totals.min / 60).toFixed(0)} icon={<Trophy size={14} />} />
        <TotalCard label="KM tot" value={totals.km.toFixed(0)} icon={<Award size={14} />} />
      </div>

      {/* Per-sport split */}
      {perSport.length > 0 && (
        <section className="pb-5">
          <SectionLabel label="Split per sport" />
          <div className="rounded-2xl p-5" style={{ background: "#111111", border: "1px solid #1F1F1F" }}>
            <div className="space-y-3">
              {perSport.map(([s, min]) => {
                const info = sportInfo(s);
                const pct = (min / Math.max(1, totals.min)) * 100;
                return (
                  <div key={s}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-display tracking-wider uppercase">{info.label}</span>
                      <span className="metric-num" style={{ color: "#8E8E93" }}>
                        {(min / 60).toFixed(1)}h · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full" style={{ background: "#1A1A1A" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: info.color,
                          boxShadow: `0 0 8px ${info.color}66`,
                          transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Analytics cards */}
      {analytics === null ? (
        <Skeleton h={500} />
      ) : (
        <div className="space-y-3 pb-10">
          <TrainingLoadCard attivita={analytics} />
          <VolumeCard attivita={analytics} />
          <AerobicoCard attivita={analytics} />
        </div>
      )}

      {/* Reference to SPORTS to keep type stable */}
      <div className="hidden">{SPORTS.length}</div>
    </AppShell>
  );
}

function TotalCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111111", border: "1px solid #1F1F1F" }}>
      <div className="flex items-center gap-1.5" style={{ color: "#8E8E93" }}>
        {icon}
        <span className="label-caps">{label}</span>
      </div>
      <p className="metric-num mt-2 text-2xl">{value}</p>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="label-caps" style={{ color: "#8E8E93" }}>{label}</span>
      <div className="h-px flex-1" style={{ background: "#1A1A1A" }} />
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
