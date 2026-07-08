import type { SportKey } from "@/lib/sports";

export type UnitaObiettivo = "km" | "ore";

export type ObiettivoVolume = { valore: number; unita: UnitaObiettivo };

export type VolumeTarget = Partial<Record<string, ObiettivoVolume>>;

const SPORT_CARDIO: SportKey[] = ["corsa", "ciclismo", "nuoto", "trail"];

export function unitaDefault(sport: string): UnitaObiettivo {
  return (SPORT_CARDIO as string[]).includes(sport) ? "km" : "ore";
}

export function obiettivoDefault(sport: string): ObiettivoVolume {
  return unitaDefault(sport) === "km" ? { valore: 20, unita: "km" } : { valore: 2, unita: "ore" };
}

export function formatObiettivo(o: ObiettivoVolume): string {
  return o.unita === "km" ? `${o.valore}km` : `${o.valore}h`;
}

export type ProgressoSport = {
  sport: string;
  unita: UnitaObiettivo;
  target: number;
  fatto: number;
  rimanente: number;
};

/** Sums this week's (Monday through today, inclusive) completed volume per sport against its target. */
export function calcolaProgressoSettimanale(
  attivita: Array<{ data: string; sport_type: string | null; durata_min: number | null; distanza_km: number | null }>,
  volumeTarget: VolumeTarget,
  lunediInizio: string,
): ProgressoSport[] {
  const inizio = new Date(lunediInizio);
  const risultati: ProgressoSport[] = [];

  for (const [sport, obiettivo] of Object.entries(volumeTarget)) {
    if (!obiettivo) continue;
    const attivitaSettimana = attivita.filter((a) => {
      if (a.sport_type !== sport) return false;
      const d = new Date(a.data);
      return d >= inizio;
    });

    const fatto =
      obiettivo.unita === "km"
        ? attivitaSettimana.reduce((s, a) => s + (a.distanza_km ?? 0), 0)
        : attivitaSettimana.reduce((s, a) => s + (a.durata_min ?? 0), 0) / 60;

    risultati.push({
      sport,
      unita: obiettivo.unita,
      target: obiettivo.valore,
      fatto: Math.round(fatto * 10) / 10,
      rimanente: Math.max(0, Math.round((obiettivo.valore - fatto) * 10) / 10),
    });
  }

  return risultati;
}
