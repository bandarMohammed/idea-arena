import type { AgentConfig, PayloadConfig, ResponseConfig } from "@/types/agent";
import { uuid } from "@/lib/utils/id";

export const DEFAULT_TIMEOUT_MS = 60_000;

export const defaultPayloadConfig: PayloadConfig = {
  messageFieldPreset: "message",
  messageField: "message",
  sessionField: "sessionId",
  conversationField: "conversationId",
  chatField: "chatId",
  historyField: "messages",
  includeHistory: true,
  historyLimit: 20,
  includeTimestamp: true,
  timestampField: "timestamp",
  extraFieldsJson: "",
};

export const defaultResponseConfig: ResponseConfig = {
  responsePath: "",
};

/**
 * The demo configuration shipped on first run. The webhook URL is deliberately
 * empty: the app must never point at a real endpoint the user did not choose.
 */
export function createDefaultAgent(): AgentConfig {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name: "Risk Escalation Agent",
    description:
      "Evaluates AI recommendations and determines whether they should proceed automatically or require human approval.",
    webhookUrl: "",
    approvalWebhookUrl: "",
    apiKey: "",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer",
    method: "POST",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    headers: [],
    payload: { ...defaultPayloadConfig },
    response: { ...defaultResponseConfig },
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankAgent(name = "New Agent"): AgentConfig {
  return { ...createDefaultAgent(), id: uuid(), name, description: "" };
}

/** Fill in any field missing from a persisted (possibly older) config. */
export function normalizeAgent(input: Partial<AgentConfig> | null | undefined): AgentConfig {
  const base = createDefaultAgent();
  if (!input) return base;
  return {
    ...base,
    ...input,
    id: input.id ?? base.id,
    headers: Array.isArray(input.headers) ? input.headers : [],
    payload: { ...base.payload, ...(input.payload ?? {}) },
    response: { ...base.response, ...(input.response ?? {}) },
    timeoutMs:
      typeof input.timeoutMs === "number" && input.timeoutMs > 0 ? input.timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}
