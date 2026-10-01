"use client";

import { cn } from "@/lib/utils/cn";
import type { ConnectionState } from "@/types/agent";

const LABELS: Record<ConnectionState, string> = {
  unknown: "Not connected",
  testing: "Checking…",
  online: "Agent Online",
  offline: "Agent Offline",
};

const TONES: Record<ConnectionState, string> = {
  unknown: "bg-faint",
  testing: "bg-warn animate-pulse",
  online: "bg-ok",
  offline: "bg-danger",
};

/**
 * Connection indicator. "Online" is only ever shown after a successful
 * Test Connection in the current session — never inferred.
 */
export function StatusDot({
  state,
  label,
  className,
  title,
}: {
  state: ConnectionState;
  label?: string;
  className?: string;
  title?: string;
}) {
  const text = label ?? LABELS[state];
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xs font-medium", className)}
      title={title}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        {state === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", TONES[state])} />
      </span>
      <span
        className={cn(
          state === "online" && "text-ok",
          state === "offline" && "text-danger",
          state === "testing" && "text-warn",
          state === "unknown" && "text-faint",
        )}
      >
        {text}
      </span>
    </span>
  );
}
