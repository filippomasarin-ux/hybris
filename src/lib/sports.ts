import type { LucideIcon } from "lucide-react";
import {
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Zap,
  Flower2,
  Mountain,
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
  | "trail"
  | "altro";

export const SPORTS: { key: SportKey; label: string; icon: LucideIcon; color: string }[] = [
  { key: "corsa", label: "Corsa", icon: Footprints, color: "#FF3B30" },
  { key: "ciclismo", label: "Ciclismo", icon: Bike, color: "#FF9500" },
  { key: "nuoto", label: "Nuoto", icon: Waves, color: "#30A2FF" },
  { key: "palestra", label: "Forza", icon: Dumbbell, color: "#BF5AF2" },
  { key: "trail", label: "Trail", icon: Mountain, color: "#30D158" },
  { key: "hiit", label: "HIIT", icon: Zap, color: "#FF3B30" },
  { key: "yoga", label: "Yoga", icon: Flower2, color: "#BF5AF2" },
  { key: "altro", label: "Altro", icon: Activity, color: "#8E8E93" },
];

export const SPORT_MAP: Record<string, { label: string; color: string; icon: LucideIcon }> =
  Object.fromEntries(SPORTS.map((s) => [s.key, { label: s.label, color: s.color, icon: s.icon }]));

export const sportInfo = (key?: string | null) =>
  (key && SPORT_MAP[key]) || { label: "Attività", color: "#8E8E93", icon: Activity };

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
