"use client";

import { useState } from "react";
import { Check, X, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

/**
 * Human-in-the-loop control. The decision is POSTed to /api/approval, which
 * forwards it to the approval webhook (or the main webhook) configured in
 * Settings.
 */
export function ApprovalCard({
  decision,
  onDecide,
  disabled,
}: {
  decision?: "approved" | "rejected";
  onDecide: (value: "approved" | "rejected", note: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);

  if (decision) {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
          decision === "approved" ? "border-ok/30 bg-ok/10 text-ok" : "border-danger/30 bg-danger/10 text-danger",
        )}
        role="status"
      >
        {decision === "approved" ? (
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <X className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="font-medium">
          {decision === "approved" ? "Approved and sent to n8n." : "Rejected and sent to n8n."}
        </span>
      </div>
    );
  }

  const submit = async (value: "approved" | "rejected") => {
    setPending(value);
    try {
      await onDecide(value, note.trim());
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-xl border border-line-strong bg-canvas/60 p-3.5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Your decision
      </div>

      <Textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note sent with your decision…"
        aria-label="Decision note"
        className="mb-3 text-sm"
        disabled={!!pending || disabled}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          className="bg-ok text-canvas hover:bg-ok/90"
          loading={pending === "approved"}
          disabled={!!pending || disabled}
          onClick={() => submit("approved")}
        >
          {pending !== "approved" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          loading={pending === "rejected"}
          disabled={!!pending || disabled}
          onClick={() => submit("rejected")}
        >
          {pending !== "rejected" && <X className="h-3.5 w-3.5" aria-hidden="true" />}
          Reject
        </Button>
      </div>
    </div>
  );
}
