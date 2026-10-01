import type { RiskAssessment } from "./risk";

export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "sending" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  /** Plain text / markdown content shown to the user. */
  content: string;
  createdAt: string;
  status: MessageStatus;
  /** Structured risk payload, when the agent returned one. */
  risk?: RiskAssessment;
  /** Raw agent response, kept for the "show raw JSON" affordance. */
  raw?: unknown;
  /** Set when the response could not be interpreted as text. */
  isRawJson?: boolean;
  /** User-facing error message for failed turns. */
  error?: string;
  /** The user message that produced this assistant turn, for regenerate. */
  sourceMessageId?: string;
  /** Approval decision already sent for this message, if any. */
  approval?: "approved" | "rejected";
}

export interface Conversation {
  id: string;
  title: string;
  /** Stable session id sent to n8n for memory continuity. */
  sessionId: string;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ConversationsState {
  conversations: Conversation[];
  activeConversationId: string | null;
}

/** Normalized result of a call to the agent. */
export interface AgentReply {
  ok: boolean;
  text: string;
  risk?: RiskAssessment;
  raw?: unknown;
  isRawJson?: boolean;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
