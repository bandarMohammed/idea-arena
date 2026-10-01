import { NextResponse } from "next/server";
import { callAgent } from "@/lib/n8n/client";
import { ERRORS } from "@/lib/n8n/errors";
import { parseAgentResponse } from "@/lib/n8n/parser";
import { buildPayload, type HistoryItem } from "@/lib/n8n/payload";
import { resolveConfig } from "@/lib/n8n/server-config";
import type { AgentReply } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 *
 * Frontend -> /api/chat -> n8n webhook -> AI Agent -> back again.
 *
 * Going through our own route (instead of calling n8n from the browser) is
 * what makes auth, rate limiting, logging, streaming and multi-agent routing
 * additions possible later without touching the client.
 */
export async function POST(request: Request) {
  let body: {
    agent?: unknown;
    message?: unknown;
    chatId?: unknown;
    sessionId?: unknown;
    conversationId?: unknown;
    history?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return fail(ERRORS.badRequestBody());
  }

  const message = typeof body.message === "string" ? body.message : "";
  if (!message.trim()) {
    return fail({ ...ERRORS.badRequestBody(), message: "The message is empty." });
  }

  const resolved = resolveConfig(body.agent);
  if (!resolved.webhookUrl) {
    return fail(resolved.locked ? ERRORS.lockedWebhook() : ERRORS.noWebhook());
  }

  const history = Array.isArray(body.history)
    ? (body.history as HistoryItem[]).filter(
        (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
      )
    : [];

  const payload = buildPayload(resolved.agent, {
    message,
    chatId: asString(body.chatId),
    sessionId: asString(body.sessionId),
    conversationId: asString(body.conversationId),
    history,
  });

  const result = await callAgent(resolved.agent, payload, {
    webhookUrl: resolved.webhookUrl,
    apiKey: resolved.apiKey,
    timeoutMs: resolved.timeoutMs,
  });

  if (!result.ok || result.error) {
    const error = result.error ?? ERRORS.unknown();
    return fail(error);
  }

  const parsed = parseAgentResponse(result.data, resolved.agent.response?.responsePath ?? "");

  if (!parsed.text && !parsed.risk) {
    return fail(ERRORS.emptyResponse());
  }

  const reply: AgentReply = {
    ok: true,
    text: parsed.text,
    risk: parsed.risk,
    isRawJson: parsed.isRawJson,
    raw: result.data,
  };

  return NextResponse.json(reply);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function fail(error: { code: string; message: string; retryable: boolean; status: number }) {
  const reply: AgentReply = {
    ok: false,
    text: "",
    error: { code: error.code, message: error.message, retryable: error.retryable },
  };
  return NextResponse.json(reply, { status: error.status });
}
