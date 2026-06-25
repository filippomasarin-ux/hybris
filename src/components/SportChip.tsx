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
  showIcon = true,
}: {
  sport: string;
  selected?: boolean;
  onClick?: () => void;
  showIcon?: boolean;
}) {
  const info = sportInfo(sport);
  const Icon = info.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-all"
      style={
        selected
          ? { backgroundColor: info.color, color: "white", borderColor: info.color }
          : { backgroundColor: "var(--color-surface)", color: "var(--color-foreground)", borderColor: "var(--color-border)" }
      }
    >
      {showIcon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />}
      <span>{info.label}</span>
    </button>
  );
}
