"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { useChat } from "@/hooks/useChat";
import { useConnectionTest } from "@/hooks/useConnectionTest";
import { useToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ConnectAgent } from "./ConnectAgent";
import { EmptyChat } from "./EmptyChat";
import { MessageList } from "./MessageList";
import { cn } from "@/lib/utils/cn";

/**
 * Top-level chat layout: persistent sidebar on desktop, drawer on mobile.
 */
export function ChatShell() {
  const store = useStore();
  const { send, regenerate, sendApproval, isSending } = useChat();
  const { test, testing } = useConnectionTest();
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { activeAgent, activeConversation, status, hydrated } = store;
  const configured = !!activeAgent?.webhookUrl;
  const messages = activeConversation?.messages ?? [];

  // Close the drawer on Escape, and lock body scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const handleTest = async () => {
    if (!activeAgent) return;
    const outcome = await test(activeAgent);
    toast.push(outcome.ok ? "success" : "error", outcome.detail);
  };

  const handleClear = () => {
    if (activeConversation) store.clearConversation(activeConversation.id);
  };

  const handleApprove = async (messageId: string, decision: "approved" | "rejected", note: string) => {
    const outcome = await sendApproval(messageId, decision, note);
    toast.push(outcome.ok ? "success" : "error", outcome.message);
  };

  // Avoid a flash of the onboarding screen before localStorage is read.
  if (!hydrated) {
    return (
      <div className="grid h-dvh place-items-center bg-canvas">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" role="status">
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <div className="hidden w-[300px] shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] animate-slide-in shadow-lift">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main className={cn("flex min-w-0 flex-1 flex-col")}>
        <ChatHeader
          agent={activeAgent}
          status={status}
          messageCount={messages.length}
          onOpenMenu={() => setDrawerOpen(true)}
          onClear={handleClear}
          onTest={handleTest}
          testing={testing}
        />

        {!configured ? (
          <ConnectAgent />
        ) : messages.length === 0 ? (
          <EmptyChat agent={activeAgent} onPick={(prompt) => void send(prompt)} />
        ) : (
          <MessageList
            messages={messages}
            agentName={activeAgent?.name ?? "Agent"}
            busy={isSending}
            onRegenerate={(id) => void regenerate(id)}
            onApprove={handleApprove}
          />
        )}

        {configured && (
          <ChatInput onSend={(text) => void send(text)} busy={isSending} disabled={!configured} />
        )}
      </main>
    </div>
  );
}
