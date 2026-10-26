import type { LoggerRecovery } from "@/state/logger-recovery";

// Snapshot the user chose to continue, handed from the launch prompt to the
// logger route. Kept in memory: route params end up in navigation state and
// breadcrumbs, and the snapshot holds the note text.
let restored: LoggerRecovery | null = null;

/** Hand `recovery` to the logger route the prompt opens next. */
export const setRestoredDraft = (recovery: LoggerRecovery) => {
  restored = recovery;
};

/** Snapshot handed over for the entry `id`, or `null`. */
export const getRestoredDraft = (id: string | undefined) =>
  id !== undefined && restored?.draft.id === id ? restored : null;

/** Drop the handed-over snapshot once its logger closes. */
export const clearRestoredDraft = () => {
  restored = null;
};
