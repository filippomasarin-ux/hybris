import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, ReferenceLine } from "recharts";
import { calcolaCarico, labelTsb, TSB_COLORI, type AttivitaForAnalytics } from "@/lib/analytics";

const CTL_COLOR = "var(--color-accent)";
const ATL_COLOR = "#E8593C";
const TSB_COLOR = "var(--color-muted-foreground)";

export function TrainingLoadCard({ attivita }: { attivita: AttivitaForAnalytics[] }) {
  const carico = useMemo(() => calcolaCarico(attivita), [attivita]);
  const tsbInfo = labelTsb(carico.tsb);
  const tsbCol = TSB_COLORI[tsbInfo.colore];
  const dati = carico.storia.slice(-42);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-semibold">Carico di allenamento</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Ultimi 42 giorni · modello CTL/ATL/TSB</p>

      <div className="grid grid-cols-3 gap-3 border-b border-border pb-4">
        <Metric label="CTL" sub="Media 42gg" value={carico.ctl.toFixed(0)} color={CTL_COLOR} />
        <Metric label="ATL" sub="Media 7gg" value={carico.atl.toFixed(0)} color={ATL_COLOR} />
        <div>
          <p className="label-caps text-muted-foreground">TSB</p>
          <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: tsbCol.text }}>
            {carico.tsb > 0 ? "+" : ""}{carico.tsb.toFixed(0)}
          </p>
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: tsbCol.bg, color: tsbCol.text }}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: tsbCol.dot }} />
            {tsbInfo.label}
          </span>
        </div>
      </div>

      <div className="mt-4 h-[88px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dati} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
            <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="2 2" />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 11,
              }}
              labelFormatter={(l) => new Date(l as string).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
              formatter={(v: number, n: string) => [v.toFixed(0), n.toUpperCase()]}
            />
            <Line type="monotone" dataKey="ctl" stroke={CTL_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="atl" stroke={ATL_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="tsb" stroke={TSB_COLOR} strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <LegendDot color={CTL_COLOR} label="CTL (forma)" />
        <LegendDot color={ATL_COLOR} label="ATL (carico)" />
        <LegendDot color={TSB_COLOR} label="TSB (bilanciamento)" />
      </div>
    </section>
  );
}

function Metric({ label, sub, value, color }: { label: string; sub: string; value: string; color: string }) {
  return (
    <div title={sub}>
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
