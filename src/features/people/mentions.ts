import type { Person } from "./people-provider";

/**
 * Person mentions in entry notes. Notes stay Markdown: a mention is a link
 * with the `person:` scheme, for example `[@Klara](person:5f2c…)`. The label
 * keeps the name from when the mention was written, so a note still reads
 * well after the person was deleted.
 */

/** Plain text, or one person mention. */
export type NoteSegment =
  | { type: "text"; text: string }
  | { type: "mention"; id: Person["id"]; name: string };

const MENTION_PATTERN =
  /\[@(?<label>(?:[^\]\\]|\\.)*)\]\(person:(?<id>[^)\s]+)\)/gu;

/** Mentions open with this character while typing. */
export const MENTION_TRIGGER = "@";

/** Longest search text after `@` that still shows suggestions. */
const MAX_QUERY_LENGTH = 30;

const escapeLabel = (name: string) => name.replaceAll(/[\\\]]/gu, "\\$&");
const unescapeLabel = (label: string) =>
  label.replaceAll(/\\(?<char>.)/gu, "$<char>");

/** Markdown of one mention. */
export const formatMention = (person: Pick<Person, "id" | "name">) =>
  `[${MENTION_TRIGGER}${escapeLabel(person.name)}](person:${person.id})`;

/** Splits a note into text and mentions. Adjacent text merges. */
export const parseNote = (note: string): NoteSegment[] => {
  const segments: NoteSegment[] = [];
  let last = 0;
  for (const match of note.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({ type: "text", text: note.slice(last, start) });
    }
    segments.push({
      type: "mention",
      name: unescapeLabel(match.groups?.label ?? ""),
      id: match.groups?.id ?? "",
    });
    last = start + match[0].length;
  }
  if (last < note.length) {
    segments.push({ type: "text", text: note.slice(last) });
  }
  return segments;
};

/** Cheap check before parsing: notes without mentions render as plain text. */
export const hasMention = (note: string) => note.includes("](person:");

/** Markdown of segments; inverse of {@link parseNote}. */
export const serializeNote = (segments: NoteSegment[]) =>
  segments
    .map((segment) =>
      segment.type === "text" ? segment.text : formatMention(segment)
    )
    .join("");

/** Note with each mention reduced to the name: search, word counts, export. */
export const noteToPlainText = (note: string) =>
  parseNote(note)
    .map((segment) => (segment.type === "text" ? segment.text : segment.name))
    .join("");

/** Ids of every mentioned person, without duplicates. */
export const getMentionedIds = (note: string) => [
  ...new Set(
    parseNote(note).flatMap((segment) =>
      segment.type === "mention" ? [segment.id] : []
    )
  ),
];

/** Text the editor shows for one segment: mentions read `@Name`. */
const displayOf = (segment: NoteSegment) =>
  segment.type === "text" ? segment.text : `${MENTION_TRIGGER}${segment.name}`;

/**
 * Segments with their start in the shown text. The offset is unique per
 * note, so it also works as a React key.
 */
export const withOffsets = (segments: NoteSegment[]) => {
  let offset = 0;
  return segments.map((segment) => {
    const start = offset;
    offset += displayOf(segment).length;
    return { segment, offset: start };
  });
};

/** Text the editor shows: the note with each mention as `@Name`. */
export const toDisplayText = (segments: NoteSegment[]) =>
  segments.map(displayOf).join("");

const pushText = (segments: NoteSegment[], text: string) => {
  if (text === "") {
    return;
  }
  const previous = segments.at(-1);
  if (previous?.type === "text") {
    segments[segments.length - 1] = {
      type: "text",
      text: previous.text + text,
    };
  } else {
    segments.push({ type: "text", text });
  }
};

const pushSegment = (segments: NoteSegment[], segment: NoteSegment) => {
  if (segment.type === "text") {
    pushText(segments, segment.text);
  } else {
    segments.push(segment);
  }
};

/**
 * Replaces display range `[start, end)` with `insert`. A mention the range
 * cuts into, or an insert lands inside, turns into plain text first, like
 * editing a mention in Slack.
 */
export const spliceSegments = (
  segments: NoteSegment[],
  start: number,
  end: number,
  insert: NoteSegment[]
): NoteSegment[] => {
  const result: NoteSegment[] = [];
  let offset = 0;
  let inserted = false;
  const flushInsert = () => {
    if (!inserted) {
      inserted = true;
      for (const segment of insert) {
        pushSegment(result, segment);
      }
    }
  };

  for (const segment of segments) {
    const display = displayOf(segment);
    const segmentStart = offset;
    const segmentEnd = offset + display.length;
    offset = segmentEnd;

    const isTouched =
      (segmentStart < end && segmentEnd > start) ||
      (start > segmentStart && start < segmentEnd);
    if (segment.type === "mention" && !isTouched) {
      if (segmentStart >= start) {
        flushInsert();
      }
      result.push(segment);
      continue;
    }
    // Text, or a mention the edit touches: keep the parts outside the range.
    pushText(result, display.slice(0, Math.max(0, start - segmentStart)));
    if (segmentEnd >= start) {
      flushInsert();
    }
    pushText(result, display.slice(Math.max(0, end - segmentStart)));
  }
  flushInsert();
  return result;
};

/**
 * Applies a change of the editor text. The edit is the range between the
 * common start and the common end of old and new text.
 */
export const applyDisplayEdit = (
  segments: NoteSegment[],
  nextDisplay: string
): NoteSegment[] => {
  const previous = toDisplayText(segments);
  const maxCommon = Math.min(previous.length, nextDisplay.length);
  let prefix = 0;
  while (prefix < maxCommon && previous[prefix] === nextDisplay[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < maxCommon - prefix &&
    previous[previous.length - 1 - suffix] ===
      nextDisplay[nextDisplay.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return spliceSegments(segments, prefix, previous.length - suffix, [
    {
      type: "text",
      text: nextDisplay.slice(prefix, nextDisplay.length - suffix),
    },
  ]);
};

/**
 * Mention being typed at `cursor`: `@` at the start of a word, then up to
 * 30 characters without a line break. `null` when the cursor sits elsewhere
 * or inside a finished mention.
 */
export const findMentionQuery = (
  segments: NoteSegment[],
  cursor: number
): { start: number; query: string } | null => {
  let offset = 0;
  for (const segment of segments) {
    const display = displayOf(segment);
    const segmentEnd = offset + display.length;
    if (cursor > offset && cursor <= segmentEnd) {
      if (segment.type === "mention") {
        return null;
      }
      const before = display.slice(0, cursor - offset);
      const at = before.lastIndexOf(MENTION_TRIGGER);
      if (at === -1) {
        return null;
      }
      const query = before.slice(at + 1);
      const charBefore = at === 0 ? undefined : before[at - 1];
      // Text before this segment ends in a mention or the note start.
      const isWordStart =
        charBefore === undefined ? true : /\s/u.test(charBefore);
      if (
        !isWordStart ||
        query.includes("\n") ||
        query.length > MAX_QUERY_LENGTH ||
        query.startsWith(" ")
      ) {
        return null;
      }
      return { start: offset + at, query };
    }
    offset = segmentEnd;
  }
  return null;
};

/**
 * People matching a typed query: names that start with it first, then names
 * with a word that starts with it. Archived people never show.
 */
export const matchMentionCandidates = <
  P extends Pick<Person, "name" | "isArchived">,
>(
  people: P[],
  query: string,
  limit: number
): P[] => {
  const needle = query.trim().toLocaleLowerCase();
  const active = people.filter((person) => !person.isArchived);
  if (needle === "") {
    return active.slice(0, limit);
  }
  const rank = (person: P) => {
    const name = person.name.toLocaleLowerCase();
    if (name.startsWith(needle)) {
      return 0;
    }
    return name.split(/\s+/u).some((word) => word.startsWith(needle)) ? 1 : -1;
  };
  return active
    .flatMap((person) => {
      const value = rank(person);
      return value === -1 ? [] : [{ person, rank: value }];
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ person }) => person);
};
