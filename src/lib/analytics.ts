export type AttivitaForAnalytics = {
  data: string;
  durata_min: number | null;
  distanza_km: number | null;
  rpe: number | null;
  sport_type: string | null;
  fc_media?: number | null;
  pace_media?: string | null;
};

export function calcolaTrimp(durata_min: number, rpe: number): number {
  const fattore = rpe <= 3 ? 0.7 : rpe <= 5 ? 1.0 : rpe <= 7 ? 1.5 : 2.5;
  return Math.round(durata_min * fattore);
}

export function trimpGiornaliero(attivita: AttivitaForAnalytics[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const a of attivita) {
    if (!a.data || !a.durata_min) continue;
    const t = calcolaTrimp(a.durata_min, a.rpe ?? 5);
    acc[a.data] = (acc[a.data] ?? 0) + t;
  }
  return acc;
}

export type PuntoCarico = { data: string; ctl: number; atl: number; tsb: number };

export function calcolaCarico(attivita: AttivitaForAnalytics[]): {
  ctl: number;
  atl: number;
  tsb: number;
  storia: PuntoCarico[];
} {
  const trimp = trimpGiornaliero(attivita);
  const giorni: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    giorni.push(d.toISOString().slice(0, 10));
  }

  const kCtl = 2 / (42 + 1);
  const kAtl = 2 / (7 + 1);

  let ctl = 0;
  let atl = 0;
  const storia: PuntoCarico[] = [];

  for (const data of giorni) {
    const t = trimp[data] ?? 0;
    ctl = t * kCtl + ctl * (1 - kCtl);
    atl = t * kAtl + atl * (1 - kAtl);
    storia.push({
      data,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });
  }

  const oggi = storia[storia.length - 1];
  return { ctl: oggi.ctl, atl: oggi.atl, tsb: oggi.tsb, storia };
}

export type VolumeSettimana = {
  settimana: string;
  [sport: string]: number | string;
};

export function volumeSettimanale(attivita: AttivitaForAnalytics[]): VolumeSettimana[] {
  const settimane: { inizio: Date; fine: Date; label: string }[] = [];
  for (let i = 7; i >= 0; i--) {
    const ora = new Date();
    const giorno = ora.getDay();
    const lunedi = new Date(ora);
    lunedi.setDate(ora.getDate() - ((giorno + 6) % 7) - i * 7);
    lunedi.setHours(0, 0, 0, 0);
    const domenica = new Date(lunedi);
    domenica.setDate(lunedi.getDate() + 6);
    domenica.setHours(23, 59, 59, 999);
    settimane.push({
      inizio: lunedi,
      fine: domenica,
      label: lunedi.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
    });
  }

  return settimane.map(({ inizio, fine, label }) => {
    const row: VolumeSettimana = { settimana: label };
    for (const a of attivita) {
      if (!a.data || !a.durata_min || !a.sport_type) continue;
      const d = new Date(a.data);
      if (d < inizio || d > fine) continue;
      const sport = a.sport_type;
      row[sport] = ((row[sport] as number) ?? 0) + a.durata_min;
    }
    return row;
  });
}

export function volumeSettimanaleKm(attivita: AttivitaForAnalytics[]): VolumeSettimana[] {
  const settimane: { inizio: Date; fine: Date; label: string }[] = [];
  for (let i = 7; i >= 0; i--) {
    const ora = new Date();
    const giorno = ora.getDay();
    const lunedi = new Date(ora);
    lunedi.setDate(ora.getDate() - ((giorno + 6) % 7) - i * 7);
    lunedi.setHours(0, 0, 0, 0);
    const domenica = new Date(lunedi);
    domenica.setDate(lunedi.getDate() + 6);
    domenica.setHours(23, 59, 59, 999);
    settimane.push({
      inizio: lunedi,
      fine: domenica,
      label: lunedi.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
    });
  }

  return settimane.map(({ inizio, fine, label }) => {
    const row: VolumeSettimana = { settimana: label };
    for (const a of attivita) {
      if (!a.data || !a.distanza_km || !a.sport_type) continue;
      const d = new Date(a.data);
      if (d < inizio || d > fine) continue;
      const sport = a.sport_type;
      row[sport] = Math.round((((row[sport] as number) ?? 0) + a.distanza_km) * 10) / 10;
    }
    return row;
  });
}

export type PuntoEfficienza = {
  data: string;
  pace_sec_per_km: number;
  rpe: number;
  efficienza: number;
  distanza_km: number;
};

export function calcolaEfficienzaAerobica(attivita: AttivitaForAnalytics[]): PuntoEfficienza[] {
  return attivita
    .filter(
      (a) =>
        a.sport_type === "run" &&
        a.rpe != null &&
        a.rpe >= 4 &&
        a.rpe <= 6 &&
        a.distanza_km != null &&
        a.distanza_km > 1 &&
        a.durata_min != null,
    )
    .map((a) => {
      const pace_sec_per_km = (a.durata_min! * 60) / a.distanza_km!;
      const rpe = a.rpe!;
      return {
        data: a.data,
        pace_sec_per_km: Math.round(pace_sec_per_km),
        rpe,
        efficienza: Math.round((pace_sec_per_km / rpe) * 10) / 10,
        distanza_km: a.distanza_km!,
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-12);
}

export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, "0");
  return `${m}:${s} /km`;
}

export function labelTsb(tsb: number): { label: string; colore: "verde" | "giallo" | "rosso" } {
  if (tsb > 5) return { label: "Forma ottimale", colore: "verde" };
  if (tsb >= -10) return { label: "In carico", colore: "giallo" };
  return { label: "Affaticato", colore: "rosso" };
}

export const TSB_COLORI: Record<"verde" | "giallo" | "rosso", { bg: string; text: string; dot: string }> = {
  verde: { bg: "rgba(16,185,129,0.12)", text: "#10b981", dot: "#10b981" },
  giallo: { bg: "rgba(234,179,8,0.12)", text: "#eab308", dot: "#eab308" },
  rosso: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", dot: "#ef4444" },
};
