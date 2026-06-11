export type SportKey =
  | "corsa"
  | "ciclismo"
  | "nuoto"
  | "palestra"
  | "hiit"
  | "yoga"
  | "altro";

export const SPORTS: { key: SportKey; label: string; emoji: string; color: string }[] = [
  { key: "corsa", label: "Corsa", emoji: "🏃", color: "var(--color-sport-corsa)" },
  { key: "ciclismo", label: "Ciclismo", emoji: "🚴", color: "var(--color-sport-ciclismo)" },
  { key: "nuoto", label: "Nuoto", emoji: "🏊", color: "var(--color-sport-nuoto)" },
  { key: "palestra", label: "Palestra", emoji: "💪", color: "var(--color-sport-palestra)" },
  { key: "hiit", label: "HIIT", emoji: "⚡", color: "var(--color-sport-hiit)" },
  { key: "yoga", label: "Yoga", emoji: "🧘", color: "var(--color-sport-yoga)" },
  { key: "altro", label: "Altro", emoji: "•", color: "var(--color-sport-altro)" },
];

export const SPORT_MAP: Record<string, { label: string; color: string; emoji: string }> =
  Object.fromEntries(SPORTS.map((s) => [s.key, { label: s.label, color: s.color, emoji: s.emoji }]));

export const sportInfo = (key?: string | null) =>
  (key && SPORT_MAP[key]) || { label: "Attività", color: "var(--color-sport-altro)", emoji: "•" };

export const GIORNI = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mer", label: "Mer" },
  { key: "gio", label: "Gio" },
  { key: "ven", label: "Ven" },
  { key: "sab", label: "Sab" },
  { key: "dom", label: "Dom" },
];

export const OBIETTIVI = [
  { key: "gara", emoji: "🏁", titolo: "Prepararmi per una gara", desc: "Corsa, Hyrox, ciclismo: raggiungi il tuo traguardo" },
  { key: "massa", emoji: "💪", titolo: "Aumentare la massa muscolare", desc: "Guadagna forza e volume in modo progressivo" },
  { key: "dimagrimento", emoji: "🔥", titolo: "Perdere peso", desc: "Dimagrimento sano preservando la massa muscolare" },
  { key: "salute", emoji: "❤️", titolo: "Migliorare la salute", desc: "Equilibrio tra forza, cardio e recupero" },
  { key: "performance", emoji: "⚡", titolo: "Migliorare le performance", desc: "Diventa più veloce, più forte, più resistente" },
  { key: "longevita", emoji: "🛡️", titolo: "Ridurre gli infortuni", desc: "Allena in modo sostenibile e longevo" },
];
