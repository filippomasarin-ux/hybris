export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 48 : 36;
  const textSize = size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-2xl";

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
      >
        <rect x="0" y="0" width="21" height="72" fill="#6A00FF" />
        <rect x="51" y="0" width="21" height="72" fill="#B5179E" />
        <polygon points="0,41 0,29 72,13 72,25" fill="#00F5D4" />
      </svg>
      <span
        className={`font-display tracking-[.12em] text-white leading-none ${textSize}`}
      >
        HYBRIS
      </span>
    </div>
  );
}
