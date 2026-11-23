import { useSyncExternalStore } from "react";
import type { Tag } from "./tags-provider";
import type { TagIconKey } from "./tag-icons";

/**
 * What the open tag form shares with the icon picker route. The form owns
 * the values; the picker reads them and calls back on a pick.
 */
export interface TagIconPickerSession {
  title: string;
  icon: Tag["icon"];
  color: Tag["color"];
  /** Suggested icons for `title`, best first. Empty while the title is empty. */
  suggestions: TagIconKey[];
  isSuggesting: boolean;
  onIconPick: (icon: TagIconKey) => void;
  onColorPick: (color: Tag["color"]) => void;
}

let session: TagIconPickerSession | null = null;
const listeners = new Set<() => void>();

/** Replaces the shared session. `null` when no tag form is open. */
export const setTagIconPickerSession = (next: TagIconPickerSession | null) => {
  session = next;
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => session;

/** Session of the open tag form, or `null` when none is open. */
export const useTagIconPickerSession = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
