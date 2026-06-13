import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, RefreshCw, Moon, Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import { generaPianoSettimanale, getPianoCorrente, type PianoSettimanale } from "@/lib/piani.functions";
import { sportInfo } from "@/lib/sports";

type Piano = PianoSettimanale & { settimana_inizio: string };

const GIORNI_BREVI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

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

      {/* Calendar strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {piano.giorni.map((g, i) => {
          const isSel = i === selected;
          const gInfo = sportInfo(g.sport);
          const today = isToday(piano.settimana_inizio, i);
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all"
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
                <p className="text-xs text-muted-foreground">Recupero attivo o stretching leggero.</p>
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

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Durata</p>
                    <p className="text-sm font-semibold tabular-nums">{giornoSel.durata_min} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                  <Flame className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Intensità</p>
                    <p className="text-sm font-semibold tabular-nums">RPE {giornoSel.intensita_rpe}</p>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{giornoSel.descrizione}</p>
            </>
          )}
        </div>
      )}

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
