"use client";

/** "Agent is thinking…" with animated dots. */
export function TypingIndicator({ name = "Agent" }: { name?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted" role="status" aria-live="polite">
      <span className="flex items-end gap-1" aria-hidden="true">
        <Dot delay="0ms" />
        <Dot delay="160ms" />
        <Dot delay="320ms" />
      </span>
      <span>{name} is thinking…</span>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-blink rounded-full bg-brand"
      style={{ animationDelay: delay }}
    />
  );
}
