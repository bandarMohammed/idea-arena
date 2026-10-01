import type { AgentConfig } from "@/types/agent";
import { ERRORS, httpError, type AgentError } from "./errors";
import { toQueryString } from "./payload";

/**
 * Server-side n8n caller used by the API routes.
 *
 * Keeping the actual fetch on the server means we can later add auth, rate
 * limiting, logging or streaming without touching the frontend, and it lets a
 * deployment keep its API key in an env var instead of the browser.
 */

export interface CallResult {
  ok: boolean;
  /** Parsed JSON when possible, otherwise the raw text. */
  data?: unknown;
  error?: AgentError;
  status?: number;
  latencyMs: number;
}

export function isValidWebhookUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Build the outgoing headers: custom headers first, then the API key. */
export function buildHeaders(agent: AgentConfig, apiKeyOverride?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  };

  for (const header of agent.headers ?? []) {
    if (!header.enabled) continue;
    const key = header.key?.trim();
    if (!key) continue;
    headers[key] = header.value ?? "";
  }

  const apiKey = (apiKeyOverride || agent.apiKey || "").trim();
  if (apiKey) {
    const headerName = (agent.apiKeyHeader || "Authorization").trim();
    const prefix = (agent.apiKeyPrefix ?? "").trim();
    headers[headerName] = prefix ? `${prefix} ${apiKey}` : apiKey;
  }

  return headers;
}

export async function callAgent(
  agent: AgentConfig,
  body: Record<string, unknown>,
  options: { webhookUrl?: string; apiKey?: string; timeoutMs?: number } = {},
): Promise<CallResult> {
  const started = Date.now();
  const url = (options.webhookUrl || agent.webhookUrl || "").trim();

  if (!url) return { ok: false, error: ERRORS.noWebhook(), latencyMs: 0 };
  if (!isValidWebhookUrl(url)) return { ok: false, error: ERRORS.invalidUrl(), latencyMs: 0 };

  const timeoutMs = options.timeoutMs ?? agent.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const method = agent.method === "GET" ? "GET" : "POST";
    const target = method === "GET" ? appendQuery(url, toQueryString(body)) : url;

    const response = await fetch(target, {
      method,
      headers: buildHeaders(agent, options.apiKey),
      body: method === "GET" ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    });

    const raw = await safeReadText(response);
    const latencyMs = Date.now() - started;

    if (!response.ok) {
      return { ok: false, error: httpError(response.status, raw), status: response.status, latencyMs };
    }

    if (!raw || !raw.trim()) {
      return { ok: false, error: ERRORS.emptyResponse(), status: response.status, latencyMs };
    }

    // Prefer JSON, but a text/plain reply is perfectly usable.
    let data: unknown = raw;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("json") || /^\s*[[{"]/.test(raw)) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw; // malformed JSON: hand the text to the parser instead
      }
    }

    return { ok: true, data, status: response.status, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - started;
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: ERRORS.timeout(timeoutMs), latencyMs };
    }
    // Deliberately not surfacing err.message: it can leak internal details.
    return { ok: false, error: ERRORS.network(), latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function appendQuery(url: string, query: string): string {
  if (!query) return url;
  return url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
}
