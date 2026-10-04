import dayjs from "dayjs";
import { useEffect, useSyncExternalStore } from "react";
import { DATE_FORMAT } from "@/constants/Config";
import { load, store } from "@/state/persisted";
import type { InterventionId } from "./catalog";

/** AsyncStorage key of finished interventions. Holds today only. */
export const STORAGE_KEY = "PIXY_INTERVENTIONS";

/** Only one day is kept; a new day replaces the old one. */
interface Stored {
  date: string;
  completed: InterventionId[];
}

const EMPTY: InterventionId[] = [];

let stored: Stored = { date: "", completed: [] };
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
      const value = await load<Stored>(STORAGE_KEY);
      if (value) {
        stored = value;
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

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getToday = () => dayjs().format(DATE_FORMAT);

const getCompletedToday = () =>
  stored.date === getToday() ? stored.completed : EMPTY;

/** Remember a finished intervention for today. */
export const markCompleted = async (id: InterventionId) => {
  await ensureLoaded();
  const today = getToday();
  const completed = stored.date === today ? stored.completed : [];
  if (completed.includes(id)) {
    return;
  }
  stored = { date: today, completed: [...completed, id] };
  emit();
  if (status === "loaded") {
    await store(STORAGE_KEY, stored);
  }
};

/** Interventions finished today, in completion order. */
export const useCompletedToday = () => {
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, getCompletedToday);
};

/** Test helper: forget the in-memory state. */
export const _resetCompleted = () => {
  stored = { date: "", completed: [] };
  status = "idle";
  loading = null;
};
