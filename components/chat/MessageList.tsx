"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

/**
 * Scrolling transcript. Auto-scrolls on new content, but only when the user is
 * already near the bottom, so reading history is never interrupted.
 */
export function MessageList({
  messages,
  agentName,
  busy,
  onRegenerate,
  onApprove,
}: {
  messages: ChatMessage[];
  agentName: string;
  busy: boolean;
  onRegenerate: (messageId: string) => void;
  onApprove: (messageId: string, decision: "approved" | "rejected", note: string) => Promise<void>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const lastMessage = messages[messages.length - 1];
  const signature = `${messages.length}:${lastMessage?.status ?? ""}:${lastMessage?.content.length ?? 0}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottom.current = distance < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [signature]);

  return (
    <div
      ref={containerRef}
      className="scrollbar-stable flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      role="log"
      aria-live="polite"
      aria-label="Conversation"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-7">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            agentName={agentName}
            isLast={index === messages.length - 1}
            busy={busy}
            onRegenerate={onRegenerate}
            onApprove={onApprove}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
