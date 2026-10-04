import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

/** One confirmation. `id` changes per `showToast` call, so equal text still restarts the timer. */
export interface Toast {
  id: number;
  title: string;
  message?: string;
}

let current: Toast | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

const setCurrent = (toast: Toast | null) => {
  current = toast;
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Show a confirmation at the top of the screen. A new toast replaces the
 * current one. Screen readers announce it. `ToastHost` renders it.
 */
export const showToast = ({
  title,
  message,
}: {
  title: string;
  message?: string;
}) => {
  nextId += 1;
  setCurrent({ id: nextId, title, message });
  AccessibilityInfo.announceForAccessibility(
    message ? `${title} ${message}` : title
  );
};

/** Hide the current toast. No-op when none shows. */
export const hideToast = () => setCurrent(null);

/** Current toast, or `null`. */
export const useToast = () => useSyncExternalStore(subscribe, () => current);
