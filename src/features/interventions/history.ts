import dayjs from "dayjs";
import { useEffect, useSyncExternalStore } from "react";
import { DATE_FORMAT } from "@/constants/Config";
import { load, store } from "@/state/persisted";
import type { InterventionFeedback } from "@/state/analytics/events";
import { isInterventionId } from "./catalog";
import type { InterventionId } from "./catalog";

/** AsyncStorage key of the intervention history. */
export const STORAGE_KEY = "PIXY_INTERVENTIONS";

/** One finished intervention. */
export interface InterventionRun {
  /** Equals `intervention_session_id` of the run's analytics events. */
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

interface Stored {
  runs: InterventionRun[];
}

/** Format before the history: today's finished ids only. */
interface LegacyStored {
  date: string;
  completed: string[];
}

const isLegacy = (value: Stored | LegacyStored): value is LegacyStored =>
  "completed" in value && Array.isArray(value.completed);

/** Converts the one-day legacy format; unknown ids are dropped. */
const migrateStored = (value: Stored | LegacyStored): Stored => {
  if (!isLegacy(value)) {
    return value;
  }
  const runs: InterventionRun[] = [];
  for (const interventionId of value.completed) {
    if (isInterventionId(interventionId)) {
      runs.push({
        id: `legacy-${value.date}-${interventionId}`,
        interventionId,
        date: value.date,
        completedAt: null,
        feedback: null,
      });
    }
  }
  return { runs };
};

const EMPTY_IDS: InterventionId[] = [];

let stored: Stored = { runs: [] };
let status: "idle" | "loading" | "loaded" | "failed" = "idle";
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

const ensureLoaded = () => {
  if (status !== "idle") {
    return loading ?? Promise.resolve();
  }
  status = "loading";
  loading = (async () => {
    try {
      const value = await load<Stored | LegacyStored>(STORAGE_KEY);
      if (value) {
        stored = migrateStored(value);
      }
      status = "loaded";
    } catch {
      // `load` reported the error. Keep the stored value: never write
      // after a failed read.
      status = "failed";
    }
    emit();
  })();
  return loading;
};

const update = async (next: Stored) => {
  stored = next;
  emit();
  if (status === "loaded") {
    await store(STORAGE_KEY, stored);
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Remember a finished run. A second call with the same `id` is ignored. */
export const addRun = async ({
  id,
  interventionId,
}: {
  id: string;
  interventionId: InterventionId;
}) => {
  await ensureLoaded();
  if (stored.runs.some((run) => run.id === id)) {
    return;
  }
  const now = dayjs();
  await update({
    runs: [
      ...stored.runs,
      {
        id,
        interventionId,
        date: now.format(DATE_FORMAT),
        completedAt: now.toISOString(),
        feedback: null,
      },
    ],
  });
};

/** Store the end check answer of run `id`. */
export const setRunFeedback = async (
  id: string,
  feedback: InterventionFeedback
) => {
  await ensureLoaded();
  if (!stored.runs.some((run) => run.id === id)) {
    return;
  }
  await update({
    runs: stored.runs.map((run) =>
      run.id === id ? { ...run, feedback } : run
    ),
  });
};

/**
 * Every finished run, oldest first. Empty after a failed read; the raw
 * export still holds the stored value.
 */
export const loadRuns = async (): Promise<InterventionRun[]> => {
  await ensureLoaded();
  return stored.runs;
};

/**
 * Replace the whole history, for import and factory reset. Writes even after
 * a failed read: the user asked to replace the data.
 */
export const replaceRuns = async (runs: InterventionRun[]) => {
  await ensureLoaded();
  status = "loaded";
  await update({ runs });
};

let todayCache: {
  runs: InterventionRun[];
  date: string;
  ids: InterventionId[];
} | null = null;

/** Stable per history and day, as `useSyncExternalStore` requires. */
const getCompletedToday = () => {
  const date = dayjs().format(DATE_FORMAT);
  if (todayCache?.runs !== stored.runs || todayCache.date !== date) {
    const ids = new Set<InterventionId>();
    for (const run of stored.runs) {
      if (run.date === date) {
        ids.add(run.interventionId);
      }
    }
    todayCache = {
      runs: stored.runs,
      date,
      ids: ids.size === 0 ? EMPTY_IDS : [...ids],
    };
  }
  return todayCache.ids;
};

/** Interventions finished today, each once, in first completion order. */
export const useCompletedToday = () => {
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, getCompletedToday);
};

/** Test helper: forget the in-memory state. */
export const _resetHistory = () => {
  stored = { runs: [] };
  status = "idle";
  loading = null;
  todayCache = null;
};
