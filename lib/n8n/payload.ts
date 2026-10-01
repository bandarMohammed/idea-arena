import type { AgentConfig } from "@/types/agent";

export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface BuildPayloadInput {
  message: string;
  chatId: string;
  sessionId: string;
  conversationId: string;
  history?: HistoryItem[];
  /** Extra fields merged last, used by the connection test and HITL events. */
  overrides?: Record<string, unknown>;
}

/**
 * Build the request body using the field names configured in Settings.
 *
 * Every key is configurable because n8n workflows disagree on naming: the
 * built-in Chat Trigger expects `chatInput`, hand-rolled Webhook nodes usually
 * read `message` or `query`, and LangChain nodes often want `input`.
 */
export function buildPayload(agent: AgentConfig, input: BuildPayloadInput): Record<string, unknown> {
  const cfg = agent.payload;
  const body: Record<string, unknown> = {};

  body[cfg.messageField || "message"] = input.message;
  if (cfg.chatField) body[cfg.chatField] = input.chatId;
  if (cfg.sessionField) body[cfg.sessionField] = input.sessionId;
  if (cfg.conversationField) body[cfg.conversationField] = input.conversationId;
  if (cfg.includeTimestamp && cfg.timestampField) {
    body[cfg.timestampField] = new Date().toISOString();
  }

  if (cfg.includeHistory && cfg.historyField && input.history?.length) {
    const limit = cfg.historyLimit > 0 ? cfg.historyLimit : input.history.length;
    body[cfg.historyField] = input.history.slice(-limit).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  const extra = parseExtraFields(cfg.extraFieldsJson);
  Object.assign(body, extra, input.overrides ?? {});
  return body;
}

/** Parse the user-supplied "extra fields" JSON, ignoring invalid input. */
export function parseExtraFields(raw: string): Record<string, unknown> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function isValidExtraFields(raw: string): boolean {
  if (!raw || !raw.trim()) return true;
  try {
    const parsed = JSON.parse(raw);
    return !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

/** Encode a flat payload as a query string for GET-style webhooks. */
export function toQueryString(body: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value == null) continue;
    params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  return params.toString();
}
