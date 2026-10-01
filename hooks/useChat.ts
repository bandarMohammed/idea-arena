"use client";

import { useCallback, useRef, useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import type { AgentReply, ChatMessage, Conversation } from "@/types/chat";
import { deriveTitle } from "@/lib/utils/format";
import { uuid } from "@/lib/utils/id";

/**
 * Chat orchestration: builds the request, talks to /api/chat and folds the
 * normalized reply back into the conversation.
 *
 * The request always goes through our own API route rather than straight to
 * n8n, so authentication, rate limiting or streaming can be added server-side
 * without changing any component.
 */
export function useChat() {
  const store = useStore();
  const [isSending, setIsSending] = useState(false);
  /** Guards against double submits racing each other. */
  const inFlight = useRef(false);

  const callAgent = useCallback(
    async (conversation: Conversation, history: ChatMessage[], userText: string, placeholderId: string) => {
      const agent = store.activeAgent;
      if (!agent) return;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent,
            message: userText,
            chatId: conversation.id,
            conversationId: conversation.id,
            sessionId: conversation.sessionId,
            history: history
              .filter((m) => m.status !== "error" && m.content)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        let reply: AgentReply;
        try {
          reply = (await response.json()) as AgentReply;
        } catch {
          reply = {
            ok: false,
            text: "",
            error: { code: "INVALID_JSON", message: "The server returned an unreadable response.", retryable: true },
          };
        }

        if (reply.ok) {
          store.updateMessage(conversation.id, placeholderId, {
            content: reply.text,
            status: "complete",
            risk: reply.risk,
            raw: reply.raw,
            isRawJson: reply.isRawJson,
            error: undefined,
          });
        } else {
          store.updateMessage(conversation.id, placeholderId, {
            content: "",
            status: "error",
            error: reply.error?.message ?? "Unable to connect to the AI Agent.",
          });
        }
      } catch {
        store.updateMessage(conversation.id, placeholderId, {
          content: "",
          status: "error",
          error: "Unable to reach the server. Check your connection and try again.",
        });
      }
    },
    [store],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || inFlight.current) return;

      const agent = store.activeAgent;
      if (!agent) return;

      // Make sure there is a conversation to write into.
      let conversation = store.activeConversation;
      if (!conversation) {
        const id = store.newConversation();
        conversation = {
          id,
          title: "New chat",
          sessionId: uuid(),
          agentId: agent.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        };
      }

      inFlight.current = true;
      setIsSending(true);

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: uuid(),
        role: "user",
        content,
        createdAt: now,
        status: "complete",
      };
      const placeholder: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content: "",
        createdAt: now,
        status: "sending",
        sourceMessageId: userMessage.id,
      };

      const history = conversation.messages;
      store.appendMessage(conversation.id, userMessage);
      store.appendMessage(conversation.id, placeholder);

      if (!history.length) {
        store.renameConversation(conversation.id, deriveTitle(content));
      }

      await callAgent(conversation, history, content, placeholder.id);

      inFlight.current = false;
      setIsSending(false);
    },
    [store, callAgent],
  );

  /** Re-run the user turn that produced the given assistant message. */
  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (inFlight.current) return;
      const conversation = store.activeConversation;
      if (!conversation) return;

      const index = conversation.messages.findIndex((m) => m.id === assistantMessageId);
      if (index < 1) return;

      // The preceding user message is the prompt to replay.
      let userIndex = index - 1;
      while (userIndex >= 0 && conversation.messages[userIndex].role !== "user") userIndex -= 1;
      if (userIndex < 0) return;

      const userText = conversation.messages[userIndex].content;
      const history = conversation.messages.slice(0, userIndex);

      inFlight.current = true;
      setIsSending(true);

      store.updateMessage(conversation.id, assistantMessageId, {
        content: "",
        status: "sending",
        error: undefined,
        risk: undefined,
        raw: undefined,
        isRawJson: false,
        approval: undefined,
      });

      await callAgent(conversation, history, userText, assistantMessageId);

      inFlight.current = false;
      setIsSending(false);
    },
    [store, callAgent],
  );

  /** Send a human-in-the-loop decision to the configured approval webhook. */
  const sendApproval = useCallback(
    async (messageId: string, decision: "approved" | "rejected", note?: string) => {
      const agent = store.activeAgent;
      const conversation = store.activeConversation;
      if (!agent || !conversation) return { ok: false, message: "No active agent." };

      const message = conversation.messages.find((m) => m.id === messageId);

      try {
        const response = await fetch("/api/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent,
            decision,
            note: note ?? "",
            messageId,
            conversationId: conversation.id,
            sessionId: conversation.sessionId,
            risk: message?.risk ?? null,
          }),
        });
        const data = (await response.json()) as { ok: boolean; error?: { message: string } };

        if (data.ok) {
          store.updateMessage(conversation.id, messageId, { approval: decision });
          return { ok: true, message: decision === "approved" ? "Approval sent." : "Rejection sent." };
        }
        return { ok: false, message: data.error?.message ?? "Could not send the decision." };
      } catch {
        return { ok: false, message: "Could not reach the server to send the decision." };
      }
    },
    [store],
  );

  return { send, regenerate, sendApproval, isSending };
}
