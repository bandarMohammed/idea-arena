"use client";

import { ShieldAlert, Sparkles, Workflow } from "lucide-react";
import type { AgentConfig } from "@/types/agent";

const SUGGESTIONS = [
  {
    icon: ShieldAlert,
    title: "Evaluate a recommendation",
    prompt:
      "Evaluate this recommendation: automatically issue a $500,000 refund to a enterprise customer after a billing error.",
  },
  {
    icon: Workflow,
    title: "Explain a decision",
    prompt: "Walk me through how you decide whether an action needs human approval.",
  },
  {
    icon: Sparkles,
    title: "Quick check",
    prompt: "Hello — are you connected and ready?",
  },
];

/** Shown when the agent is configured but the conversation is still empty. */
export function EmptyChat({ agent, onPick }: { agent: AgentConfig | null; onPick: (prompt: string) => void }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-4 py-10">
      <div className="pointer-events-none absolute inset-0 grid-backdrop" aria-hidden="true" />

      <div className="relative w-full max-w-2xl animate-fade-up text-center">
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink">
          {agent?.name ?? "Your agent"}
        </h2>
        {agent?.description && (
          <p className="mx-auto mt-2.5 max-w-md text-balance text-sm leading-relaxed text-muted">
            {agent.description}
          </p>
        )}

        <div className="mt-8 grid gap-2.5 sm:grid-cols-3">
          {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
            <button
              key={title}
              type="button"
              onClick={() => onPick(prompt)}
              className="group rounded-xl border border-line bg-surface p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
              <span className="mt-2.5 block text-sm font-medium text-ink">{title}</span>
              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-faint">{prompt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
