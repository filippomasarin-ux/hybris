import type { LucideIcon } from "lucide-react";
import {
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Zap,
  Flower2,
  Activity,
  Flag,
  Flame,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export type SportKey =
  | "corsa"
  | "ciclismo"
  | "nuoto"
  | "palestra"
  | "hiit"
  | "yoga"
  | "altro";

export const SPORTS: { key: SportKey; label: string; icon: LucideIcon; color: string }[] = [
  { key: "corsa", label: "Corsa", icon: Footprints, color: "var(--color-sport-corsa)" },
  { key: "ciclismo", label: "Ciclismo", icon: Bike, color: "var(--color-sport-ciclismo)" },
  { key: "nuoto", label: "Nuoto", icon: Waves, color: "var(--color-sport-nuoto)" },
  { key: "palestra", label: "Palestra", icon: Dumbbell, color: "var(--color-sport-palestra)" },
  { key: "hiit", label: "HIIT", icon: Zap, color: "var(--color-sport-hiit)" },
  { key: "yoga", label: "Yoga", icon: Flower2, color: "var(--color-sport-yoga)" },
  { key: "altro", label: "Altro", icon: Activity, color: "var(--color-sport-altro)" },
];

export const SPORT_MAP: Record<string, { label: string; color: string; icon: LucideIcon }> =
  Object.fromEntries(SPORTS.map((s) => [s.key, { label: s.label, color: s.color, icon: s.icon }]));

export const sportInfo = (key?: string | null) =>
  (key && SPORT_MAP[key]) || { label: "Attività", color: "var(--color-sport-altro)", icon: Activity };

export const GIORNI = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mer", label: "Mer" },
  { key: "gio", label: "Gio" },
  { key: "ven", label: "Ven" },
  { key: "sab", label: "Sab" },
  { key: "dom", label: "Dom" },
];

export const OBIETTIVI: {
  key: string;
  icon: LucideIcon;
  titolo: string;
  desc: string;
}[] = [
  { key: "gara", icon: Flag, titolo: "Prepararmi per una gara", desc: "Corsa, Hyrox, ciclismo: raggiungi il tuo traguardo" },
  { key: "massa", icon: Dumbbell, titolo: "Aumentare la massa muscolare", desc: "Guadagna forza e volume in modo progressivo" },
  { key: "dimagrimento", icon: Flame, titolo: "Perdere peso", desc: "Dimagrimento sano preservando la massa muscolare" },
  { key: "salute", icon: HeartPulse, titolo: "Migliorare la salute", desc: "Equilibrio tra forza, cardio e recupero" },
  { key: "performance", icon: TrendingUp, titolo: "Migliorare le performance", desc: "Diventa più veloce, più forte, più resistente" },
  { key: "longevita", icon: ShieldCheck, titolo: "Ridurre gli infortuni", desc: "Allena in modo sostenibile e longevo" },
];

export const OBIETTIVO_MAP = Object.fromEntries(OBIETTIVI.map((o) => [o.key, o]));
