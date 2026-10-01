"use client";

import { Check, Copy } from "lucide-react";
import { useCopy } from "@/hooks/useCopy";

/** Fenced code block with a language chip and a copy button. */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { copy, copied } = useCopy();

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-line bg-canvas">
      <div className="flex items-center justify-between border-b border-line bg-elevated/60 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-faint">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={() => copy(code)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-faint transition-colors hover:bg-line hover:text-ink"
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-ok" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5">
        <code className="font-mono text-[13px] leading-relaxed text-ink">{code}</code>
      </pre>
    </div>
  );
}
