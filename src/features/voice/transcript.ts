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

/** Apply one recognizer result. */
export const applyResult = (
  state: TranscriptState,
  result: { text: string; isFinal: boolean }
): TranscriptState => {
  const text = result.text.trim();
  if (!result.isFinal) {
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
