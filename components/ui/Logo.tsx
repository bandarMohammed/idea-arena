import { cn } from "@/lib/utils/cn";

/** Wordmark + glyph. Pure SVG so it stays crisp and themeable. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-brand to-brand/60 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <path
            d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"
            stroke="rgb(var(--brand-ink))"
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <circle cx="12" cy="12" r="2.6" fill="rgb(var(--brand-ink))" />
        </svg>
      </span>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          Agent<span className="text-muted">Arena</span>
        </span>
      )}
    </span>
  );
}
