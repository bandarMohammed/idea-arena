"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import type { RiskLevel } from "@/types/risk";
import { LEVEL_TONE } from "./RiskBadge";

/** One labelled factor (financial impact, reversibility, …). */
export function RiskFactorCard({
  label,
  value,
  level,
  icon: Icon,
}: {
  label: string;
  value: string;
  level?: RiskLevel;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const tone = level ? LEVEL_TONE[level] : null;

  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </div>
      <div className={cn("mt-1.5 text-sm font-semibold tabular-nums", tone ? tone.text : "text-ink")}>
        {value}
      </div>
    </div>
  );
}
