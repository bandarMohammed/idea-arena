"use client";

import Link from "next/link";
import { Plus, Settings, X } from "lucide-react";
import { useStore } from "@/lib/store/StoreProvider";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { StatusDot } from "@/components/ui/StatusDot";
import { ConversationItem } from "./ConversationItem";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const {
    agents,
    activeAgent,
    setActiveAgentId,
    status,
    conversations,
    activeConversationId,
    newConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
  } = useStore();

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-line bg-surface"
      aria-label="Conversations and agent"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
        <Logo />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="px-3 pt-3">
        <Button
          variant="primary"
          className="w-full justify-center"
          onClick={() => {
            newConversation();
            onClose?.();
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Chat
        </Button>
      </div>

      {/* Agent selector — the architecture supports many agents; the MVP
          ships with one, and extra agents can be added in Settings. */}
      <div className="px-3 pt-3">
        <div className="rounded-xl border border-line bg-elevated/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-faint">Active agent</span>
            <StatusDot state={status.state} title={status.detail} />
          </div>

          {agents.length > 1 ? (
            <>
              <label htmlFor="agent-select" className="sr-only">
                Select agent
              </label>
              <select
                id="agent-select"
                value={activeAgent?.id ?? ""}
                onChange={(e) => setActiveAgentId(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="truncate text-sm font-medium text-ink">{activeAgent?.name ?? "No agent"}</p>
          )}

          {activeAgent?.description && (
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-faint">
              {activeAgent.description}
            </p>
          )}
        </div>
      </div>

      <nav className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Conversation history">
        <h2 className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-faint">History</h2>
        {conversations.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs leading-relaxed text-faint">
            No conversations yet.
            <br />
            Start one to see it here.
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <ConversationItem
                  conversation={conversation}
                  active={conversation.id === activeConversationId}
                  onSelect={() => {
                    selectConversation(conversation.id);
                    onClose?.();
                  }}
                  onRename={(title) => renameConversation(conversation.id, title)}
                  onDelete={() => deleteConversation(conversation.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
