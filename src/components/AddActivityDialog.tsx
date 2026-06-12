import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPORTS, type SportKey } from "@/lib/sports";
import { X } from "lucide-react";

export function AddActivityDialog({
  userId,
  open,
  onClose,
  onSaved,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sport, setSport] = useState<SportKey>("corsa");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 16));
  const [durata, setDurata] = useState<number | "">(45);
  const [distanza, setDistanza] = useState<number | "">("");
  const [rpe, setRpe] = useState(6);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!durata) {
      toast.error("Inserisci la durata");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("attivita").insert({
      user_id: userId,
      sport_type: sport,
      data: new Date(data).toISOString(),
      durata_min: Number(durata),
      distanza_km: distanza === "" ? null : Number(distanza),
      rpe,
      note_utente: note || null,
      fonte: "manuale",
    });
    setSaving(false);
    if (error) {
      toast.error("Errore nel salvare");
      return;
    }
    toast.success("Attività aggiunta");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuova attività</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-caps mb-2 block text-muted-foreground">Sport</label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => {
                const sel = sport === s.key;
                const Icon = s.icon;
                return (
                  <button
                    key={s.key} type="button" onClick={() => setSport(s.key)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
                    style={
                      sel
                        ? { backgroundColor: s.color, color: "white", borderColor: s.color }
                        : { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }
                    }
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps mb-1.5 block text-muted-foreground">Data e ora</label>
              <input
                type="datetime-local" value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="label-caps mb-1.5 block text-muted-foreground">Durata (min)</label>
              <input
                type="number" min={1} value={durata}
                onChange={(e) => setDurata(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>
          </div>

          <div>
            <label className="label-caps mb-1.5 block text-muted-foreground">Distanza (km, opzionale)</label>
            <input
              type="number" step="0.1" min={0}
              value={distanza}
              onChange={(e) => setDistanza(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
              placeholder="es. 8.5"
            />
          </div>

          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-baseline justify-between">
              <span className="label-caps text-muted-foreground">RPE — Fatica percepita</span>
              <span className="text-3xl font-bold text-accent">{rpe}</span>
            </div>
            <input
              type="range" min={1} max={10} value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--color-accent)]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Facile</span>
              <span>Massimale</span>
            </div>
          </div>

          <div>
            <label className="label-caps mb-1.5 block text-muted-foreground">Note (opzionale)</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
              placeholder="Come è andata?"
            />
          </div>

          <button
            onClick={handleSave} disabled={saving}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvo…" : "Salva attività"}
          </button>
        </div>
      </div>
    </div>
  );
}
