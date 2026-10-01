"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Wifi,
  XCircle,
} from "lucide-react";
import type { AgentConfig, MessageFieldPreset } from "@/types/agent";
import { useStore } from "@/lib/store/StoreProvider";
import { useConnectionTest } from "@/hooks/useConnectionTest";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { StatusDot } from "@/components/ui/StatusDot";
import { SettingsSection } from "./SettingsSection";
import { HeadersEditor } from "./HeadersEditor";
import { ApiKeyField } from "./ApiKeyField";
import { buildPayload, isValidExtraFields } from "@/lib/n8n/payload";
import { createBlankAgent, DEFAULT_TIMEOUT_MS } from "@/lib/n8n/defaults";
import { toPrettyJson } from "@/lib/n8n/parser";
import { CodeBlock } from "@/components/chat/CodeBlock";

const MESSAGE_PRESETS: Array<{ value: MessageFieldPreset; label: string; note: string }> = [
  { value: "message", label: "message", note: "Most hand-built Webhook workflows" },
  { value: "chatInput", label: "chatInput", note: "n8n Chat Trigger / LangChain Chat" },
  { value: "input", label: "input", note: "Basic LLM Chain nodes" },
  { value: "query", label: "query", note: "Retrieval / search workflows" },
  { value: "prompt", label: "prompt", note: "Direct model nodes" },
  { value: "custom", label: "Custom…", note: "Any field name you need" },
];

export function SettingsForm() {
  const store = useStore();
  const toast = useToast();
  const { test, testing, result, setResult } = useConnectionTest();

  const [draft, setDraft] = useState<AgentConfig | null>(null);
  const [dirty, setDirty] = useState(false);

  // Load the active agent into a local draft so edits are explicit.
  useEffect(() => {
    if (store.activeAgent) {
      setDraft(store.activeAgent);
      setDirty(false);
      setResult(null);
    }
  }, [store.activeAgent, setResult]);

  const patch = (changes: Partial<AgentConfig>) => {
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev));
    setDirty(true);
  };

  const patchPayload = (changes: Partial<AgentConfig["payload"]>) => {
    setDraft((prev) => (prev ? { ...prev, payload: { ...prev.payload, ...changes } } : prev));
    setDirty(true);
  };

  const extraFieldsValid = draft ? isValidExtraFields(draft.payload.extraFieldsJson) : true;
  const urlValid = !draft?.webhookUrl || /^https?:\/\/.+/i.test(draft.webhookUrl.trim());
  const approvalUrlValid = !draft?.approvalWebhookUrl || /^https?:\/\/.+/i.test(draft.approvalWebhookUrl.trim());
  const canSave = !!draft && urlValid && approvalUrlValid && extraFieldsValid;

  const preview = useMemo(() => {
    if (!draft) return "";
    try {
      return toPrettyJson(
        buildPayload(draft, {
          message: "Evaluate this recommendation",
          chatId: "c1f2…",
          sessionId: "s9a0…",
          conversationId: "c1f2…",
          history: [
            { role: "user", content: "Previous question" },
            { role: "assistant", content: "Previous answer" },
          ],
        }),
      );
    } catch {
      return "{}";
    }
  }, [draft]);

  if (!draft) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" role="status">
          <span className="sr-only">Loading settings</span>
        </div>
      </div>
    );
  }

  const save = () => {
    if (!canSave) {
      toast.push("error", "Fix the highlighted fields before saving.");
      return;
    }
    store.saveAgent(draft);
    setDirty(false);
    toast.push("success", "Settings saved.");
  };

  const runTest = async () => {
    // Always test what is on screen, saving first so the two never diverge.
    store.saveAgent(draft);
    setDirty(false);
    const outcome = await test(draft);
    toast.push(outcome.ok ? "success" : "error", outcome.ok ? "Agent connected." : "Connection failed.");
  };

  const status = store.statusFor(draft.id);

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Sticky action bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label="Back to chat"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-elevated hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-ink">Settings</h1>
            <StatusDot state={status.state} title={status.detail} className="mt-0.5" />
          </div>
          <Button variant="secondary" size="sm" onClick={runTest} loading={testing}>
            {!testing && <Wifi className="h-3.5 w-3.5" aria-hidden="true" />}
            Test Connection
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty || !canSave}>
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs text-faint">Configure how this app talks to your n8n Agent.</span>
        </div>

        {result && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3.5 ${
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
              <p className={`text-sm font-medium ${result.ok ? "text-ok" : "text-danger"}`}>
                {result.ok ? "🟢 Connected" : "🔴 Connection Failed"}
              </p>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">{result.detail}</p>
            </div>
          </div>
        )}

        {/* ---------------- Agent configuration ---------------- */}
        <SettingsSection
          title="Agent Configuration"
          description="Identity and endpoint of the AI Agent behind your n8n workflow."
          action={
            store.agents.length > 1 ? (
              <select
                value={draft.id}
                onChange={(e) => store.setActiveAgentId(e.target.value)}
                aria-label="Switch agent"
                className="cursor-pointer rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand"
              >
                {store.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        >
          <Field label="Agent Name" required>
            {(p) => (
              <Input
                {...p}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Risk Escalation Agent"
              />
            )}
          </Field>

          <Field label="Agent Description" hint="Shown on the welcome screen and in the sidebar.">
            {(p) => (
              <Textarea
                {...p}
                rows={2}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Evaluates AI recommendations and determines whether they should proceed automatically or require human approval."
              />
            )}
          </Field>

          <Field
            label="Webhook URL"
            required
            error={urlValid ? undefined : "Enter a full URL starting with http:// or https://"}
            hint="Production URL from your n8n Webhook node. The workflow must be Active for the production URL to respond."
          >
            {(p) => (
              <Input
                {...p}
                type="url"
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                value={draft.webhookUrl}
                onChange={(e) => patch({ webhookUrl: e.target.value })}
                placeholder="https://your-instance.app.n8n.cloud/webhook/ai-agent"
                aria-invalid={!urlValid}
                className="font-mono text-[13px]"
              />
            )}
          </Field>

          <Field
            label="Approval Webhook URL"
            error={approvalUrlValid ? undefined : "Enter a full URL starting with http:// or https://"}
            hint="Optional. Receives human-in-the-loop Approve / Reject events. Leave empty to send decisions back to the main webhook with type: hitl_decision."
          >
            {(p) => (
              <Input
                {...p}
                type="url"
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                value={draft.approvalWebhookUrl}
                onChange={(e) => patch({ approvalWebhookUrl: e.target.value })}
                placeholder="https://your-instance.app.n8n.cloud/webhook/ai-agent-approval"
                aria-invalid={!approvalUrlValid}
                className="font-mono text-[13px]"
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Request Method" hint="POST is correct for almost every n8n webhook.">
              {(p) => (
                <Select
                  {...p}
                  value={draft.method}
                  onChange={(e) => patch({ method: e.target.value as AgentConfig["method"] })}
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </Select>
              )}
            </Field>

            <Field label="Timeout (seconds)" hint="How long to wait before giving up on the agent.">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={5}
                  max={300}
                  value={Math.round(draft.timeoutMs / 1000)}
                  onChange={(e) => {
                    const seconds = Number(e.target.value);
                    patch({
                      timeoutMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_TIMEOUT_MS,
                    });
                  }}
                />
              )}
            </Field>
          </div>
        </SettingsSection>

        {/* ---------------- Authentication ---------------- */}
        <SettingsSection
          title="Authentication"
          description="Optional credentials attached to every request to the webhook."
        >
          <Field label="API Key">
            {() => (
              <ApiKeyField
                value={draft.apiKey}
                saved={!!store.activeAgent?.apiKey && store.activeAgent.apiKey === draft.apiKey}
                onChange={(apiKey) => patch({ apiKey })}
                onClear={() => patch({ apiKey: "" })}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="API Key Header" hint="Header the key is sent in.">
              {(p) => (
                <Input
                  {...p}
                  value={draft.apiKeyHeader}
                  onChange={(e) => patch({ apiKeyHeader: e.target.value })}
                  placeholder="Authorization"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
            <Field label="Value Prefix" hint='e.g. "Bearer". Leave empty to send the raw key.'>
              {(p) => (
                <Input
                  {...p}
                  value={draft.apiKeyPrefix}
                  onChange={(e) => patch({ apiKeyPrefix: e.target.value })}
                  placeholder="Bearer"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-warn/25 bg-warn/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted">
              Settings are stored in this browser&apos;s <code className="font-mono text-[11px]">localStorage</code>,
              which is fine for development and demos. For production, set{" "}
              <code className="font-mono text-[11px]">N8N_API_KEY</code> and{" "}
              <code className="font-mono text-[11px]">N8N_WEBHOOK_URL</code> as server environment variables — the
              API route prefers them and the browser never sees the secret.
            </p>
          </div>

          <div>
            <h3 className="label-base">Custom Headers</h3>
            <HeadersEditor headers={draft.headers} onChange={(headers) => patch({ headers })} />
          </div>
        </SettingsSection>

        {/* ---------------- Payload configuration ---------------- */}
        <SettingsSection
          title="Payload Configuration"
          description="Different n8n workflows expect different field names. Map them here instead of changing code."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Message Field" hint="The field that carries the user's message.">
              {(p) => (
                <Select
                  {...p}
                  value={draft.payload.messageFieldPreset}
                  onChange={(e) => {
                    const presetValue = e.target.value as MessageFieldPreset;
                    patchPayload({
                      messageFieldPreset: presetValue,
                      messageField: presetValue === "custom" ? draft.payload.messageField : presetValue,
                    });
                  }}
                >
                  {MESSAGE_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label} — {preset.note}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {draft.payload.messageFieldPreset === "custom" ? (
              <Field label="Custom Field Name" required>
                {(p) => (
                  <Input
                    {...p}
                    value={draft.payload.messageField}
                    onChange={(e) => patchPayload({ messageField: e.target.value })}
                    placeholder="userMessage"
                    spellCheck={false}
                    className="font-mono text-[13px]"
                  />
                )}
              </Field>
            ) : (
              <Field label="Session ID Field" hint="Used by n8n memory nodes to keep context.">
                {(p) => (
                  <Input
                    {...p}
                    value={draft.payload.sessionField}
                    onChange={(e) => patchPayload({ sessionField: e.target.value })}
                    placeholder="sessionId"
                    spellCheck={false}
                    className="font-mono text-[13px]"
                  />
                )}
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {draft.payload.messageFieldPreset === "custom" && (
              <Field label="Session ID Field">
                {(p) => (
                  <Input
                    {...p}
                    value={draft.payload.sessionField}
                    onChange={(e) => patchPayload({ sessionField: e.target.value })}
                    placeholder="sessionId"
                    spellCheck={false}
                    className="font-mono text-[13px]"
                  />
                )}
              </Field>
            )}
            <Field label="Chat ID Field">
              {(p) => (
                <Input
                  {...p}
                  value={draft.payload.chatField}
                  onChange={(e) => patchPayload({ chatField: e.target.value })}
                  placeholder="chatId"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
            <Field label="Conversation ID Field">
              {(p) => (
                <Input
                  {...p}
                  value={draft.payload.conversationField}
                  onChange={(e) => patchPayload({ conversationField: e.target.value })}
                  placeholder="conversationId"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
            <Field label="History Field">
              {(p) => (
                <Input
                  {...p}
                  value={draft.payload.historyField}
                  onChange={(e) => patchPayload({ historyField: e.target.value })}
                  placeholder="messages"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              checked={draft.payload.includeHistory}
              onChange={(includeHistory) => patchPayload({ includeHistory })}
              label="Send conversation history"
              description="Includes previous turns as [{ role, content }]. Turn off if your workflow uses its own memory node."
            />
            <Toggle
              checked={draft.payload.includeTimestamp}
              onChange={(includeTimestamp) => patchPayload({ includeTimestamp })}
              label="Send timestamp"
              description="Adds an ISO 8601 timestamp to every request."
            />
          </div>

          {draft.payload.includeHistory && (
            <Field label="History Limit" hint="Number of previous messages to include. 0 sends all of them.">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={0}
                  max={200}
                  value={draft.payload.historyLimit}
                  onChange={(e) => patchPayload({ historyLimit: Math.max(0, Number(e.target.value) || 0) })}
                  className="sm:max-w-[160px]"
                />
              )}
            </Field>
          )}

          <Field
            label="Extra Fields (JSON)"
            error={extraFieldsValid ? undefined : "Must be a valid JSON object, e.g. { \"tenantId\": \"acme\" }"}
            hint="Merged into every request body. Useful for tenant ids, routing keys or feature flags."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={draft.payload.extraFieldsJson}
                onChange={(e) => patchPayload({ extraFieldsJson: e.target.value })}
                placeholder={'{\n  "source": "agent-arena"\n}'}
                spellCheck={false}
                aria-invalid={!extraFieldsValid}
                className="font-mono text-[13px]"
              />
            )}
          </Field>

          <div>
            <h3 className="label-base">Request Preview</h3>
            <CodeBlock code={preview} language="json" />
          </div>
        </SettingsSection>

        {/* ---------------- Response parsing ---------------- */}
        <SettingsSection
          title="Response Parsing"
          description="By default the reply text is detected automatically from output, response, message, text, answer, reply, result or content — including inside arrays and nested objects."
        >
          <Field
            label="Response Path (optional)"
            hint='Dot path to the reply text, e.g. "data.result.answer" or "0.output". Leave empty to use automatic detection.'
          >
            {(p) => (
              <Input
                {...p}
                value={draft.response.responsePath}
                onChange={(e) =>
                  setDraft((prev) => {
                    if (!prev) return prev;
                    setDirty(true);
                    return { ...prev, response: { ...prev.response, responsePath: e.target.value } };
                  })
                }
                placeholder="output"
                spellCheck={false}
                className="font-mono text-[13px]"
              />
            )}
          </Field>
        </SettingsSection>

        {/* ---------------- Agents ---------------- */}
        <SettingsSection
          title="Agents"
          description="Add more agents and switch between them from the sidebar. Each one keeps its own webhook and payload configuration."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const agent = createBlankAgent(`Agent ${store.agents.length + 1}`);
                store.addAgent(agent);
                toast.push("success", `${agent.name} created.`);
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add agent
            </Button>
          }
        >
          <ul className="space-y-2">
            {store.agents.map((agent) => {
              const agentStatus = store.statusFor(agent.id);
              const isActive = agent.id === store.activeAgentId;
              return (
                <li
                  key={agent.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 ${
                    isActive ? "border-brand/40 bg-brand/5" : "border-line bg-elevated/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{agent.name}</span>
                      {isActive && (
                        <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-[11px] text-faint">
                      {agent.webhookUrl || "No webhook configured"}
                    </p>
                  </div>
                  <StatusDot state={agentStatus.state} />
                  {!isActive && (
                    <Button size="sm" variant="subtle" onClick={() => store.setActiveAgentId(agent.id)}>
                      Use
                    </Button>
                  )}
                  {store.agents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        store.deleteAgent(agent.id);
                        toast.push("info", `${agent.name} removed.`);
                      }}
                      aria-label={`Delete ${agent.name}`}
                      className="rounded-lg p-1.5 text-faint transition-colors hover:bg-danger/15 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </SettingsSection>

        {/* ---------------- Reset ---------------- */}
        <SettingsSection
          title="Reset"
          description="Discard unsaved edits, or reset this agent's payload mapping back to the defaults."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!dirty}
              onClick={() => {
                if (store.activeAgent) setDraft(store.activeAgent);
                setDirty(false);
                toast.push("info", "Unsaved changes discarded.");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Discard changes
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                const fresh = createBlankAgent(draft.name);
                const reset: AgentConfig = {
                  ...draft,
                  payload: fresh.payload,
                  response: fresh.response,
                  headers: [],
                };
                setDraft(reset);
                setDirty(true);
                toast.push("info", "Payload mapping reset. Save to apply.");
              }}
            >
              Reset payload mapping
            </Button>
          </div>
        </SettingsSection>

        {dirty && (
          <p className="pb-4 text-center text-xs text-warn" role="status">
            You have unsaved changes.
          </p>
        )}
      </div>
    </div>
  );
}
