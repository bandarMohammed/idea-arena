import type { AgentConfig } from "@/types/agent";
import { normalizeAgent } from "./defaults";

/**
 * Reconciles the client-supplied agent config with server-side environment
 * variables.
 *
 * Env vars always win. A production deployment can therefore keep the webhook
 * URL and API key entirely server-side (and set N8N_LOCK_WEBHOOK=true to
 * refuse browser-supplied URLs altogether) without any frontend change.
 */

export interface ResolvedConfig {
  agent: AgentConfig;
  webhookUrl: string;
  approvalWebhookUrl: string;
  apiKey: string;
  timeoutMs: number;
  /** Set when the deployment forbids client-supplied webhook URLs. */
  locked: boolean;
}

export function envFlag(name: string): boolean {
  const value = process.env[name];
  return value === "true" || value === "1";
}

export function resolveConfig(rawAgent: unknown): ResolvedConfig {
  const agent = normalizeAgent(rawAgent as Partial<AgentConfig>);

  const locked = envFlag("N8N_LOCK_WEBHOOK");
  const envWebhook = process.env.N8N_WEBHOOK_URL?.trim() ?? "";
  const envApproval = process.env.N8N_APPROVAL_WEBHOOK_URL?.trim() ?? "";
  const envApiKey = process.env.N8N_API_KEY?.trim() ?? "";
  const envTimeout = Number(process.env.N8N_TIMEOUT_MS);

  if (process.env.N8N_API_KEY_HEADER) agent.apiKeyHeader = process.env.N8N_API_KEY_HEADER;
  if (process.env.N8N_API_KEY_PREFIX !== undefined) agent.apiKeyPrefix = process.env.N8N_API_KEY_PREFIX;

  return {
    agent,
    webhookUrl: locked ? envWebhook : envWebhook || agent.webhookUrl,
    approvalWebhookUrl: locked ? envApproval : envApproval || agent.approvalWebhookUrl,
    apiKey: envApiKey || agent.apiKey,
    timeoutMs:
      Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : (agent.timeoutMs ?? 60_000),
    locked,
  };
}
