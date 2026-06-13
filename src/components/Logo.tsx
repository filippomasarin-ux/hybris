export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-bold text-white"
        style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, #6d28d9 100%)" }}
      >
        R
      </span>
      <span className="text-xl font-semibold tracking-tight text-foreground">
        RunHub<span className="text-accent"> AI</span>
      </span>
    </div>
  );
}
