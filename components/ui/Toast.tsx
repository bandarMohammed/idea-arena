"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { uuid } from "@/lib/utils/id";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<{ push: (tone: ToastTone, message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const item = { id: uuid(), tone, message };
    setItems((prev) => [...prev.slice(-2), item]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => (
          <Toast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "error" ? AlertTriangle : Info;

  return (
    <div
      className={cn(
        "pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl border bg-elevated/95 p-3 shadow-lift backdrop-blur",
        item.tone === "success" && "border-ok/30",
        item.tone === "error" && "border-danger/30",
        item.tone === "info" && "border-line-strong",
      )}
      role={item.tone === "error" ? "alert" : "status"}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          item.tone === "success" && "text-ok",
          item.tone === "error" && "text-danger",
          item.tone === "info" && "text-muted",
        )}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-0.5 text-faint transition-colors hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      push: () => {
        /* no-op outside the provider */
      },
    }
  );
}
