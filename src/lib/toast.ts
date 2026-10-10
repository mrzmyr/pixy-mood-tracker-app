import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

/** One confirmation. `id` changes per `showToast` call, so equal text still restarts the timer. */
export interface Toast {
  id: number;
  title: string;
  message?: string;
  /** Optional button, e.g. Undo. Pressing it runs `onPress`, then hides the toast. */
  action?: ToastAction;
  /** Milliseconds on screen. Defaults by platform in `ToastHost`. */
  durationMs?: number;
}

/** Button shown on a toast. `label` is already translated. */
export interface ToastAction {
  label: string;
  onPress: () => void;
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
 * Show a confirmation: top card on iOS, bottom snackbar on Android. A new toast replaces the
 * current one. Screen readers announce it. `ToastHost` renders it.
 */
export const showToast = ({
  title,
  message,
  action,
  durationMs,
}: {
  title: string;
  message?: string;
  action?: ToastAction;
  durationMs?: number;
}) => {
  nextId += 1;
  setCurrent({ id: nextId, title, message, action, durationMs });
  AccessibilityInfo.announceForAccessibility(
    message ? `${title} ${message}` : title
  );
};

/** Hide the current toast. No-op when none shows. */
export const hideToast = () => setCurrent(null);

/** Current toast, or `null`. */
export const useToast = () => useSyncExternalStore(subscribe, () => current);

/** iOS toast time. */
const TOAST_MS = 2600;
/** Material 3 snackbar: 4s, longer with an action so it can be reached. */
const SNACKBAR_MS = 4000;
const SNACKBAR_ACTION_MS = 8000;

/** Milliseconds a toast stays on screen. An explicit `durationMs` wins. */
export const getToastDuration = (
  toast: Pick<Toast, "action" | "durationMs">,
  os: string
) => {
  if (toast.durationMs !== undefined) {
    return toast.durationMs;
  }
  if (os !== "android") {
    return TOAST_MS;
  }
  return toast.action ? SNACKBAR_ACTION_MS : SNACKBAR_MS;
};
