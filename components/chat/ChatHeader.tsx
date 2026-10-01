"use client";

import Link from "next/link";
import { Eraser, Menu, Settings, Wifi } from "lucide-react";
import type { AgentConfig, AgentStatus } from "@/types/agent";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";

export function ChatHeader({
  agent,
  status,
  messageCount,
  onOpenMenu,
  onClear,
  onTest,
  testing,
}: {
  agent: AgentConfig | null;
  status: AgentStatus;
  messageCount: number;
  onOpenMenu: () => void;
  onClear: () => void;
  onTest: () => void;
  testing: boolean;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-elevated hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-ink">{agent?.name ?? "No agent"}</h1>
        <div className="mt-0.5 flex items-center gap-2">
          <StatusDot state={status.state} title={status.detail} />
          {status.latencyMs !== undefined && status.state === "online" && (
            <span className="text-[11px] text-faint">· {status.latencyMs}ms</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onTest} loading={testing} title="Test the webhook connection">
          {!testing && <Wifi className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="hidden sm:inline">Test</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={messageCount === 0}
          title="Clear this conversation"
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <Link
          href="/settings"
          aria-label="Open settings"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
