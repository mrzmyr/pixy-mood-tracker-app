import { useSyncExternalStore } from "react";

let isVisible = true;
const listeners = new Set<() => void>();

/** Called once by `LaunchSplash` when it starts to leave. */
export const markLaunchSplashGone = () => {
  if (!isVisible) {
    return;
  }
  isVisible = false;
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getIsVisible = () => isVisible;

/**
 * True while the launch splash covers the app. Screens under it hold back
 * entrance animations until it leaves, so the user sees them play.
 */
export const useIsLaunchSplashVisible = () =>
  useSyncExternalStore(subscribe, getIsVisible, getIsVisible);
