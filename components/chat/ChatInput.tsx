"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_HEIGHT = 200;

/**
 * Auto-growing composer.
 * Enter sends, Shift+Enter inserts a newline, and the control is locked while
 * a request is in flight so the same turn cannot be sent twice.
 */
export function ChatInput({
  onSend,
  disabled,
  busy,
  placeholder = "Message your agent…",
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled || busy) return;
    onSend(text);
    setValue("");
    // Return focus so the user can keep typing without reaching for the mouse.
    requestAnimationFrame(() => ref.current?.focus());
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !busy;

  return (
    <div className="border-t border-line bg-canvas/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-surface p-2 shadow-soft transition-colors",
            "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25",
            disabled ? "border-line opacity-60" : "border-line-strong",
          )}
        >
          <label htmlFor="chat-composer" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-composer"
            ref={ref}
            rows={1}
            value={value}
            disabled={disabled}
            placeholder={disabled ? "Connect your agent in Settings to start chatting" : placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            className="max-h-[200px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-6 text-ink outline-none placeholder:text-faint disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label={busy ? "Waiting for the agent" : "Send message"}
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              canSend
                ? "bg-brand text-brand-ink hover:bg-brand/90"
                : "cursor-not-allowed bg-elevated text-faint",
            )}
          >
            {busy ? (
              <Square className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-faint">
          <kbd className="rounded border border-line bg-elevated px-1 py-0.5 font-sans">Enter</kbd> to send ·{" "}
          <kbd className="rounded border border-line bg-elevated px-1 py-0.5 font-sans">Shift</kbd>
          {" + "}
          <kbd className="rounded border border-line bg-elevated px-1 py-0.5 font-sans">Enter</kbd> for a new line
        </p>
      </div>
    </div>
  );
}
