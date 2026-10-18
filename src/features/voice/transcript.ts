/**
 * Transcript built from recognizer segments.
 *
 * A recognizer session sends partial results, each the full text of the
 * running segment, then one final result. Android ends a segment after a
 * short silence, iOS after about a minute or a pause. Voice mode starts a
 * new segment after each final result and after resume.
 */
export interface TranscriptState {
  /** Finished segments. */
  committed: string[];
  /** Latest partial text of the running segment. */
  partial: string;
}

/** Transcript before the first result. */
export const EMPTY_TRANSCRIPT: TranscriptState = { committed: [], partial: "" };

// Partials of one utterance grow or revise the end. A new utterance starts
// with other words.
const CONTINUATION_PREFIX = 8;
const isContinuation = (previous: string, next: string) => {
  const length = Math.min(CONTINUATION_PREFIX, previous.length, next.length);
  return (
    previous.slice(0, length).toLowerCase() ===
    next.slice(0, length).toLowerCase()
  );
};

/** Apply one recognizer result. */
export const applyResult = (
  state: TranscriptState,
  result: { text: string; isFinal: boolean }
): TranscriptState => {
  const text = result.text.trim();
  if (!result.isFinal) {
    if (text === "") {
      return state;
    }
    // iOS 18+ restarts the text after a pause in the same session. Keep the
    // old partial as a segment instead of losing it.
    if (state.partial !== "" && !isContinuation(state.partial, text)) {
      return { committed: [...state.committed, state.partial], partial: text };
    }
    return { ...state, partial: text };
  }
  return {
    committed: text === "" ? state.committed : [...state.committed, text],
    partial: "",
  };
};

/**
 * Keep the running partial as a finished segment, for example on pause or
 * when the recognizer stops without a final result.
 */
export const commitPartial = (state: TranscriptState): TranscriptState =>
  applyResult(state, { text: state.partial, isFinal: true });

/** Full transcript text. */
export const transcriptText = (state: TranscriptState) =>
  [...state.committed, state.partial].filter((part) => part !== "").join(" ");
