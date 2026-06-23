import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, RefreshCw, Moon, Clock, Flame, MapPin, Activity } from "lucide-react";
import { toast } from "sonner";
import { generaPianoSettimanale, getPianoCorrente, type PianoSettimanale } from "@/lib/piani.functions";
import { sportInfo } from "@/lib/sports";

type Piano = PianoSettimanale & { settimana_inizio: string };

const GIORNI_BREVI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const STATO_STYLE: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  fresco: { label: "Fresco", dot: "#10b981", bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  normale: { label: "Normale", dot: "#eab308", bg: "rgba(234,179,8,0.12)", text: "#eab308" },
  affaticato: { label: "Affaticato", dot: "#ef4444", bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
};

const CARICO_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  leggero: { label: "Settimana leggera", bg: "rgba(20,184,166,0.12)", text: "#14b8a6" },
  medio: { label: "Settimana media", bg: "rgba(59,130,246,0.12)", text: "#3b82f6" },
  intenso: { label: "Settimana intensa", bg: "rgba(249,115,22,0.12)", text: "#f97316" },
};

function zonaColor(zona?: string): string {
  if (!zona) return "var(--color-muted-foreground)";
  if (zona.startsWith("Z1") || zona === "Riposo" || zona === "Mobilità") return "#64748b";
  if (zona.startsWith("Z2")) return "#10b981";
  if (zona.startsWith("Z3")) return "#eab308";
  if (zona.startsWith("Z4") || zona === "HIIT") return "#ef4444";
  if (zona === "Forza") return "#a855f7";
  return "var(--color-muted-foreground)";
}

export function WeeklyPlanCard() {
  const fetchPiano = useServerFn(getPianoCorrente);
  const genPiano = useServerFn(generaPianoSettimanale);
  const [piano, setPiano] = useState<Piano | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    fetchPiano()
      .then((p) => {
        setPiano(p as Piano | null);
        if (p) {
          const today = new Date();
          const idx = (today.getDay() + 6) % 7;
          setSelected(idx);
        }
      })
      .finally(() => setLoading(false));
  }, [fetchPiano]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const p = await genPiano();
      setPiano(p as Piano);
      toast.success("Piano generato");
    } catch (e) {
      toast.error("Errore nella generazione");
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!piano) {
    return (
      <section className="rounded-2xl bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Piano settimanale</h2>
        </div>
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--color-accent)" }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Nessun piano per questa settimana.</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Generato dall'AI in base al tuo profilo, obiettivi e ultime attività.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? "Genero…" : "Genera piano"}
          </button>
        </div>
      </section>
    );
  }

  const giornoSel = piano.giorni[selected];
  const info = sportInfo(giornoSel?.sport);
  const Icon = info.icon;

  const stato = STATO_STYLE[piano.stato_forma_rilevato] ?? STATO_STYLE.normale;
  const carico = CARICO_STYLE[piano.carico_settimana] ?? CARICO_STYLE.medio;

  const totMinuti = piano.giorni.reduce((s, g) => s + (g.riposo ? 0 : g.durata_min ?? 0), 0);
  const totKm = piano.giorni.reduce((s, g) => s + (g.distanza_km ?? 0), 0);
  const sessioni = piano.giorni.filter((g) => !g.riposo).length;

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Piano settimanale</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          aria-label="Rigenera"
        >
          <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
          Rigenera
        </button>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Settimana del {formatDate(piano.settimana_inizio)}
      </p>

      {/* Stato forma + carico */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: stato.bg, color: stato.text }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: stato.dot }} />
          {stato.label}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: carico.bg, color: carico.text }}
        >
          {carico.label}
        </span>
      </div>

      {/* Calendar strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {piano.giorni.map((g, i) => {
          const isSel = i === selected;
          const gInfo = sportInfo(g.sport);
          const today = isToday(piano.settimana_inizio, i);
          const zCol = zonaColor(g.zona_intensita);
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="group flex flex-col items-center gap-1 rounded-xl border p-2 transition-all"
              style={{
                borderColor: isSel ? "var(--color-accent)" : "var(--color-border)",
                background: isSel ? "color-mix(in oklab, var(--color-accent) 14%, var(--color-surface))" : "transparent",
              }}
            >
              <span className={`text-[10px] font-medium uppercase tracking-wide ${today ? "text-accent" : "text-muted-foreground"}`}>
                {GIORNI_BREVI[i]}
              </span>
              <span className={`text-sm font-semibold tabular-nums ${today ? "text-accent" : ""}`}>
                {dayNum(piano.settimana_inizio, i)}
              </span>
              {g.riposo ? (
                <Moon className="h-3 w-3 text-muted-foreground" />
              ) : (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: gInfo.color }}
                />
              )}
              {g.zona_intensita && !g.riposo ? (
                <span
                  className="mt-0.5 max-w-full truncate rounded-sm px-1 text-[8px] font-semibold uppercase tracking-wide"
                  style={{ color: zCol, background: `color-mix(in oklab, ${zCol} 14%, transparent)` }}
                  title={g.zona_intensita}
                >
                  {g.zona_intensita.split(" ")[0]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {giornoSel && (
        <div className="mt-4 rounded-xl border border-border p-4">
          {giornoSel.riposo ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Giorno di riposo</p>
                <p className="text-xs text-muted-foreground">
                  {giornoSel.motivo_riposo || "Recupero attivo o stretching leggero."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: info.color }}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="label-caps text-muted-foreground">{info.label}</p>
                  <p className="truncate text-sm font-semibold">{giornoSel.titolo}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Durata</p>
                    <p className="text-sm font-semibold tabular-nums">{giornoSel.durata_min}'</p>
                  </div>
                </div>
                {giornoSel.distanza_km ? (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 leading-tight">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Distanza</p>
                      <p className="text-sm font-semibold tabular-nums">{giornoSel.distanza_km} km</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-2">
                    <Flame className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 leading-tight">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">RPE</p>
                      <p className="text-sm font-semibold tabular-nums">{giornoSel.intensita_rpe}/10</p>
                    </div>
                  </div>
                )}
                <div
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                  style={{ background: `color-mix(in oklab, ${zonaColor(giornoSel.zona_intensita)} 12%, transparent)` }}
                >
                  <Activity className="h-3.5 w-3.5 shrink-0" style={{ color: zonaColor(giornoSel.zona_intensita) }} />
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Zona</p>
                    <p className="truncate text-sm font-semibold" style={{ color: zonaColor(giornoSel.zona_intensita) }}>
                      {giornoSel.zona_intensita}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{giornoSel.descrizione}</p>
            </>
          )}
        </div>
      )}

      {/* Totali settimana */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border px-3 py-2.5">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ore</p>
          <p className="text-sm font-semibold tabular-nums">{(totMinuti / 60).toFixed(1)}h</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Km</p>
          <p className="text-sm font-semibold tabular-nums">{totKm > 0 ? totKm.toFixed(1) : "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sessioni</p>
          <p className="text-sm font-semibold tabular-nums">{sessioni}</p>
        </div>
      </div>

      {piano.note && (
        <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Note del coach.</span> {piano.note}
        </p>
      )}
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function dayNum(inizioIso: string, offset: number) {
  const d = new Date(inizioIso);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.getUTCDate();
}

function isToday(inizioIso: string, offset: number) {
  const d = new Date(inizioIso);
  d.setUTCDate(d.getUTCDate() + offset);
  const t = new Date();
  return (
    d.getUTCFullYear() === t.getFullYear() &&
    d.getUTCMonth() === t.getMonth() &&
    d.getUTCDate() === t.getDate()
  );
}
