import { NextResponse } from "next/server";
import { callAgent, isValidWebhookUrl } from "@/lib/n8n/client";
import { ERRORS } from "@/lib/n8n/errors";
import { parseAgentResponse } from "@/lib/n8n/parser";
import { buildPayload } from "@/lib/n8n/payload";
import { resolveConfig } from "@/lib/n8n/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/test-connection
 *
 * Sends a real (but clearly marked) probe message to the webhook. The agent is
 * only reported Online when the workflow actually answers.
 */
export async function POST(request: Request) {
  let body: { agent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: ERRORS.badRequestBody() }, { status: 400 });
  }

  const resolved = resolveConfig(body.agent);

  if (!resolved.webhookUrl) {
    const error = resolved.locked ? ERRORS.lockedWebhook() : ERRORS.noWebhook();
    return NextResponse.json({ ok: false, error }, { status: error.status });
  }
  if (!isValidWebhookUrl(resolved.webhookUrl)) {
    return NextResponse.json({ ok: false, error: ERRORS.invalidUrl() }, { status: 400 });
  }

  const payload = buildPayload(resolved.agent, {
    message: "Connection test from Agent Arena. Please reply with a short confirmation.",
    chatId: "connection-test",
    sessionId: "connection-test",
    conversationId: "connection-test",
    history: [],
    overrides: { isTest: true, source: "agent-arena-connection-test" },
  });

  // Probes use a shorter ceiling so the UI never appears to hang.
  const timeoutMs = Math.min(resolved.timeoutMs, 20_000);
  const result = await callAgent(resolved.agent, payload, {
    webhookUrl: resolved.webhookUrl,
    apiKey: resolved.apiKey,
    timeoutMs,
  });

  if (!result.ok || result.error) {
    const error = result.error ?? ERRORS.unknown();
    return NextResponse.json(
      { ok: false, error, latencyMs: result.latencyMs },
      { status: 200 }, // the test itself succeeded in running; the verdict is in the body
    );
  }

  const parsed = parseAgentResponse(result.data, resolved.agent.response?.responsePath ?? "");
  const preview = parsed.text ? truncate(parsed.text) : "Workflow responded with an empty body.";

  return NextResponse.json({
    ok: true,
    latencyMs: result.latencyMs,
    status: result.status,
    detail: `Agent responded in ${result.latencyMs}ms. ${preview}`,
    parsedAsRawJson: parsed.isRawJson,
    riskDetected: !!parsed.risk,
  });
}

function truncate(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
