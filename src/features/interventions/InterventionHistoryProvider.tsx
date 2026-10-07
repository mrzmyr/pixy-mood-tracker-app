import dayjs from "dayjs";
import { useMemo } from "react";
import { DATE_FORMAT } from "@/constants/Config";
import type { InterventionFeedback } from "@/state/analytics/events";
import { createPersistedStore } from "@/state/persisted/createPersistedStore";
import type { Load } from "@/state/persisted/createPersistedStore";
import type { InterventionId } from "./catalog";
import { hydrate, sanitizeRuns, STORAGE_KEY } from "./history";
import type {
  InterventionHistoryState,
  InterventionRun,
  StoredHistory,
} from "./history";

type StateAction =
  | { type: "add"; payload: Pick<InterventionRun, "id" | "interventionId"> }
  | {
      type: "feedback";
      payload: { id: string; feedback: InterventionFeedback };
    }
  | { type: "import"; payload: InterventionRun[] }
  | { type: "reset" };

interface UpdaterValue {
  /** Remember a finished run. A second call with the same `id` is ignored. */
  addRun: (run: Pick<InterventionRun, "id" | "interventionId">) => void;
  /** Store the end check answer of run `id`. */
  setFeedback: (id: string, feedback: InterventionFeedback) => void;
  /** Replace the whole history with `runs`, e.g. from a backup. */
  import: (runs: InterventionRun[]) => void;
  reset: () => void;
}

const reducer = (
  state: InterventionHistoryState,
  action: StateAction
): InterventionHistoryState => {
  switch (action.type) {
    case "add": {
      if (state.runs.some((run) => run.id === action.payload.id)) {
        return state;
      }
      const now = dayjs();
      return {
        runs: [
          ...state.runs,
          {
            ...action.payload,
            date: now.format(DATE_FORMAT),
            completedAt: now.toISOString(),
            feedback: null,
          },
        ],
      };
    }
    case "feedback": {
      const { id, feedback } = action.payload;
      return {
        runs: state.runs.map((run) =>
          run.id === id ? { ...run, feedback } : run
        ),
      };
    }
    case "import": {
      return { runs: sanitizeRuns(action.payload) };
    }
    case "reset": {
      return { runs: [] };
    }
    default: {
      return state;
    }
  }
};

const historyStore = createPersistedStore<
  InterventionHistoryState,
  StateAction,
  undefined,
  StoredHistory
>({
  key: STORAGE_KEY,
  name: "InterventionHistory",
  initial: () => ({ runs: [] }),
  hydrate,
  reducer,
});

/** Intervention history store. Never blocks the app on a failed read. */
const InterventionHistoryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => <historyStore.Provider>{children}</historyStore.Provider>;

const useInterventionRuns = (): InterventionRun[] =>
  historyStore.useState().runs;

const useInterventionHistoryUpdater = (): UpdaterValue => {
  const dispatch = historyStore.useDispatch();
  return useMemo(
    () => ({
      addRun: (run) => dispatch({ type: "add", payload: run }),
      setFeedback: (id, feedback) =>
        dispatch({ type: "feedback", payload: { id, feedback } }),
      import: (runs) => dispatch({ type: "import", payload: runs }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [dispatch]
  );
};

/** Load status; `error` means a history exists but could not be read. */
const useInterventionHistoryLoad = (): Load => historyStore.useLoad();

/** Interventions finished today, each once, in first completion order. */
const useCompletedToday = (): InterventionId[] => {
  const runs = useInterventionRuns();
  const today = dayjs().format(DATE_FORMAT);
  return useMemo(() => {
    const ids = new Set<InterventionId>();
    for (const run of runs) {
      if (run.date === today) {
        ids.add(run.interventionId);
      }
    }
    return [...ids];
  }, [runs, today]);
};

export {
  InterventionHistoryProvider,
  useCompletedToday,
  useInterventionHistoryLoad,
  useInterventionHistoryUpdater,
  useInterventionRuns,
};
