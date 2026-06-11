export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-xl font-semibold tracking-tight text-foreground">FitCoach</span>
      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
        AI
      </span>
    </div>
  );
}
