/** Kinds of items voice mode can find in a transcript. */
export type VoiceMatchKind = "person" | "tag" | "emotion";

/** One word or phrase that selects an item when spoken. */
export interface VoiceTerm<Kind extends string = VoiceMatchKind> {
  kind: Kind;
  /** Person id, tag id, emotion key, or rating. */
  id: string;
  /** Name, tag title, translated emotion label, or mood trigger word. */
  text: string;
}

/** One item found in a transcript. */
export interface VoiceMatch<Kind extends string = VoiceMatchKind> {
  kind: Kind;
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

// Shortest first or last name that matches on its own. Shorter words ("Al",
// "Jo", an initial "S.") collide with everyday words ("al", "jo", "it's").
const MIN_NAME_PART_LENGTH = 3;
// No-space scripts: two characters, so a one-character surname ("王") never
// matches inside other words.
const MIN_NO_SPACE_NAME_PART_LENGTH = 2;

interface Needle<Kind extends string> {
  text: string;
  term: VoiceTerm<Kind>;
  /** First or last name of a person, not the full term. */
  isNamePart: boolean;
}

interface Hit<Kind extends string> {
  start: number;
  end: number;
  term: VoiceTerm<Kind>;
  isNamePart: boolean;
}

/**
 * First and last word of a person name, normalized. One-word names give
 * nothing: the full term covers them. Words split on spaces only, so
 * "Hans-Peter" stays one name.
 */
const getNameParts = (name: string): string[] => {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (words.length < 2) {
    return [];
  }
  const parts = new Set<string>();
  for (const word of [words[0], words.at(-1)]) {
    const part = normalize(word ?? "").trim();
    const minLength = NO_SPACE_SCRIPT.test(part)
      ? MIN_NO_SPACE_NAME_PART_LENGTH
      : MIN_NAME_PART_LENGTH;
    if ([...part.replaceAll(" ", "")].length >= minLength) {
      parts.add(part);
    }
  }
  return [...parts];
};

/**
 * Full terms plus first and last names of people. A name part shared by
 * two or more people ("Anna" for Anna Schmidt and Anna Meyer) is left out:
 * voice mode does not guess.
 */
const getNeedles = <Kind extends string>(
  terms: VoiceTerm<Kind>[]
): Needle<Kind>[] => {
  const needles: Needle<Kind>[] = [];
  const partOwners = new Map<string, Set<string>>();
  const partNeedles: Needle<Kind>[] = [];
  for (const term of terms) {
    const text = normalize(term.text).trim();
    if (text === "") {
      continue;
    }
    needles.push({ text, term, isNamePart: false });
    if (term.kind !== "person") {
      continue;
    }
    for (const part of getNameParts(term.text)) {
      const owners = partOwners.get(part) ?? new Set<string>();
      owners.add(term.id);
      partOwners.set(part, owners);
      partNeedles.push({ text: part, term, isNamePart: true });
    }
  }
  for (const needle of partNeedles) {
    if (partOwners.get(needle.text)?.size === 1) {
      needles.push(needle);
    }
  }
  return needles;
};

/**
 * Find known people, tags, and emotions in a transcript.
 *
 * - Case and accents are ignored. Terms match whole words only, except in
 *   scripts without spaces (Chinese, Japanese, Korean, Thai).
 * - People also match by first or last name alone ("Anna" or "Schmidt" for
 *   Anna Schmidt). A name part shared by several people matches nobody. A
 *   name part never beats a full term: person "Anna", tag "Anna", or
 *   emotion "Joy" on the same words wins.
 * - Overlapping terms: the longest term wins ("left out" over "out").
 * - Returns each item once, in order of its first mention.
 *
 * Swap this function for a smarter matcher later. Callers only rely on the
 * signature.
 */
export const matchTranscript = <Kind extends string = VoiceMatchKind>(
  transcript: string,
  terms: VoiceTerm<Kind>[]
): VoiceMatch<Kind>[] => {
  const haystack = normalize(transcript);
  if (haystack.trim() === "") {
    return [];
  }

  const hits: Hit<Kind>[] = [];
  for (const { text, term, isNamePart } of getNeedles(terms)) {
    const isNoSpace = NO_SPACE_SCRIPT.test(text);
    const pattern = isNoSpace ? text : ` ${text} `;
    const index = haystack.indexOf(pattern);
    if (index === -1) {
      continue;
    }
    const start = isNoSpace ? index : index + 1;
    hits.push({ start, end: start + text.length, term, isNamePart });
  }

  // Longest first, so shorter terms inside a longer hit drop out. On equal
  // length, full terms go before name parts.
  hits.sort(
    (a, b) =>
      b.end - b.start - (a.end - a.start) ||
      Number(a.isNamePart) - Number(b.isNamePart) ||
      a.start - b.start
  );
  const kept: Hit<Kind>[] = [];
  for (const hit of hits) {
    const overlaps = kept.some(
      (other) => hit.start < other.end && other.start < hit.end
    );
    // Same span for two kinds (tag "Work" and emotion "work"): keep both.
    // A name part on the same span as a full term drops out.
    const sameSpan = kept.some(
      (other) => other.start === hit.start && other.end === hit.end
    );
    if (!overlaps || (sameSpan && !hit.isNamePart)) {
      kept.push(hit);
    }
  }

  kept.sort((a, b) => a.start - b.start);
  const seen = new Set<string>();
  const matches: VoiceMatch<Kind>[] = [];
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
