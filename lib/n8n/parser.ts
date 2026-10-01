import type { RiskAction, RiskAssessment, RiskLevel } from "@/types/risk";

/**
 * Response parsing for arbitrary n8n workflows.
 *
 * n8n "Respond to Webhook" nodes return wildly different shapes depending on
 * how the workflow was built, so we never assume one. The parser walks common
 * container shapes (arrays, { data }, { json }, { body }, ...) and then looks
 * for any of the well-known text keys. If nothing matches we fall back to
 * showing formatted JSON rather than breaking the chat.
 */

/** Keys that commonly hold the agent reply, in priority order. */
const TEXT_KEYS = [
  "output",
  "response",
  "message",
  "text",
  "answer",
  "reply",
  "result",
  "content",
  "completion",
  "generated_text",
];

/** Container keys that usually wrap the real payload. */
const UNWRAP_KEYS = ["json", "body", "data", "result", "payload", "response", "output"];

const MAX_DEPTH = 6;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read a dot/bracket path such as "data.items[0].text". */
export function getByPath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);

  let current: unknown = source;
  for (const segment of segments) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
    } else if (isPlainObject(current)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Pretty-print any value for the "could not find the text" fallback. */
export function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Recursively search for the first plausible reply string.
 * Depth-limited so a pathological payload cannot hang the UI.
 */
function findText(value: unknown, depth = 0): string | null {
  if (depth > MAX_DEPTH || value == null) return null;

  if (isNonEmptyString(value)) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    // n8n very often returns [{ output: "..." }]. Concatenate every item that
    // yields text so multi-item responses are not silently truncated.
    const parts: string[] = [];
    for (const item of value) {
      const found = findText(item, depth + 1);
      if (found) parts.push(found);
    }
    return parts.length ? parts.join("\n\n") : null;
  }

  if (isPlainObject(value)) {
    for (const key of TEXT_KEYS) {
      if (!(key in value)) continue;
      const candidate = value[key];
      if (isNonEmptyString(candidate)) return candidate;
      if (typeof candidate === "number" || typeof candidate === "boolean") return String(candidate);
    }
    // Nothing direct: descend through likely wrappers only, to avoid returning
    // an unrelated string from a deep metadata field.
    for (const key of UNWRAP_KEYS) {
      if (!(key in value)) continue;
      const found = findText(value[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/** Strip common n8n wrappers to reach the object that holds the real fields. */
export function unwrap(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) {
    return value.length === 1 ? unwrap(value[0], depth + 1) : value;
  }
  if (isPlainObject(value)) {
    for (const key of UNWRAP_KEYS) {
      const inner = value[key];
      if (isPlainObject(inner) || Array.isArray(inner)) {
        // Only unwrap when the wrapper adds nothing else of substance.
        if (Object.keys(value).length === 1) return unwrap(inner, depth + 1);
      }
    }
  }
  return value;
}

export interface ParsedResponse {
  text: string;
  risk?: RiskAssessment;
  isRawJson: boolean;
}

/**
 * Main entry point: turn any n8n response into something displayable.
 *
 * @param data     Parsed JSON body (or a raw string for non-JSON responses).
 * @param pathHint Optional user-configured dot-path to the reply text.
 */
export function parseAgentResponse(data: unknown, pathHint = ""): ParsedResponse {
  if (data == null || data === "") {
    return { text: "", isRawJson: false };
  }

  // Plain-text responses (e.g. a workflow returning text/plain).
  if (typeof data === "string") {
    const trimmed = data.trim();
    // The body may still be JSON that arrived with the wrong content-type.
    if (/^[[{]/.test(trimmed)) {
      try {
        return parseAgentResponse(JSON.parse(trimmed), pathHint);
      } catch {
        /* fall through: treat as plain text */
      }
    }
    return { text: trimmed, isRawJson: false };
  }

  const unwrapped = unwrap(data);
  const risk = parseRisk(unwrapped) ?? parseRisk(data) ?? undefined;

  // 1. Explicit user-configured path wins.
  if (pathHint) {
    const direct = getByPath(data, pathHint) ?? getByPath(unwrapped, pathHint);
    if (direct != null) {
      const text = isNonEmptyString(direct) ? direct : toPrettyJson(direct);
      return { text, risk, isRawJson: !isNonEmptyString(direct) };
    }
  }

  // 2. Smart search for well-known text keys.
  const found = findText(unwrapped) ?? findText(data);
  if (found) {
    return { text: found, risk, isRawJson: false };
  }

  // 3. A risk-only payload is perfectly valid: the card carries the meaning.
  if (risk) {
    return {
      text: risk.recommendation || risk.reason || "",
      risk,
      isRawJson: false,
    };
  }

  // 4. Last resort: show the JSON instead of failing.
  return { text: toPrettyJson(data), isRawJson: true };
}

/* ------------------------------------------------------------------ */
/* Risk / human-in-the-loop parsing                                    */
/* ------------------------------------------------------------------ */

const RISK_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function normalizeLevel(value: unknown): RiskLevel | undefined {
  if (typeof value === "number") {
    if (value <= 0.33) return "LOW";
    if (value <= 0.66) return "MEDIUM";
    return "HIGH";
  }
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  if (RISK_LEVELS.includes(upper as RiskLevel)) return upper as RiskLevel;
  if (upper === "MED") return "MEDIUM";
  if (upper === "SEVERE" || upper === "VERY HIGH" || upper === "VERY_HIGH") return "CRITICAL";
  return undefined;
}

function normalizeAction(value: unknown): RiskAction | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (key.includes("HITL") || key.includes("HUMAN") || key.includes("APPROVAL") || key.includes("REVIEW")) {
    return "HITL_REQUIRED";
  }
  if (key.includes("AUTO") || key.includes("PROCEED") || key.includes("APPROVE")) return "AUTO_PROCEED";
  if (key.includes("BLOCK") || key.includes("REJECT") || key.includes("DENY")) return "BLOCKED";
  return undefined;
}

function pick(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const match = Object.keys(source).find((k) => k.toLowerCase() === key.toLowerCase());
    if (match !== undefined && source[match] != null && source[match] !== "") return source[match];
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    if (cleaned !== "" && Number.isFinite(n)) return n;
  }
  return undefined;
}

function toText(value: unknown): string | undefined {
  if (isNonEmptyString(value)) return value.trim();
  return undefined;
}

const KNOWN_RISK_KEYS = new Set(
  [
    "riskLevel", "risk_level", "risk", "severity",
    "confidence", "confidenceScore", "confidence_score", "score",
    "financialImpact", "financial_impact", "impact", "amount", "value",
    "currency",
    "reversibility", "reversible",
    "operationalRisk", "operational_risk",
    "action", "decision", "outcome",
    "reason", "rationale", "justification", "explanation",
    "recommendation", "advice", "suggestion",
  ].map((k) => k.toLowerCase()),
);

/**
 * Detect and normalize a risk-escalation payload. Returns undefined when the
 * response is an ordinary chat reply.
 */
export function parseRisk(value: unknown): RiskAssessment | undefined {
  const candidate = findRiskObject(value);
  if (!candidate) return undefined;

  const riskLevel = normalizeLevel(pick(candidate, ["riskLevel", "risk_level", "risk", "severity"])) ?? "UNKNOWN";
  const action =
    normalizeAction(pick(candidate, ["action", "decision", "outcome"])) ??
    (riskLevel === "HIGH" || riskLevel === "CRITICAL"
      ? "HITL_REQUIRED"
      : riskLevel === "LOW"
        ? "AUTO_PROCEED"
        : "UNKNOWN");

  let confidence = toNumber(pick(candidate, ["confidence", "confidenceScore", "confidence_score", "score"]));
  if (confidence !== undefined && confidence > 1) confidence = confidence / 100;
  if (confidence !== undefined) confidence = Math.max(0, Math.min(1, confidence));

  const extras: Array<{ label: string; value: string }> = [];
  for (const [key, raw] of Object.entries(candidate)) {
    if (KNOWN_RISK_KEYS.has(key.toLowerCase())) continue;
    if (raw == null || raw === "") continue;
    if (typeof raw === "object") continue;
    extras.push({ label: humanizeKey(key), value: String(raw) });
  }

  return {
    riskLevel,
    action,
    confidence,
    financialImpact: toNumber(pick(candidate, ["financialImpact", "financial_impact", "impact", "amount"])),
    currency: toText(pick(candidate, ["currency"])) ?? "USD",
    reversibility: normalizeLevel(pick(candidate, ["reversibility", "reversible"])),
    operationalRisk: normalizeLevel(pick(candidate, ["operationalRisk", "operational_risk"])),
    reason: toText(pick(candidate, ["reason", "rationale", "justification", "explanation"])),
    recommendation: toText(pick(candidate, ["recommendation", "advice", "suggestion"])),
    extras: extras.slice(0, 8),
  };
}

/** A payload counts as a risk assessment when it carries a level or a decision. */
function looksLikeRisk(obj: Record<string, unknown>): boolean {
  const hasLevel = normalizeLevel(pick(obj, ["riskLevel", "risk_level", "severity"])) !== undefined;
  const hasAction = normalizeAction(pick(obj, ["action", "decision"])) !== undefined;
  return hasLevel || hasAction;
}

function findRiskObject(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > MAX_DEPTH || value == null) return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[[{]/.test(trimmed)) {
      try {
        return findRiskObject(JSON.parse(trimmed), depth + 1);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRiskObject(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (isPlainObject(value)) {
    if (looksLikeRisk(value)) return value;
    for (const inner of Object.values(value)) {
      if (typeof inner === "object" || typeof inner === "string") {
        const found = findRiskObject(inner, depth + 1);
        if (found) return found;
      }
    }
  }

  return undefined;
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
