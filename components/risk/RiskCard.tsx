"use client";

import { Activity, DollarSign, RotateCcw, Scale } from "lucide-react";
import type { RiskAssessment } from "@/types/risk";
import { formatCurrency } from "@/lib/utils/format";
import { ApprovalCard } from "./ApprovalCard";
import { ConfidenceBar } from "./ConfidenceBar";
import { DecisionStatus } from "./DecisionStatus";
import { RiskBadge, LEVEL_TONE } from "./RiskBadge";
import { RiskFactorCard } from "./RiskFactorCard";
import { cn } from "@/lib/utils/cn";

/**
 * Structured rendering for a risk-escalation response. Shown instead of a
 * plain text bubble whenever the parser recognises a risk payload.
 */
export function RiskCard({
  risk,
  approval,
  onDecide,
}: {
  risk: RiskAssessment;
  approval?: "approved" | "rejected";
  onDecide?: (value: "approved" | "rejected", note: string) => Promise<void> | void;
}) {
  const tone = LEVEL_TONE[risk.riskLevel];
  const needsApproval = risk.action === "HITL_REQUIRED";

  return (
    <article
      className={cn("overflow-hidden rounded-2xl border bg-surface shadow-soft", tone.border)}
      aria-label={`Risk assessment: ${risk.riskLevel}`}
    >
      {/* Accent rail communicates severity without shouting. */}
      <div className={cn("h-0.5 w-full", tone.bar)} aria-hidden="true" />

      <div className="space-y-4 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-faint">Risk Level</span>
            <RiskBadge level={risk.riskLevel} />
          </div>
          {risk.confidence !== undefined && (
            <ConfidenceBar value={risk.confidence} className="w-full sm:w-44" />
          )}
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {risk.financialImpact !== undefined && (
            <RiskFactorCard
              label="Financial Impact"
              value={formatCurrency(risk.financialImpact, risk.currency)}
              icon={DollarSign}
            />
          )}
          {risk.reversibility && (
            <RiskFactorCard
              label="Reversibility"
              value={risk.reversibility}
              level={invertLevel(risk.reversibility)}
              icon={RotateCcw}
            />
          )}
          {risk.operationalRisk && (
            <RiskFactorCard
              label="Operational Risk"
              value={risk.operationalRisk}
              level={risk.operationalRisk}
              icon={Activity}
            />
          )}
          {risk.extras?.map((extra) => (
            <RiskFactorCard key={extra.label} label={extra.label} value={extra.value} icon={Scale} />
          ))}
        </div>

        <DecisionStatus action={risk.action} />

        {(risk.reason || risk.recommendation) && (
          <div className="space-y-3 rounded-xl border border-line bg-canvas/60 p-3.5">
            {risk.reason && (
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-faint">Reason</div>
                <p className="mt-1 text-sm leading-relaxed text-ink">{risk.reason}</p>
              </div>
            )}
            {risk.recommendation && (
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-faint">Recommendation</div>
                <p className="mt-1 text-sm leading-relaxed text-ink">{risk.recommendation}</p>
              </div>
            )}
          </div>
        )}

        {needsApproval && onDecide && <ApprovalCard decision={approval} onDecide={onDecide} />}
      </div>
    </article>
  );
}

/**
 * Reversibility reads inversely to risk: LOW reversibility is the dangerous
 * case, so the colour is flipped before it reaches the factor card.
 */
function invertLevel(level: RiskAssessment["reversibility"]) {
  if (level === "LOW") return "HIGH";
  if (level === "HIGH") return "LOW";
  return level;
}
