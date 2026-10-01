import { NextResponse } from "next/server";
import { callAgent } from "@/lib/n8n/client";
import { ERRORS } from "@/lib/n8n/errors";
import { resolveConfig } from "@/lib/n8n/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/approval
 *
 * Human-in-the-loop decisions. The event goes to the dedicated approval
 * webhook when one is configured, otherwise back to the main webhook so a
 * single workflow can branch on `type: "hitl_decision"`.
 */
export async function POST(request: Request) {
  let body: {
    agent?: unknown;
    decision?: unknown;
    note?: unknown;
    messageId?: unknown;
    conversationId?: unknown;
    sessionId?: unknown;
    risk?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: ERRORS.badRequestBody() }, { status: 400 });
  }

  const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;
  if (!decision) {
    return NextResponse.json(
      { ok: false, error: { ...ERRORS.badRequestBody(), message: "Invalid decision." } },
      { status: 400 },
    );
  }

  const resolved = resolveConfig(body.agent);
  const target = resolved.approvalWebhookUrl || resolved.webhookUrl;

  if (!target) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NO_APPROVAL_WEBHOOK",
          message: "No approval webhook is configured. Add one in Settings to send decisions back to n8n.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  const payload = {
    type: "hitl_decision",
    decision,
    approved: decision === "approved",
    note: typeof body.note === "string" ? body.note : "",
    messageId: typeof body.messageId === "string" ? body.messageId : "",
    conversationId: typeof body.conversationId === "string" ? body.conversationId : "",
    sessionId: typeof body.sessionId === "string" ? body.sessionId : "",
    risk: body.risk ?? null,
    timestamp: new Date().toISOString(),
  };

  const result = await callAgent(resolved.agent, payload, {
    webhookUrl: target,
    apiKey: resolved.apiKey,
    timeoutMs: Math.min(resolved.timeoutMs, 30_000),
  });

  // An empty body is a perfectly normal acknowledgement for a fire-and-forget
  // approval webhook, so it is not treated as a failure here.
  if (!result.ok && result.error && result.error.code !== "EMPTY_RESPONSE") {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ ok: true, latencyMs: result.latencyMs, data: result.data ?? null });
}
