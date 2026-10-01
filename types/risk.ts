export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type RiskAction = "AUTO_PROCEED" | "HITL_REQUIRED" | "BLOCKED" | "UNKNOWN";

/**
 * Normalized risk assessment. n8n agents are free to use different field names
 * and casings; `parseRisk` maps the common variants onto this shape.
 */
export interface RiskAssessment {
  riskLevel: RiskLevel;
  /** 0..1 */
  confidence?: number;
  financialImpact?: number;
  currency?: string;
  reversibility?: RiskLevel;
  operationalRisk?: RiskLevel;
  action: RiskAction;
  reason?: string;
  recommendation?: string;
  /** Any additional scalar fields the agent sent, shown as extra factors. */
  extras?: Array<{ label: string; value: string }>;
}
