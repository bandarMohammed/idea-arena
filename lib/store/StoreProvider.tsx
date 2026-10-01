"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AgentConfig, AgentStatus } from "@/types/agent";
import type { ChatMessage, Conversation } from "@/types/chat";
import { createDefaultAgent, normalizeAgent } from "@/lib/n8n/defaults";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { readJson, writeJson } from "@/lib/storage/local";
import { uuid } from "@/lib/utils/id";

/**
 * Single source of truth for agents, conversations and connection status.
 *
 * Everything is persisted to localStorage (v1). The shape is intentionally
 * close to what a server-backed API would return, so swapping the persistence
 * layer later does not require touching components.
 */

interface PersistedAgents {
  agents: AgentConfig[];
  activeAgentId: string | null;
}

interface PersistedConversations {
  conversations: Conversation[];
  activeConversationId: string | null;
}

type StatusMap = Record<string, AgentStatus>;

interface StoreValue {
  hydrated: boolean;

  agents: AgentConfig[];
  activeAgent: AgentConfig | null;
  activeAgentId: string | null;
  setActiveAgentId: (id: string) => void;
  saveAgent: (agent: AgentConfig) => void;
  addAgent: (agent: AgentConfig) => void;
  deleteAgent: (id: string) => void;

  status: AgentStatus;
  statusFor: (agentId: string | null) => AgentStatus;
  setStatus: (agentId: string, status: AgentStatus) => void;

  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  newConversation: () => string;
  selectConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  clearConversation: (id: string) => void;

  appendMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  truncateFrom: (conversationId: string, messageId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const UNKNOWN_STATUS: AgentStatus = { state: "unknown" };

export function createConversation(agentId: string | null): Conversation {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title: "New chat",
    sessionId: uuid(),
    agentId,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [activeAgentId, setActiveAgentIdState] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<StatusMap>({});

  // --- hydrate once on the client ---------------------------------------
  useEffect(() => {
    const storedAgents = readJson<PersistedAgents | null>(STORAGE_KEYS.agents, null);
    if (storedAgents?.agents?.length) {
      const list = storedAgents.agents.map(normalizeAgent);
      setAgents(list);
      setActiveAgentIdState(
        storedAgents.activeAgentId && list.some((a) => a.id === storedAgents.activeAgentId)
          ? storedAgents.activeAgentId
          : list[0].id,
      );
    } else {
      const demo = createDefaultAgent();
      setAgents([demo]);
      setActiveAgentIdState(demo.id);
    }

    const storedChats = readJson<PersistedConversations | null>(STORAGE_KEYS.conversations, null);
    if (storedChats?.conversations?.length) {
      setConversations(storedChats.conversations);
      setActiveConversationId(
        storedChats.activeConversationId &&
          storedChats.conversations.some((c) => c.id === storedChats.activeConversationId)
          ? storedChats.activeConversationId
          : storedChats.conversations[0].id,
      );
    }

    // Connection status is never trusted across reloads: an agent only counts
    // as online after a successful Test Connection in this session.
    setStatusMap({});
    setHydrated(true);
  }, []);

  // --- persist ----------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    writeJson(STORAGE_KEYS.agents, { agents, activeAgentId });
  }, [hydrated, agents, activeAgentId]);

  useEffect(() => {
    if (!hydrated) return;
    writeJson(STORAGE_KEYS.conversations, { conversations, activeConversationId });
  }, [hydrated, conversations, activeConversationId]);

  // --- agents -----------------------------------------------------------
  const setActiveAgentId = useCallback((id: string) => setActiveAgentIdState(id), []);

  const saveAgent = useCallback((agent: AgentConfig) => {
    const updated = { ...agent, updatedAt: new Date().toISOString() };
    setAgents((prev) => {
      const exists = prev.some((a) => a.id === agent.id);
      return exists ? prev.map((a) => (a.id === agent.id ? updated : a)) : [...prev, updated];
    });
    // Configuration changed: the previous "online" verdict no longer applies.
    setStatusMap((prev) => {
      if (!prev[agent.id]) return prev;
      const next = { ...prev };
      delete next[agent.id];
      return next;
    });
  }, []);

  const addAgent = useCallback((agent: AgentConfig) => {
    setAgents((prev) => [...prev, agent]);
    setActiveAgentIdState(agent.id);
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setAgents((prev) => {
      const next = prev.filter((a) => a.id !== id);
      const safe = next.length ? next : [createDefaultAgent()];
      setActiveAgentIdState((current) => (current === id ? safe[0].id : current));
      return safe;
    });
  }, []);

  const setStatus = useCallback((agentId: string, status: AgentStatus) => {
    setStatusMap((prev) => ({ ...prev, [agentId]: status }));
  }, []);

  const statusFor = useCallback(
    (agentId: string | null) => (agentId ? (statusMap[agentId] ?? UNKNOWN_STATUS) : UNKNOWN_STATUS),
    [statusMap],
  );

  // --- conversations ----------------------------------------------------
  const newConversation = useCallback(() => {
    const convo = createConversation(activeAgentId);
    setConversations((prev) => [convo, ...prev]);
    setActiveConversationId(convo.id);
    return convo.id;
  }, [activeAgentId]);

  const selectConversation = useCallback((id: string) => setActiveConversationId(id), []);

  const renameConversation = useCallback((id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: clean, updatedAt: new Date().toISOString() } : c)),
    );
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setActiveConversationId((current) => (current === id ? (next[0]?.id ?? null) : current));
      return next;
    });
  }, []);

  const clearConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, messages: [], updatedAt: new Date().toISOString() } : c)),
    );
  }, []);

  const appendMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  }, []);

  const updateMessage = useCallback(
    (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                updatedAt: new Date().toISOString(),
              }
            : c,
        ),
      );
    },
    [],
  );

  const removeMessage = useCallback((conversationId: string, messageId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) } : c,
      ),
    );
  }, []);

  /** Drop the given message and everything after it (used by Regenerate). */
  const truncateFrom = useCallback((conversationId: string, messageId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const index = c.messages.findIndex((m) => m.id === messageId);
        if (index < 0) return c;
        return { ...c, messages: c.messages.slice(0, index) };
      }),
    );
  }, []);

  const activeAgent = useMemo(
    () => agents.find((a) => a.id === activeAgentId) ?? agents[0] ?? null,
    [agents, activeAgentId],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const value: StoreValue = {
    hydrated,
    agents,
    activeAgent,
    activeAgentId: activeAgent?.id ?? null,
    setActiveAgentId,
    saveAgent,
    addAgent,
    deleteAgent,
    status: statusFor(activeAgent?.id ?? null),
    statusFor,
    setStatus,
    conversations,
    activeConversation,
    activeConversationId,
    newConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    clearConversation,
    appendMessage,
    updateMessage,
    removeMessage,
    truncateFrom,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Stable ref to the latest value, for callbacks that must not re-create. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
