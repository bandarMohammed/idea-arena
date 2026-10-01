# Agent Arena

A professional chat interface for **any AI Agent built in n8n**.

Paste an n8n webhook URL, run a connection test, and start chatting. Nothing about a specific
workflow is hard-coded: the request field names, the authentication headers and the response parsing
are all configurable from the UI, so the same frontend can drive virtually any n8n agent without a
code change.

```
User → Chat UI → /api/chat → n8n Webhook → AI Agent → /api/chat → Chat UI
```

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **React 19** and
**lucide-react**. No separate backend.

---

## Table of contents

1. [Features](#features)
2. [Installation](#installation)
3. [Environment variables](#environment-variables)
4. [Creating the n8n webhook](#creating-the-n8n-webhook)
5. [Request format](#request-format-what-this-app-sends)
6. [Response formats](#response-formats-what-this-app-accepts)
7. [Human-in-the-loop (HITL) workflow](#human-in-the-loop-hitl-workflow)
8. [Example n8n workflow](#example-n8n-workflow)
9. [Error handling](#error-handling)
10. [Project structure](#project-structure)
11. [Security notes](#security-notes)
12. [Deploying to Vercel](#deploying-to-vercel)
13. [Troubleshooting](#troubleshooting)

---

## Features

**Chat**
- Sidebar with conversation history, new chat, rename, delete and switching
- Markdown rendering with syntax-aware code blocks and copy buttons
- Per-message copy, regenerate and "show raw JSON"
- Typing indicator, timestamps, auto-scroll (that yields when you scroll up)
- `Enter` sends, `Shift+Enter` inserts a newline, input locks while a request is in flight

**n8n integration**
- Configurable webhook URL, HTTP method, timeout, API key and custom headers
- Configurable payload field names (`message` / `chatInput` / `input` / `query` / `prompt` / custom)
- Configurable session, chat, conversation, history and timestamp field names
- Extra static JSON merged into every request
- Live request preview in Settings
- Smart response parser with an optional explicit dot-path override

**Risk escalation / HITL**
- Automatic detection of risk payloads, rendered as a structured risk card
- `RiskBadge`, `ConfidenceBar`, `RiskFactorCard`, `DecisionStatus`, `ApprovalCard` components
- Approve / Reject buttons that post the decision to a configurable approval webhook

**Other**
- Connection test — the agent is only shown as **Online** after a real successful request
- Multi-agent architecture (add agents in Settings, switch from the sidebar)
- Dark, responsive UI; sidebar becomes a drawer on mobile
- Keyboard navigation, focus rings, ARIA labels, live regions, reduced-motion support

---

## Installation

Requires **Node.js 18.18+** (tested on Node 20).

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>.

Other scripts:

```bash
npm run build       # production build
npm run start       # serve the production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run dev:webpack # dev server using the legacy webpack compiler
```

> `npm run dev` uses **Turbopack** (`next dev --turbo`). This is deliberate: the legacy webpack dev
> server can hang at "Starting…" when the project lives in a cloud-synced folder on Windows
> (OneDrive, Dropbox, iCloud) because of file-watching behaviour. Turbopack is unaffected. If you
> need webpack for some reason, use `npm run dev:webpack`. Production builds (`npm run build`) use
> webpack either way and are unaffected.

On first run the app ships a demo agent called **Risk Escalation Agent** with an **empty** webhook
URL — no real endpoint is ever bundled. Until you set one, the app shows a
"Connect your AI Agent" screen.

---

## Environment variables

**All environment variables are optional.** Without any of them, the app is configured entirely from
the browser (settings are kept in `localStorage`), which is ideal for development and demos.

Copy `.env.example` to `.env.local` to use them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `N8N_WEBHOOK_URL` | – | Server-side webhook URL. **Overrides** whatever the browser sends. |
| `N8N_APPROVAL_WEBHOOK_URL` | – | Server-side approval (HITL) webhook URL. |
| `N8N_API_KEY` | – | API key injected server-side. The browser never sees it. |
| `N8N_API_KEY_HEADER` | `Authorization` | Header used to send the API key. |
| `N8N_API_KEY_PREFIX` | `Bearer` | Prefix for the key value. Set to an empty string to send it raw. |
| `N8N_TIMEOUT_MS` | `60000` | Request timeout in milliseconds. |
| `N8N_LOCK_WEBHOOK` | `false` | When `true`, browser-supplied webhook URLs are **refused**; only `N8N_WEBHOOK_URL` is used. Recommended for production. |

---

## Creating the n8n webhook

1. In n8n, create a new workflow and add a **Webhook** node.
2. Set **HTTP Method** to `POST`.
3. Set a **Path**, for example `ai-agent`.
4. Set **Respond** to **Using 'Respond to Webhook' Node**.
5. Add your **AI Agent** (or Basic LLM Chain) node and wire the webhook into it.
   The user's message arrives at `{{ $json.body.message }}` (see the field names below).
6. End the workflow with a **Respond to Webhook** node.
7. **Activate** the workflow and copy the **Production URL**.
8. Paste that URL into Agent Arena and press **Test Connection**.

> **Test URL vs Production URL**
> The Test URL only answers while you have clicked "Listen for test event" in n8n and it accepts a
> single request. The Production URL requires the workflow to be **Active**. A `404` from the webhook
> almost always means one of these two conditions is not met.

---

## Request format (what this app sends)

Default `POST` body:

```json
{
  "message": "Evaluate this recommendation",
  "chatId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "sessionId": "9b2e5c71-2a4e-4f0b-9c3e-1d2a3b4c5d6e",
  "conversationId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "timestamp": "2026-10-01T09:12:34.567Z",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Every key above is **renameable** in **Settings → Payload Configuration**, because workflows
disagree on naming:

| Your workflow | Set "Message Field" to |
| --- | --- |
| Hand-built **Webhook** node | `message` (default) |
| n8n **Chat Trigger** / LangChain Chat | `chatInput` |
| **Basic LLM Chain** | `input` |
| Retrieval / search workflows | `query` |
| Direct model nodes | `prompt` |
| Anything else | `Custom…` |

You can also rename the session / chat / conversation / history fields, disable history or the
timestamp, cap how many previous messages are sent, and merge extra static JSON (e.g.
`{"tenantId": "acme"}`) into every request. The **Request Preview** in Settings shows the exact body
that will be sent.

`sessionId` is stable per conversation, which is what n8n memory nodes (Window Buffer Memory, Postgres
Chat Memory, …) use as their session key.

If you set **Request Method** to `GET`, the same fields are sent as a query string instead.

---

## Response formats (what this app accepts)

The parser is deliberately permissive. All of these work out of the box:

```json
{ "output": "Hello" }
{ "response": "Hello" }
{ "message": "Hello" }
{ "text": "Hello" }
{ "answer": "Hello" }
{ "reply": "Hello" }
{ "result": "Hello" }
{ "content": "Hello" }
[ { "output": "Hello" } ]
{ "data": { "json": { "answer": "Hello" } } }
```

Plain `text/plain` bodies work too, as does JSON served with the wrong content type.

**How it resolves the text**

1. If **Response Path** is set in Settings (e.g. `data.result.answer` or `0.output`), that wins.
2. Otherwise the parser unwraps common containers (single-key `json` / `body` / `data` / `result` /
   `payload` / `response` / `output`, and single-element arrays) and looks for the first known text
   key, searching recursively up to 6 levels. Multi-item arrays are concatenated.
3. If the payload is a risk assessment, the risk card is rendered.
4. If nothing matches, the raw JSON is shown formatted in the chat — **the app never breaks on an
   unexpected shape**.

---

## Human-in-the-loop (HITL) workflow

When a response contains a risk level or a decision, Agent Arena renders a **risk card** instead of
plain text:

```json
{
  "riskLevel": "HIGH",
  "confidence": 0.87,
  "financialImpact": 500000,
  "reversibility": "LOW",
  "operationalRisk": "HIGH",
  "action": "HITL_REQUIRED",
  "reason": "High financial impact and low reversibility.",
  "recommendation": "Human approval required."
}
```

Renders as: 🔴 **HIGH** · Confidence 87% · $500,000 · Reversibility LOW · Operational Risk HIGH ·
**Decision: Human Approval Required** · reason + recommendation · **[ Approve ] [ Reject ]**

A low-risk response renders the same card with a green **Auto Proceed** decision and no buttons:

```json
{
  "riskLevel": "LOW",
  "confidence": 0.94,
  "action": "AUTO_PROCEED",
  "reason": "Low impact, fully reversible.",
  "recommendation": "Proceed automatically."
}
```

**Field tolerance.** `riskLevel` / `risk_level` / `risk` / `severity` are all accepted;
`action` / `decision` / `outcome` likewise. Values are matched loosely, so `"human_approval"`,
`"needs review"` and `"HITL_REQUIRED"` all map to the same decision. Confidence may be `0.87` or
`87`. Any additional scalar fields are shown as extra factors. If `action` is missing it is inferred
from the risk level (`HIGH`/`CRITICAL` → approval required, `LOW` → auto proceed).

**When the user clicks Approve or Reject**, this is POSTed to the **Approval Webhook URL** (or the
main webhook if none is configured):

```json
{
  "type": "hitl_decision",
  "decision": "approved",
  "approved": true,
  "note": "optional note typed by the reviewer",
  "messageId": "…",
  "conversationId": "…",
  "sessionId": "…",
  "risk": { "riskLevel": "HIGH", "action": "HITL_REQUIRED", "...": "..." },
  "timestamp": "2026-10-01T09:14:00.000Z"
}
```

In n8n, branch on `{{ $json.body.type === "hitl_decision" }}` to resume or cancel the pending action.
An empty response body is accepted as a valid acknowledgement for this endpoint.

---

## Example n8n workflow

```
Webhook (POST /webhook/ai-agent)
   ↓
Set / Code            ← normalize input, read $json.body.message
   ↓
AI Agent              ← your model + tools + memory (keyed on sessionId)
   ↓
Risk Evaluation       ← Code node that scores the recommendation
   ↓
Respond to Webhook
```

The webhook receives:

```json
{
  "message": "Evaluate this recommendation",
  "chatId": "...",
  "sessionId": "..."
}
```

A **Code** node for the risk step might end with:

```javascript
// Respond to Webhook will return this object as the response body.
const impact = $json.financialImpact ?? 0;
const reversible = $json.reversibility ?? "HIGH";
const highRisk = impact >= 100000 || reversible === "LOW";

return [
  {
    json: highRisk
      ? {
          riskLevel: "HIGH",
          confidence: 0.87,
          financialImpact: impact,
          reversibility: reversible,
          operationalRisk: "HIGH",
          action: "HITL_REQUIRED",
          reason: "High financial impact and low reversibility.",
          recommendation: "Human approval required.",
        }
      : {
          riskLevel: "LOW",
          confidence: 0.94,
          action: "AUTO_PROCEED",
          reason: "Low impact and fully reversible.",
          recommendation: "Proceed automatically.",
        },
  },
];
```

A plain chat agent needs nothing special — just return `{ "output": "..." }`.

---

## Error handling

Every failure mode produces a short, actionable message plus a **Retry** button where retrying makes
sense. Stack traces and raw exception text are never shown to the user.

| Situation | What the user sees |
| --- | --- |
| No webhook configured | "No webhook URL is configured. Open Settings to connect your n8n Agent." |
| Malformed URL | "That webhook URL is not valid. It should look like https://…" |
| `400` | "The agent rejected the request (400). The workflow may expect different field names — check Payload Configuration in Settings." |
| `401` | "Authentication failed (401). Check the API key configured for this agent." |
| `403` | "Access to this webhook was denied (403)." |
| `404` | "Webhook not found (404). …make sure the workflow is listening / active." |
| `405` | "The webhook rejected this HTTP method (405)." |
| `429` | "Too many requests (429). Wait a moment and try again." |
| `5xx` | "The AI Agent workflow failed (500). Check the execution log in n8n." |
| Timeout | "The AI Agent did not respond within 60s. It may still be running in n8n." |
| Network error / unreachable | "Unable to connect to the AI Agent. Check the webhook URL and that your n8n instance is reachable." |
| Empty body | "The agent returned an empty response. …make sure the workflow ends with a 'Respond to Webhook' node." |
| Unparseable shape | The raw JSON is displayed in the chat instead of an error. |

---

## Project structure

```
app/
  layout.tsx                 Root layout, providers, skip link
  page.tsx                   Chat
  globals.css                Design tokens, markdown styles
  settings/page.tsx          Settings
  api/
    chat/route.ts            POST — send a message to the agent
    test-connection/route.ts POST — probe the webhook
    approval/route.ts        POST — HITL approve / reject
components/
  chat/      ChatShell, ChatHeader, ChatInput, MessageList, MessageBubble,
             Markdown, CodeBlock, TypingIndicator, ConnectAgent, EmptyChat
  sidebar/   Sidebar, ConversationItem
  settings/  SettingsForm, SettingsSection, HeadersEditor, ApiKeyField
  risk/      RiskCard, RiskBadge, ConfidenceBar, RiskFactorCard,
             DecisionStatus, ApprovalCard
  ui/        Button, Field, StatusDot, Toast, Logo
lib/
  n8n/       client.ts, parser.ts, payload.ts, errors.ts,
             defaults.ts, server-config.ts
  storage/   local.ts, keys.ts
  store/     StoreProvider.tsx
  utils/     cn.ts, format.ts, id.ts
hooks/       useChat, useConnectionTest, useCopy, useMediaQuery
types/       agent.ts, chat.ts, risk.ts
```

### Why an API route?

The browser never calls n8n directly. Everything goes through `POST /api/chat`, which lets you add
authentication, API-key protection, rate limiting, logging, streaming or multi-agent routing
server-side **without changing a single component**.

---

## Security notes

> **Client-side webhook configuration is suitable for development/demo environments. Production
> deployments should proxy requests through a server-side API route when secrets or private
> credentials are involved.**

This app already proxies every request through `/api/chat`. To take full advantage of that in
production, set `N8N_WEBHOOK_URL` and `N8N_API_KEY` as server environment variables and
`N8N_LOCK_WEBHOOK=true`. The server-side values take precedence, the API key is injected on the
server, and browser-supplied webhook URLs are refused.

Without those variables, the agent configuration — including any API key you enter — is stored in the
browser's `localStorage`. That is fine for local development and demos, but it means the key is
readable by anything with access to that browser profile, and it is sent from the browser to your own
API route on each request. Saved keys are displayed masked in the UI and revealing one is an explicit
action.

Other measures in place:

- `dangerouslySetInnerHTML` is **not used anywhere** in this codebase.
- `rehype-raw` is deliberately **not installed**, so raw HTML inside an agent response is rendered as
  literal text — `<script>` tags cannot execute.
- Link and image URLs are passed through a protocol allowlist (`http`, `https`, `mailto`, `tel`,
  relative, anchors), so `javascript:` and `data:` URLs are stripped.
- Links open with `rel="noopener noreferrer nofollow"`.
- Webhook URLs are validated to be `http`/`https` before any request is made.
- Requests are abort-controlled with a configurable timeout.
- Upstream error bodies are truncated and sanitized before being surfaced.

Note that the server-side fetch will call whatever URL is configured; if you expose this app to
untrusted users, run it with `N8N_LOCK_WEBHOOK=true` so they cannot point it at arbitrary hosts.

---

## Deploying to Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import it. The framework is detected automatically; no build
   settings need changing (`npm run build`, output handled by Next.js).
3. Optionally add the environment variables from the table above under
   **Settings → Environment Variables**. For a production deployment:
   - `N8N_WEBHOOK_URL`
   - `N8N_APPROVAL_WEBHOOK_URL`
   - `N8N_API_KEY`
   - `N8N_LOCK_WEBHOOK=true`
4. Deploy.

Your n8n instance must be reachable from Vercel's servers — a `localhost` webhook URL will not work
from a deployed app. Use n8n Cloud or a publicly reachable self-hosted instance.

The API routes run on the Node.js runtime and are marked `force-dynamic`, so they are never cached.
Keep the timeout below your Vercel plan's function limit (10s on Hobby, 60s+ on Pro); set
`N8N_TIMEOUT_MS` accordingly.

---

## Troubleshooting

**"Webhook not found (404)"** — the workflow is not active (production URL) or not listening (test
URL).

**"The agent rejected the request (400)"** — the workflow expects different field names. Open
**Settings → Payload Configuration** and change the Message Field; `chatInput` is the usual answer
for Chat Trigger workflows.

**The reply shows as raw JSON** — the parser could not find a text field. Set **Response Path** in
Settings to the exact location, e.g. `data.result.answer`, or return one of the standard keys.

**"The agent returned an empty response"** — the workflow is missing a **Respond to Webhook** node,
or the Webhook node's *Respond* setting is not "Using 'Respond to Webhook' Node".

**Status stays "Not connected" after a reload** — this is intentional. The agent is only reported
Online after a successful Test Connection in the current session, so the badge never guesses.

**Settings are gone** — they live in `localStorage` per browser profile and origin. Private windows
and cleared site data start fresh.

**`npm run dev` hangs at "Starting…"** — you are probably running the webpack dev server
(`npm run dev:webpack`) from a cloud-synced folder on Windows. Use `npm run dev`, which runs
Turbopack, or move the project outside the synced folder.

---

## License

MIT
