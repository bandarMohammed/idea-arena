"use client";

import { useCallback, useState } from "react";
import type { AgentConfig } from "@/types/agent";
import { useStore } from "@/lib/store/StoreProvider";

export interface TestOutcome {
  ok: boolean;
  detail: string;
  latencyMs?: number;
}

/**
 * Runs a real request against the configured webhook. The agent is only
 * marked Online after this succeeds — the badge never guesses.
 */
export function useConnectionTest() {
  const { setStatus } = useStore();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestOutcome | null>(null);

  const test = useCallback(
    async (agent: AgentConfig): Promise<TestOutcome> => {
      setTesting(true);
      setResult(null);
      setStatus(agent.id, { state: "testing" });

      try {
        const response = await fetch("/api/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent }),
        });
        const data = (await response.json()) as {
          ok: boolean;
          detail?: string;
          latencyMs?: number;
          error?: { message: string };
        };

        const outcome: TestOutcome = data.ok
          ? { ok: true, detail: data.detail ?? "The agent responded successfully.", latencyMs: data.latencyMs }
          : { ok: false, detail: data.error?.message ?? "Connection failed.", latencyMs: data.latencyMs };

        setStatus(agent.id, {
          state: outcome.ok ? "online" : "offline",
          detail: outcome.detail,
          checkedAt: new Date().toISOString(),
          latencyMs: outcome.latencyMs,
        });
        setResult(outcome);
        return outcome;
      } catch {
        const outcome: TestOutcome = { ok: false, detail: "Unable to reach the server to run the test." };
        setStatus(agent.id, {
          state: "offline",
          detail: outcome.detail,
          checkedAt: new Date().toISOString(),
        });
        setResult(outcome);
        return outcome;
      } finally {
        setTesting(false);
      }
    },
    [setStatus],
  );

  return { test, testing, result, setResult };
}
