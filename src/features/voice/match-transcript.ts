/** Kinds of items voice mode can find in a transcript. */
export type VoiceMatchKind = "person" | "tag" | "emotion";

/** One word or phrase that selects an item when spoken. */
export interface VoiceTerm {
  kind: VoiceMatchKind;
  /** Person id, tag id, or emotion key. */
  id: string;
  /** Name, tag title, or translated emotion label. */
  text: string;
}

/** One item found in a transcript. */
export interface VoiceMatch {
  kind: VoiceMatchKind;
  id: string;
  /** The term as the user named it, for display. */
  text: string;
}

// Punctuation and symbols between words. Letters of every script stay.
const SEPARATORS = /[\s.,!?;:"'`´’‘“”„«»()[\]{}<>…\-–—_/\\|*+=&%$#@~^0-9]+/gu;
// Scripts where words run together or carry attached particles: Thai,
// Japanese kana, CJK ideographs, Hangul. These match as substrings.
const NO_SPACE_SCRIPT =
  /[\p{Script=Thai}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Script=Hangul}]/u;
// Combining accents left by NFD normalization.
const COMBINING_MARKS = /\p{Mn}/gu;

const normalize = (text: string) =>
  ` ${text
    .normalize("NFD")
    .replaceAll(COMBINING_MARKS, "")
    .toLowerCase()
    .replaceAll(SEPARATORS, " ")
    .trim()} `;

/**
 * Find known people, tags, and emotions in a transcript.
 *
 * - Case and accents are ignored. Terms match whole words only, except in
 *   scripts without spaces (Chinese, Japanese, Korean, Thai).
 * - Overlapping terms: the longest term wins ("left out" over "out").
 * - Returns each item once, in order of its first mention.
 *
 * Swap this function for a smarter matcher later. Callers only rely on the
 * signature.
 */
export const matchTranscript = (
  transcript: string,
  terms: VoiceTerm[]
): VoiceMatch[] => {
  const haystack = normalize(transcript);
  if (haystack.trim() === "") {
    return [];
  }

  const hits: { start: number; end: number; term: VoiceTerm }[] = [];
  for (const term of terms) {
    const needle = normalize(term.text).trim();
    if (needle === "") {
      continue;
    }
    const isNoSpace = NO_SPACE_SCRIPT.test(needle);
    const pattern = isNoSpace ? needle : ` ${needle} `;
    const index = haystack.indexOf(pattern);
    if (index === -1) {
      continue;
    }
    const start = isNoSpace ? index : index + 1;
    hits.push({ start, end: start + needle.length, term });
  }

  // Longest first, so shorter terms inside a longer hit drop out.
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const kept: typeof hits = [];
  for (const hit of hits) {
    const overlaps = kept.some(
      (other) => hit.start < other.end && other.start < hit.end
    );
    // Same span for two kinds (tag "Work" and emotion "work"): keep both.
    const sameSpan = kept.some(
      (other) => other.start === hit.start && other.end === hit.end
    );
    if (!overlaps || sameSpan) {
      kept.push(hit);
    }
  }

  kept.sort((a, b) => a.start - b.start);
  const seen = new Set<string>();
  const matches: VoiceMatch[] = [];
  for (const { term } of kept) {
    const key = `${term.kind}:${term.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    matches.push({ kind: term.kind, id: term.id, text: term.text });
  }
  return matches;
};
