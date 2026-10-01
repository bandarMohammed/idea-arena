"use client";

import { CheckCircle2, ShieldAlert, ShieldX, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { RiskAction } from "@/types/risk";

const DECISIONS: Record<
  RiskAction,
  { label: string; icon: typeof CheckCircle2; text: string; bg: string; border: string }
> = {
  AUTO_PROCEED: {
    label: "Auto Proceed",
    icon: CheckCircle2,
    text: "text-ok",
    bg: "bg-ok/10",
    border: "border-ok/30",
  },
  HITL_REQUIRED: {
    label: "Human Approval Required",
    icon: ShieldAlert,
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
  BLOCKED: {
    label: "Blocked",
    icon: ShieldX,
    text: "text-critical",
    bg: "bg-critical/10",
    border: "border-critical/30",
  },
  UNKNOWN: {
    label: "Decision Pending",
    icon: HelpCircle,
    text: "text-muted",
    bg: "bg-elevated",
    border: "border-line-strong",
  },
};

export function DecisionStatus({ action, className }: { action: RiskAction; className?: string }) {
  const d = DECISIONS[action];
  const Icon = d.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5",
        d.bg,
        d.border,
        className,
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", d.text)} aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wide text-faint">Decision</div>
        <div className={cn("text-sm font-semibold", d.text)}>{d.label}</div>
      </div>
    </div>
  );
}
