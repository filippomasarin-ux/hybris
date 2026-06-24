import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { calcolaEfficienzaAerobica, formatPace, type AttivitaForAnalytics } from "@/lib/analytics";

export function AerobicoCard({ attivita }: { attivita: AttivitaForAnalytics[] }) {
  const punti = useMemo(() => calcolaEfficienzaAerobica(attivita), [attivita]);

  const trendMsg = useMemo(() => {
    if (punti.length < 3) return null;
    const ultimi = punti.slice(-3);
    const primo = ultimi[0].efficienza;
    const ultimo = ultimi[ultimi.length - 1].efficienza;
    const delta = ultimo - primo;
    const soglia = primo * 0.03; // 3%
    if (delta < -soglia) return "Stai diventando più efficiente: stesso sforzo, passo migliore.";
    if (delta > soglia) return "Efficienza in calo — potrebbe indicare accumulo di fatica.";
    return "Efficienza stabile nelle ultime uscite facili.";
  }, [punti]);

  const dati = useMemo(
    () =>
      punti.map((p) => ({
        ...p,
        label: new Date(p.data).toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      })),
    [punti],
  );

  return (
    <section
      className="rounded-2xl p-5"
      style={{ background: "oklch(0.115 0.025 295)", border: "1px solid oklch(1 0 0 / 6%)" }}
    >
      <div className="mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(0.6 0.02 290)" }}>Efficienza aerobica</h2>
        <p className="text-xs text-muted-foreground">Corsa · Z2 (RPE 4-6)</p>
      </div>

      {punti.length < 3 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          Completa almeno 3 allenamenti di corsa facile (RPE 4-6) con distanza
          <br />per vedere il trend.
        </div>
      ) : (
        <>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dati} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  reversed
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(_v, _n, item) => {
                    const p = item.payload as (typeof dati)[number];
                    return [`${formatPace(p.pace_sec_per_km)} · RPE ${p.rpe}`, "Sessione"];
                  }}
                  labelFormatter={(l) => String(l)}
                />
                <Line
                  type="monotone"
                  dataKey="efficienza"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-accent)" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground text-center">
            Efficienza (pace/RPE) · più basso = meglio
          </p>
          {trendMsg && (
            <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              {trendMsg}
            </p>
          )}
        </>
      )}
    </section>
  );
}
