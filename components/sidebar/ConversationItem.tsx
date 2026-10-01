"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import type { Conversation } from "@/types/chat";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/format";

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const commit = () => {
    const clean = draft.trim();
    if (clean && clean !== conversation.title) onRename(clean);
    else setDraft(conversation.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-brand bg-elevated px-2 py-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(conversation.title);
              setEditing(false);
            }
          }}
          onBlur={commit}
          aria-label="Conversation title"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          aria-label="Save title"
          className="rounded-md p-1 text-ok hover:bg-line"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors",
        active
          ? "border-line-strong bg-elevated"
          : "border-transparent hover:border-line hover:bg-elevated/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <MessageSquare
          className={cn("h-4 w-4 shrink-0", active ? "text-brand" : "text-faint")}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", active ? "text-ink" : "text-muted")}>
            {conversation.title}
          </span>
          <span className="block truncate text-[11px] text-faint">
            {conversation.messages.length} message{conversation.messages.length === 1 ? "" : "s"} ·{" "}
            {formatRelative(conversation.updatedAt)}
          </span>
        </span>
      </button>

      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 transition-opacity",
          confirming ? "opacity-100" : "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
        )}
      >
        {confirming ? (
          <>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Confirm delete ${conversation.title}`}
              className="rounded-md p-1.5 text-danger hover:bg-danger/15"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              aria-label="Cancel delete"
              className="rounded-md p-1.5 text-faint hover:bg-line hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(conversation.title);
                setEditing(true);
              }}
              aria-label={`Rename ${conversation.title}`}
              className="rounded-md p-1.5 text-faint hover:bg-line hover:text-ink"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${conversation.title}`}
              className="rounded-md p-1.5 text-faint hover:bg-danger/15 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
