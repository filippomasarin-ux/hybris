import { sportInfo } from "@/lib/sports";

interface Props {
  sportPraticati: string[];
  attivi: string[];
  tuttiSelezionati: boolean;
  onToggle: (key: string) => void;
  onTutti: () => void;
}

export function SportFilterBar({ sportPraticati, attivi, tuttiSelezionati, onToggle, onTutti }: Props) {
  if (sportPraticati.length <= 1) return null;

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={onTutti}
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-all"
        style={
          tuttiSelezionati
            ? { backgroundColor: "var(--color-accent)", color: "white", borderColor: "var(--color-accent)" }
            : { backgroundColor: "var(--color-surface)", color: "var(--color-muted-foreground)", borderColor: "var(--color-border)" }
        }
      >
        Tutti
      </button>

      {sportPraticati.map((key) => {
        const info = sportInfo(key);
        const Icon = info.icon;
        const isSelected = !tuttiSelezionati && attivi.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-all"
            style={
              isSelected
                ? { backgroundColor: info.color, color: "white", borderColor: info.color }
                : { backgroundColor: "var(--color-surface)", color: "var(--color-foreground)", borderColor: "var(--color-border)" }
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{info.label}</span>
          </button>
        );
      })}
    </div>
  );
}
