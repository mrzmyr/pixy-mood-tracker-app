import dayjs from "dayjs";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { NativeEventSubscription } from "react-native";
import { DATE_FORMAT } from "@/constants/Config";

/*
 * One store for all subscribers: the calendar renders hundreds of days, so
 * each must not add its own listener and timer.
 */
const listeners = new Set<() => void>();
let today = dayjs().format(DATE_FORMAT);
let midnightTimer: ReturnType<typeof setTimeout> | undefined;
let appStateSubscription: NativeEventSubscription | undefined;

const refresh = () => {
  const next = dayjs().format(DATE_FORMAT);
  if (next !== today) {
    today = next;
    for (const listener of listeners) {
      listener();
    }
  }
  clearTimeout(midnightTimer);
  // iOS pauses timers in the background, so resume also refreshes.
  midnightTimer = setTimeout(
    refresh,
    dayjs().add(1, "day").startOf("day").diff(dayjs()) + 1000
  );
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(midnightTimer);
      appStateSubscription?.remove();
    }
  };
};

const getSnapshot = () => today;

/**
 * Today as `DATE_FORMAT`. Updates at local midnight and when the app returns
 * to the foreground, so a screen kept alive overnight moves to the new day.
 */
export const useToday = (): string =>
  useSyncExternalStore(subscribe, getSnapshot);
