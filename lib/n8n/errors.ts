/**
 * Maps every failure mode onto a short, user-facing message.
 * Stack traces and raw exception text never reach the browser.
 */

export interface AgentError {
  code: string;
  message: string;
  /** Whether offering a Retry button makes sense. */
  retryable: boolean;
  /** HTTP status to return from our own API route. */
  status: number;
}

export function httpError(status: number, bodySnippet?: string): AgentError {
  const detail = bodySnippet ? ` ${truncate(bodySnippet)}` : "";
  switch (status) {
    case 400:
      return {
        code: "BAD_REQUEST",
        message: `The agent rejected the request (400). The workflow may expect different field names — check Payload Configuration in Settings.${detail}`,
        retryable: false,
        status: 400,
      };
    case 401:
      return {
        code: "UNAUTHORIZED",
        message: "Authentication failed (401). Check the API key configured for this agent.",
        retryable: false,
        status: 401,
      };
    case 403:
      return {
        code: "FORBIDDEN",
        message: "Access to this webhook was denied (403). Verify the credentials and webhook permissions.",
        retryable: false,
        status: 403,
      };
    case 404:
      return {
        code: "NOT_FOUND",
        message:
          "Webhook not found (404). If you are using a test URL, make sure the workflow is listening; for a production URL, make sure the workflow is active.",
        retryable: true,
        status: 404,
      };
    case 405:
      return {
        code: "METHOD_NOT_ALLOWED",
        message: "The webhook rejected this HTTP method (405). Check the Request Method in Settings.",
        retryable: false,
        status: 405,
      };
    case 408:
      return { code: "TIMEOUT", message: "The agent took too long to respond.", retryable: true, status: 504 };
    case 429:
      return {
        code: "RATE_LIMITED",
        message: "Too many requests (429). Wait a moment and try again.",
        retryable: true,
        status: 429,
      };
    default:
      if (status >= 500) {
        return {
          code: "AGENT_ERROR",
          message: `The AI Agent workflow failed (${status}). Check the execution log in n8n.${detail}`,
          retryable: true,
          status: 502,
        };
      }
      return {
        code: "HTTP_ERROR",
        message: `Unexpected response from the agent (${status}).${detail}`,
        retryable: true,
        status: 502,
      };
  }
}

export const ERRORS = {
  noWebhook: (): AgentError => ({
    code: "NO_WEBHOOK",
    message: "No webhook URL is configured. Open Settings to connect your n8n Agent.",
    retryable: false,
    status: 400,
  }),
  invalidUrl: (): AgentError => ({
    code: "INVALID_URL",
    message: "That webhook URL is not valid. It should look like https://your-instance.app.n8n.cloud/webhook/your-path",
    retryable: false,
    status: 400,
  }),
  lockedWebhook: (): AgentError => ({
    code: "WEBHOOK_LOCKED",
    message: "This deployment only allows the server-configured webhook. Client-supplied URLs are disabled.",
    retryable: false,
    status: 403,
  }),
  timeout: (ms: number): AgentError => ({
    code: "TIMEOUT",
    message: `The AI Agent did not respond within ${Math.round(ms / 1000)}s. It may still be running in n8n.`,
    retryable: true,
    status: 504,
  }),
  network: (): AgentError => ({
    code: "NETWORK",
    message: "Unable to connect to the AI Agent. Check the webhook URL and that your n8n instance is reachable.",
    retryable: true,
    status: 502,
  }),
  invalidJson: (): AgentError => ({
    code: "INVALID_JSON",
    message: "The agent returned a response that could not be read as JSON or text.",
    retryable: true,
    status: 502,
  }),
  emptyResponse: (): AgentError => ({
    code: "EMPTY_RESPONSE",
    message:
      'The agent returned an empty response. In n8n, make sure the workflow ends with a "Respond to Webhook" node.',
    retryable: true,
    status: 502,
  }),
  badRequestBody: (): AgentError => ({
    code: "BAD_CLIENT_REQUEST",
    message: "The request sent to the server was malformed.",
    retryable: false,
    status: 400,
  }),
  unknown: (): AgentError => ({
    code: "UNKNOWN",
    message: "Something went wrong while contacting the AI Agent.",
    retryable: true,
    status: 500,
  }),
};

function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
