"use client";

import { cn } from "@/lib/utils/cn";
import type { RiskLevel } from "@/types/risk";

/** Muted, accessible tones — the card should read as serious, not loud. */
export const LEVEL_TONE: Record<RiskLevel, { text: string; bg: string; border: string; bar: string }> = {
  LOW: { text: "text-ok", bg: "bg-ok/10", border: "border-ok/30", bar: "bg-ok" },
  MEDIUM: { text: "text-warn", bg: "bg-warn/10", border: "border-warn/30", bar: "bg-warn" },
  HIGH: { text: "text-danger", bg: "bg-danger/10", border: "border-danger/30", bar: "bg-danger" },
  CRITICAL: { text: "text-critical", bg: "bg-critical/10", border: "border-critical/30", bar: "bg-critical" },
  UNKNOWN: { text: "text-muted", bg: "bg-elevated", border: "border-line-strong", bar: "bg-faint" },
};

export function RiskBadge({
  level,
  size = "md",
  className,
}: {
  level: RiskLevel;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = LEVEL_TONE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        tone.bg,
        tone.border,
        tone.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.bar)} aria-hidden="true" />
      {level}
    </span>
  );
}
