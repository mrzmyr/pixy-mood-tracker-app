import type { HighlightKind } from "./highlights";
import type { VoiceSpan } from "./match-transcript";

/** Run of one word: highlighted or plain. */
export interface WordSegment {
  text: string;
  isHighlight: boolean;
}

/** One word of the live transcript, as it animates in. */
export interface TranscriptWord {
  segments: WordSegment[];
  /** Person whose name starts in this word: shows their avatar first. */
  personId?: string;
}

/**
 * Words of `text` with their highlighted parts. Punctuation next to a
 * highlighted name stays plain ("Alex." gives "Alex" + "."). A name over
 * several words highlights each word; its avatar goes before the first.
 */
export const getTranscriptWords = (
  text: string,
  spans: VoiceSpan<HighlightKind>[]
): TranscriptWord[] => {
  const words: TranscriptWord[] = [];
  for (const match of text.matchAll(/\S+/gu)) {
    const start = match.index;
    const end = start + match[0].length;
    const inside = spans.filter((span) => span.start < end && start < span.end);
    const segments: WordSegment[] = [];
    let cursor = start;
    for (const span of inside) {
      const from = Math.max(span.start, start);
      const to = Math.min(span.end, end);
      if (from > cursor) {
        segments.push({ text: text.slice(cursor, from), isHighlight: false });
      }
      segments.push({ text: text.slice(from, to), isHighlight: true });
      cursor = to;
    }
    if (cursor < end) {
      segments.push({ text: text.slice(cursor, end), isHighlight: false });
    }
    const person = inside.find(
      (span) => span.kind === "person" && span.start >= start
    );
    words.push(person ? { segments, personId: person.id } : { segments });
  }
  return words;
};
