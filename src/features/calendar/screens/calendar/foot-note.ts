import { useCallback, useState } from "react";

import { tDynamic } from "@/lib/translation";

/** Must match the `calendar_foot_note_<n>` keys in every locale file. */
export const FOOT_NOTE_COUNT = 50;
// Overscroll past the calendar end, in points, before the foot note counts as seen.
const REVEAL_OVERSCROLL = 30;

/** `isRevealed` stays true until the list bounces back below the calendar end. */
export interface FootNoteState {
  index: number;
  isRevealed: boolean;
}

/** Random foot note index, never the current one. */
export const pickNextFootNote = (current: number, random = Math.random) =>
  (current + 1 + Math.floor(random() * (FOOT_NOTE_COUNT - 1))) %
  FOOT_NOTE_COUNT;

/**
 * Swaps the foot note after the user has seen it and the list bounced back,
 * so the text never changes while visible.
 */
export const updateFootNote = (
  state: FootNoteState,
  overscroll: number,
  random = Math.random
): FootNoteState => {
  if (overscroll > REVEAL_OVERSCROLL) {
    return state.isRevealed ? state : { ...state, isRevealed: true };
  }
  if (overscroll < 1 && state.isRevealed) {
    return { index: pickNextFootNote(state.index, random), isRevealed: false };
  }
  return state;
};

/** Starts at the first note; swaps only via `onOverscroll`, never on re-render. */
export const useFootNote = () => {
  const [state, setState] = useState<FootNoteState>({
    index: 0,
    isRevealed: false,
  });
  const onOverscroll = useCallback((overscroll: number) => {
    setState((current) => updateFootNote(current, overscroll));
  }, []);

  return {
    text: tDynamic(`calendar_foot_note_${state.index + 1}`),
    onOverscroll,
  };
};
