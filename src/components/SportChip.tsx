import { sportInfo } from "@/lib/sports";

export function SportDot({ sport, size = 8 }: { sport?: string | null; size?: number }) {
  const info = sportInfo(sport);
  return (
    <span
      aria-hidden
      className="inline-block rounded-full"
      style={{ width: size, height: size, backgroundColor: info.color }}
    />
  );
}

export function SportChip({
  sport,
  selected = false,
  onClick,
  emoji = true,
}: {
  sport: string;
  selected?: boolean;
  onClick?: () => void;
  emoji?: boolean;
}) {
  const info = sportInfo(sport);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all"
      style={
        selected
          ? { backgroundColor: info.color, color: "white", borderColor: info.color }
          : { backgroundColor: "var(--color-surface)", color: "var(--color-foreground)", borderColor: "var(--color-border)" }
      }
    >
      {emoji && <span aria-hidden>{info.emoji}</span>}
      <span>{info.label}</span>
    </button>
  );
}
