"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Link2, Settings, XCircle } from "lucide-react";
import { useStore } from "@/lib/store/StoreProvider";
import { useConnectionTest } from "@/hooks/useConnectionTest";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";

/**
 * Onboarding shown when no webhook is configured yet.
 * Deliberately a single decision: paste a URL, test it, start chatting.
 */
export function ConnectAgent() {
  const { activeAgent, saveAgent } = useStore();
  const { test, testing, result } = useConnectionTest();
  const [url, setUrl] = useState(activeAgent?.webhookUrl ?? "");
  const [touched, setTouched] = useState(false);

  const invalid = touched && url.trim().length > 0 && !/^https?:\/\/.+/i.test(url.trim());

  const connect = async () => {
    if (!activeAgent) return;
    const trimmed = url.trim();
    setTouched(true);
    if (!trimmed || !/^https?:\/\/.+/i.test(trimmed)) return;

    const updated = { ...activeAgent, webhookUrl: trimmed };
    saveAgent(updated);
    await test(updated);
  };

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-4 py-10">
      <div className="pointer-events-none absolute inset-0 grid-backdrop" aria-hidden="true" />

      <div className="relative w-full max-w-lg animate-fade-up">
        <div className="mb-7 text-center">
          <Logo showText={false} className="mb-5 scale-125" />
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Connect your AI Agent
          </h1>
          <p className="mx-auto mt-2.5 max-w-sm text-balance text-sm leading-relaxed text-muted">
            Paste the webhook URL of your n8n workflow. Agent Arena works with any agent behind a webhook — no
            code changes required.
          </p>
        </div>

        <div className="card p-5">
          <label htmlFor="connect-webhook" className="label-base">
            n8n Webhook URL
          </label>
          <div className="relative">
            <Link2
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
              aria-hidden="true"
            />
            <Input
              id="connect-webhook"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") connect();
              }}
              placeholder="https://your-instance.app.n8n.cloud/webhook/ai-agent"
              aria-invalid={invalid}
              aria-describedby="connect-webhook-hint"
              className="pl-9 font-mono text-[13px]"
            />
          </div>
          <p id="connect-webhook-hint" className="hint">
            Use the <strong className="font-medium text-muted">Production URL</strong> from your n8n Webhook node
            (the workflow must be active), or the Test URL while the workflow is listening.
          </p>

          <Button
            variant="primary"
            className="mt-4 w-full justify-center"
            onClick={connect}
            loading={testing}
            disabled={!url.trim()}
          >
            {!testing && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            Test Connection
          </Button>

          {invalid && (
            <p role="alert" className="mt-3 text-xs text-danger">
              Enter a full URL starting with http:// or https://
            </p>
          )}

          {result && (
            <div
              className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-sm ${
                result.ok ? "border-ok/30 bg-ok/10" : "border-danger/30 bg-danger/10"
              }`}
              role="status"
            >
              {result.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className={`font-medium ${result.ok ? "text-ok" : "text-danger"}`}>
                  {result.ok ? "Agent Connected" : "Connection Failed"}
                </p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">{result.detail}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            Advanced configuration — payload fields, API key, custom headers
          </Link>
        </div>
      </div>
    </div>
  );
}
