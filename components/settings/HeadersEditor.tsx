"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CustomHeader } from "@/types/agent";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { uuid } from "@/lib/utils/id";

/** Editor for arbitrary request headers sent to the webhook. */
export function HeadersEditor({
  headers,
  onChange,
}: {
  headers: CustomHeader[];
  onChange: (next: CustomHeader[]) => void;
}) {
  const update = (id: string, patch: Partial<CustomHeader>) =>
    onChange(headers.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  return (
    <div className="space-y-2.5">
      {headers.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-3.5 py-4 text-center text-xs text-faint">
          No custom headers. Add one if your workflow expects a specific header.
        </p>
      )}

      {headers.map((header, index) => (
        <div key={header.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input
            type="checkbox"
            checked={header.enabled}
            onChange={(e) => update(header.id, { enabled: e.target.checked })}
            aria-label={`Enable header ${header.key || index + 1}`}
            className="h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong bg-elevated accent-[rgb(var(--brand))]"
          />
          <Input
            value={header.key}
            onChange={(e) => update(header.id, { key: e.target.value })}
            placeholder="Header-Name"
            aria-label={`Header name ${index + 1}`}
            spellCheck={false}
            className="flex-1 font-mono text-[13px]"
          />
          <Input
            value={header.value}
            onChange={(e) => update(header.id, { value: e.target.value })}
            placeholder="value"
            aria-label={`Header value ${index + 1}`}
            spellCheck={false}
            className="flex-1 font-mono text-[13px]"
          />
          <button
            type="button"
            onClick={() => onChange(headers.filter((h) => h.id !== header.id))}
            aria-label={`Remove header ${header.key || index + 1}`}
            className="shrink-0 rounded-lg p-2 text-faint transition-colors hover:bg-danger/15 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}

      <Button
        size="sm"
        variant="subtle"
        onClick={() => onChange([...headers, { id: uuid(), key: "", value: "", enabled: true }])}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add header
      </Button>
    </div>
  );
}
