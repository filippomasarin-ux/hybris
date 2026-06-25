export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-white"
        style={{
          background: "var(--gradient-hero)",
          boxShadow: "0 0 16px rgba(255, 59, 48, 0.4)",
        }}
      >
        {/* Stylized speed mark */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 17 L11 9 L13 13 L19 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="19" cy="5" r="1.6" fill="white" />
        </svg>
      </span>
      <span className="font-display text-2xl tracking-wider text-white">
        RUNHUB<span style={{ color: "var(--color-accent)" }}>.AI</span>
      </span>
    </div>
  );
}
