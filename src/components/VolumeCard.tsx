import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { volumeSettimanale, volumeSettimanaleKm, type AttivitaForAnalytics } from "@/lib/analytics";
import { SPORTS, sportInfo } from "@/lib/sports";

type Modo = "minuti" | "km";

export function VolumeCard({ attivita }: { attivita: AttivitaForAnalytics[] }) {
  const haDistanza = useMemo(() => attivita.some((a) => (a.distanza_km ?? 0) > 0), [attivita]);
  const [modo, setModo] = useState<Modo>("minuti");
  const m = haDistanza ? modo : "minuti";

  const dati = useMemo(
    () => (m === "km" ? volumeSettimanaleKm(attivita) : volumeSettimanale(attivita)),
    [attivita, m],
  );

  // Sport presenti nei dati (ordine SPORTS)
  const sportPresenti = useMemo(() => {
    const presenti = new Set<string>();
    for (const r of dati) {
      for (const k of Object.keys(r)) {
        if (k !== "settimana" && (r[k] as number) > 0) presenti.add(k);
      }
    }
    const ordered = SPORTS.map((s) => s.key).filter((k) => presenti.has(k));
    for (const k of presenti) if (!ordered.includes(k as never)) ordered.push(k as never);
    return ordered;
  }, [dati]);

  const correnti = dati[dati.length - 1];
  const totaleCorrente = sportPresenti.reduce((s, k) => s + ((correnti?.[k] as number) ?? 0), 0);
  const totaleLabel = m === "minuti"
    ? `${Math.floor(totaleCorrente / 60)}h ${Math.round(totaleCorrente % 60)}min`
    : `${totaleCorrente.toFixed(1)} km`;

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Volume settimanale</h2>
        {haDistanza && (
          <div className="inline-flex rounded-full border border-border p-0.5 text-[11px]">
            {(["minuti", "km"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setModo(opt)}
                className="rounded-full px-2.5 py-0.5 font-medium transition-colors"
                style={{
                  background: m === opt ? "var(--color-accent)" : "transparent",
                  color: m === opt ? "white" : "var(--color-muted-foreground)",
                }}
              >
                {opt === "minuti" ? "Minuti" : "Km"}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Questa settimana: <span className="font-semibold text-foreground">{totaleLabel}</span>
      </p>

      {sportPresenti.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
          Nessuna attività nelle ultime 8 settimane.
        </div>
      ) : (
        <>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dati} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="settimana"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: number, n: string) => [
                    m === "minuti" ? `${v} min` : `${v} km`,
                    sportInfo(n).label,
                  ]}
                />
                {sportPresenti.map((s) => (
                  <Bar
                    key={s}
                    dataKey={s}
                    stackId="vol"
                    fill={sportInfo(s).color}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            {sportPresenti.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: sportInfo(s).color }} />
                {sportInfo(s).label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
