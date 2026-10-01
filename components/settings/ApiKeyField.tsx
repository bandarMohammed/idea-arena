"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { maskSecret } from "@/lib/utils/format";

/**
 * API key input.
 *
 * Once a key is saved it is shown masked; revealing it is an explicit,
 * deliberate action. The value still lives in localStorage, which is why the
 * README recommends the server-side `N8N_API_KEY` env var for production.
 */
export function ApiKeyField({
  value,
  saved,
  onChange,
  onClear,
}: {
  value: string;
  saved: boolean;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(!saved);
  const [revealed, setRevealed] = useState(false);

  if (saved && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-elevated px-3.5 py-2.5">
        <KeyRound className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-muted">
          {revealed ? value : maskSecret(value)}
        </code>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide API key" : "Reveal API key"}
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-line hover:text-ink"
        >
          {revealed ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
        <Button size="sm" variant="subtle" onClick={() => setEditing(true)}>
          Change
        </Button>
        <button
          type="button"
          onClick={() => {
            onClear();
            setEditing(true);
            setRevealed(false);
          }}
          aria-label="Remove API key"
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-danger/15 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your API key (optional)"
        autoComplete="off"
        spellCheck={false}
        aria-label="API key"
        className="font-mono text-[13px]"
      />
      {saved && (
        <Button size="md" variant="subtle" onClick={() => setEditing(false)}>
          Done
        </Button>
      )}
    </div>
  );
}
