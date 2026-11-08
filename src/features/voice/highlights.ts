import { findTranscriptSpans } from "./match-transcript";
import type { VoiceMatchKind, VoiceSpan, VoiceTerm } from "./match-transcript";
import type { MoodTrigger } from "./mood-triggers";

/** Kinds the live transcript highlights. */
export type HighlightKind = VoiceMatchKind | "mood";

/**
 * Places to highlight in the live transcript: every mention of a known
 * person, tag, or emotion, plus the first mood trigger, the one that sets
 * the rating. On overlap the longer words win.
 */
export const findHighlights = (
  text: string,
  terms: VoiceTerm[],
  triggers: MoodTrigger[]
): VoiceSpan<HighlightKind>[] => {
  const spans: VoiceSpan<HighlightKind>[] = findTranscriptSpans(text, terms);
  const [mood] = findTranscriptSpans(
    text,
    triggers.map(({ rating, text: trigger }) => ({
      kind: "mood" as const,
      id: rating,
      text: trigger,
    }))
  );
  if (!mood) {
    return spans;
  }
  // Longer words win, like the matcher: "very good" beats emotion "Good".
  const overlapping = new Set(
    spans.filter((span) => mood.start < span.end && span.start < mood.end)
  );
  const isLongest = [...overlapping].every(
    (span) => mood.end - mood.start > span.end - span.start
  );
  if (!isLongest) {
    return spans;
  }
  return [...spans.filter((span) => !overlapping.has(span)), mood].sort(
    (a, b) => a.start - b.start
  );
};
