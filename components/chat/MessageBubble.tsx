"use client";

import React, { useState } from "react";
import { AlertTriangle, Braces, Check, Copy, RefreshCw, RotateCcw, User } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { Markdown } from "./Markdown";
import { TypingIndicator } from "./TypingIndicator";
import { CodeBlock } from "./CodeBlock";
import { RiskCard } from "@/components/risk/RiskCard";
import { Button } from "@/components/ui/Button";
import { useCopy } from "@/hooks/useCopy";
import { cn } from "@/lib/utils/cn";
import { formatTime } from "@/lib/utils/format";
import { toPrettyJson } from "@/lib/n8n/parser";

interface MessageBubbleProps {
  message: ChatMessage;
  agentName: string;
  isLast: boolean;
  busy: boolean;
  onRegenerate: (messageId: string) => void;
  onApprove: (messageId: string, decision: "approved" | "rejected", note: string) => Promise<void>;
}

export function MessageBubble({
  message,
  agentName,
  isLast,
  busy,
  onRegenerate,
  onApprove,
}: MessageBubbleProps) {
  const { copy, copied } = useCopy();
  const [showRaw, setShowRaw] = useState(false);
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex animate-fade-up justify-end gap-3">
        <div className="flex min-w-0 max-w-[min(42rem,85%)] flex-col items-end">
          <div className="rounded-2xl rounded-br-md border border-brand/25 bg-brand/15 px-4 py-2.5">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-ink">
              {message.content}
            </p>
          </div>
          <time className="mt-1 px-1 text-[11px] text-faint" dateTime={message.createdAt}>
            {formatTime(message.createdAt)}
          </time>
        </div>
        <div
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-elevated"
          aria-hidden="true"
        >
          <User className="h-4 w-4 text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-up gap-3">
      <div
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand/60"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path
            d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"
            stroke="rgb(var(--brand-ink))"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.4" fill="rgb(var(--brand-ink))" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-sm font-medium text-ink">{agentName}</span>
          <time className="text-[11px] text-faint" dateTime={message.createdAt}>
            {formatTime(message.createdAt)}
          </time>
        </div>

        {message.status === "sending" && <TypingIndicator name={agentName} />}

        {message.status === "error" && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5" role="alert">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-danger">Unable to connect to the AI Agent.</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{message.error}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => onRegenerate(message.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {message.status === "complete" && (
          <div className="space-y-3">
            {message.risk && (
              <RiskCard
                risk={message.risk}
                approval={message.approval}
                onDecide={(decision, note) => onApprove(message.id, decision, note)}
              />
            )}

            {message.content && message.isRawJson && (
              <div>
                <p className="mb-2 text-sm text-muted">
                  The agent replied with data this app could not read as text. Raw response:
                </p>
                <CodeBlock code={message.content} language="json" />
              </div>
            )}

            {message.content && !message.isRawJson && !message.risk && <Markdown content={message.content} />}

            {/* A risk card plus commentary: show the text underneath the card. */}
            {message.content && !message.isRawJson && message.risk && message.content !== message.risk.recommendation && (
              <Markdown content={message.content} />
            )}

            {showRaw && message.raw !== undefined && (
              <CodeBlock code={toPrettyJson(message.raw)} language="json" />
            )}

            <div
              className={cn(
                "flex flex-wrap items-center gap-1 transition-opacity",
                isLast ? "opacity-100" : "opacity-0 focus-within:opacity-100 hover:opacity-100",
              )}
            >
              <IconAction
                label={copied ? "Copied" : "Copy message"}
                onClick={() => copy(message.content)}
                icon={copied ? Check : Copy}
                active={copied}
              />
              <IconAction
                label="Regenerate response"
                onClick={() => onRegenerate(message.id)}
                icon={RefreshCw}
                disabled={busy}
              />
              {message.raw !== undefined && (
                <IconAction
                  label={showRaw ? "Hide raw JSON" : "Show raw JSON"}
                  onClick={() => setShowRaw((v) => !v)}
                  icon={Braces}
                  active={showRaw}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  icon: Icon,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
        "hover:bg-elevated hover:text-ink disabled:cursor-not-allowed disabled:opacity-40",
        active ? "text-ok" : "text-faint",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
