/** Versioned storage keys so a future schema change can migrate cleanly. */
export const STORAGE_KEYS = {
  agents: "agent-arena.agents.v1",
  conversations: "agent-arena.conversations.v1",
  status: "agent-arena.status.v1",
} as const;
