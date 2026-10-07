import { z } from "zod";
import { createStructuredError } from "@/lib/errors";
import { INTERVENTION_FEEDBACKS } from "@/state/analytics/events";
import type { InterventionFeedback } from "@/state/analytics/events";
import { isInterventionId } from "./catalog";
import type { InterventionId } from "./catalog";

/** AsyncStorage key of the intervention history. */
export const STORAGE_KEY = "PIXY_INTERVENTIONS";

/** One finished intervention. */
export interface InterventionRun {
  /** Random id of this run, unrelated to analytics ids. */
  id: string;
  interventionId: InterventionId;
  /** Local day the run finished, `YYYY-MM-DD`. */
  date: string;
  /**
   * ISO time the last step finished. `null` for runs saved before the
   * history existed: the old format kept only the day.
   */
  completedAt: string | null;
  /** End check answer. `null` until answered, or when skipped. */
  feedback: InterventionFeedback | null;
}

/** Intervention history state. Readiness lives in `useInterventionHistoryLoad()`. */
export interface InterventionHistoryState {
  /** Oldest first. */
  runs: InterventionRun[];
}

/**
 * Value under {@link STORAGE_KEY}: the run list, or the format before the
 * history, which kept today's finished ids only. Unvalidated JSON.
 */
export type StoredHistory =
  | InterventionHistoryState
  | { date: string; completed: string[] };

/**
 * Shape of a stored or imported run. A run without `id`, a valid `date`, or
 * a known intervention is dropped; a bad `completedAt` or `feedback` becomes
 * `null`, so files from newer versions still import.
 */
const RunSchema = z.object({
  id: z.string(),
  interventionId: z.custom<InterventionId>(isInterventionId),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  // oxlint-disable-next-line promise/prefer-await-to-then -- zod `.catch()` is a schema fallback, not a promise.
  completedAt: z.iso.datetime().nullable().catch(null),
  // oxlint-disable-next-line promise/prefer-await-to-then -- zod `.catch()` is a schema fallback, not a promise.
  feedback: z.enum(INTERVENTION_FEEDBACKS).nullable().catch(null),
});

/**
 * Cleans runs from storage or a backup file, both unvalidated JSON: drops
 * invalid runs and repeated ids, keeps the order. Not a list gives an empty
 * history.
 */
export const sanitizeRuns = (runs: InterventionRun[]): InterventionRun[] => {
  const list = z.array(z.unknown()).safeParse(runs);
  if (!list.success) {
    return [];
  }
  const ids = new Set<string>();
  const clean: InterventionRun[] = [];
  for (const item of list.data) {
    const result = RunSchema.safeParse(item);
    if (result.success && !ids.has(result.data.id)) {
      ids.add(result.data.id);
      clean.push(result.data);
    }
  }
  return clean;
};

const CurrentSchema = z.object({ runs: z.array(z.unknown()) });

const LegacySchema = z.object({
  date: z.string(),
  completed: z.array(z.string()),
});

/**
 * Builds state from the stored value. An unknown shape throws, so the store
 * keeps the stored value and never writes.
 */
export const hydrate = (
  stored: StoredHistory | null
): InterventionHistoryState => {
  if (stored === null) {
    return { runs: [] };
  }
  const current = CurrentSchema.safeParse(stored);
  if (current.success && "runs" in stored) {
    return { runs: sanitizeRuns(stored.runs) };
  }
  const legacy = LegacySchema.safeParse(stored);
  if (legacy.success) {
    const { date, completed } = legacy.data;
    const runs: InterventionRun[] = [];
    for (const interventionId of completed) {
      if (isInterventionId(interventionId)) {
        runs.push({
          id: `legacy-${date}-${interventionId}`,
          interventionId,
          date,
          completedAt: null,
          feedback: null,
        });
      }
    }
    return { runs: sanitizeRuns(runs) };
  }
  throw createStructuredError({
    status: "intervention_history_invalid",
    message: "Intervention history could not be read",
    why: `Storage key "${STORAGE_KEY}" holds neither a run list nor the legacy day format`,
    fix: "Export raw data from Settings, then contact support",
  });
};
