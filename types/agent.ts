/**
 * Agent configuration types.
 *
 * The app is deliberately generic: nothing about a specific n8n workflow is
 * hard-coded. Every field name used in the outgoing payload is configurable so
 * the same frontend can talk to virtually any n8n AI Agent.
 */

export type RequestMethod = "POST" | "GET";

/** Name of the field that carries the user's message in the outgoing payload. */
export type MessageFieldPreset = "message" | "input" | "query" | "prompt" | "chatInput" | "custom";

export interface CustomHeader {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface PayloadConfig {
  /** Which preset is selected in the UI. */
  messageFieldPreset: MessageFieldPreset;
  /** Resolved field name for the user message, e.g. "message" or "chatInput". */
  messageField: string;
  /** Field name for the session id, e.g. "sessionId". */
  sessionField: string;
  /** Field name for the conversation id. */
  conversationField: string;
  /** Field name for the chat id. */
  chatField: string;
  /** Field name for the message history array. */
  historyField: string;
  /** Include the full conversation history in the payload. */
  includeHistory: boolean;
  /** How many previous messages to include (0 = all). */
  historyLimit: number;
  /** Include an ISO timestamp field. */
  includeTimestamp: boolean;
  /** Field name for the timestamp. */
  timestampField: string;
  /**
   * Extra static JSON merged into every request body. Stored as raw text so the
   * user can edit freely; validated before use.
   */
  extraFieldsJson: string;
}

export interface ResponseConfig {
  /**
   * Optional dot-path telling the parser exactly where the reply text lives,
   * e.g. "data.result.answer". When empty, the smart parser is used.
   */
  responsePath: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  webhookUrl: string;
  /** Optional separate webhook that receives HITL approve/reject events. */
  approvalWebhookUrl: string;
  /** Optional API key. Never rendered in plain text once saved. */
  apiKey: string;
  /** Header used to transmit the API key. */
  apiKeyHeader: string;
  /** Prefix for the API key value, e.g. "Bearer". Empty for a raw value. */
  apiKeyPrefix: string;
  method: RequestMethod;
  timeoutMs: number;
  headers: CustomHeader[];
  payload: PayloadConfig;
  response: ResponseConfig;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionState = "unknown" | "testing" | "online" | "offline";

export interface AgentStatus {
  state: ConnectionState;
  /** Short, user-facing detail. Never a stack trace. */
  detail?: string;
  checkedAt?: string;
  latencyMs?: number;
}

export interface AgentsState {
  agents: AgentConfig[];
  activeAgentId: string | null;
}
