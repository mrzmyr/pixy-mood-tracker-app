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
const SEPARATOR = /^[\s.,!?;:"'`´’‘“”„«»()[\]{}<>…\-–—_/\\|*+=&%$#@~^0-9]$/u;
// Scripts where words run together or carry attached particles: Thai,
// Japanese kana, CJK ideographs, Hangul. These match as substrings.
const NO_SPACE_SCRIPT =
  /[\p{Script=Thai}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Script=Hangul}]/u;
// Combining accents left by NFD normalization.
const COMBINING_MARKS = /\p{Mn}/gu;

/** Normalized text, padded with one space on each side. */
interface Normalized {
  text: string;
  /** Per character of `text`: start of its source character in the input. */
  from: number[];
  /** Per character of `text`: end of its source character in the input. */
  to: number[];
}

/**
 * Lowercase, accents removed, separators collapsed to one space, padded
 * with spaces. Works per character, so every normalized character maps
 * back to its place in the input for highlighting.
 */
const normalizeWithMap = (input: string): Normalized => {
  const chars = [" "];
  const from = [0];
  const to = [0];
  let index = 0;
  for (const char of input) {
    const end = index + char.length;
    if (SEPARATOR.test(char)) {
      if (chars.at(-1) !== " ") {
        chars.push(" ");
        from.push(index);
        to.push(end);
      }
    } else {
      const folded = char
        .normalize("NFD")
        .replaceAll(COMBINING_MARKS, "")
        .toLowerCase();
      for (const unit of folded.split("")) {
        chars.push(unit);
        from.push(index);
        to.push(end);
      }
    }
    index = end;
  }
  if (chars.at(-1) !== " ") {
    chars.push(" ");
    from.push(index);
    to.push(index);
  }
  return { text: chars.join(""), from, to };
};

const normalize = (text: string) => normalizeWithMap(text).text;

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
 * Hits that survive overlap rules, in transcript order. `everyMention`
 * finds each mention of a term, otherwise only its first.
 */
const findHits = <Kind extends string>(
  haystack: string,
  terms: VoiceTerm<Kind>[],
  everyMention: boolean
): Hit<Kind>[] => {
  if (haystack.trim() === "") {
    return [];
  }

  const hits: Hit<Kind>[] = [];
  for (const { text, term, isNamePart } of getNeedles(terms)) {
    const isNoSpace = NO_SPACE_SCRIPT.test(text);
    const pattern = isNoSpace ? text : ` ${text} `;
    let index = haystack.indexOf(pattern);
    while (index !== -1) {
      const start = isNoSpace ? index : index + 1;
      hits.push({ start, end: start + text.length, term, isNamePart });
      if (!everyMention) {
        break;
      }
      index = haystack.indexOf(pattern, start + text.length);
    }
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
  return kept.sort((a, b) => a.start - b.start);
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
  const kept = findHits(normalize(transcript), terms, false);
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

/** Place of one matched term in a transcript, as string indices. */
export interface VoiceSpan<Kind extends string = VoiceMatchKind> {
  kind: Kind;
  id: string;
  start: number;
  end: number;
}

/**
 * Every mention of a known term in `transcript`, with its place in the
 * original text, in reading order. Same rules as `matchTranscript`. One
 * span per place: two kinds on the same words keep the first.
 */
export const findTranscriptSpans = <Kind extends string = VoiceMatchKind>(
  transcript: string,
  terms: VoiceTerm<Kind>[]
): VoiceSpan<Kind>[] => {
  const normalized = normalizeWithMap(transcript);
  const spans: VoiceSpan<Kind>[] = [];
  for (const hit of findHits(normalized.text, terms, true)) {
    const start = normalized.from[hit.start] ?? 0;
    const end = normalized.to[hit.end - 1] ?? start;
    if (spans.at(-1)?.start === start) {
      continue;
    }
    spans.push({ kind: hit.term.kind, id: hit.term.id, start, end });
  }
  return spans;
};
