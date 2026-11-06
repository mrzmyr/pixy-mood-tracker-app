import { useState } from "react";
import type {
  NativeSyntheticEvent,
  TextInput,
  TextInputSelectionChangeEventData,
} from "react-native";
import {
  applyDisplayEdit,
  findMentionQuery,
  matchMentionCandidates,
  parseNote,
  serializeNote,
  spliceSegments,
  toDisplayText,
} from "../mentions";
import type { NoteSegment } from "../mentions";
import type { Person } from "../people-provider";
import { usePeopleState } from "../people-provider";

/** Suggestions shown at once; the list never scrolls. */
const MAX_SUGGESTIONS = 3;

/** Drops text from the end until the Markdown fits `maxLength`. */
const fitLength = (segments: NoteSegment[], maxLength: number) => {
  let next = segments;
  let overflow = serializeNote(next).length - maxLength;
  while (overflow > 0) {
    const { length } = toDisplayText(next);
    next = spliceSegments(next, Math.max(0, length - overflow), length, []);
    overflow = serializeNote(next).length - maxLength;
  }
  return next;
};

/**
 * Note editor state with person mentions. The input shows `@Name` for each
 * mention; `onChange` gets the Markdown note. Typing `@` at a word start
 * lists matching people; `handlePick` swaps the typed query for a mention.
 */
export const useMentionEditor = ({
  initialNote,
  maxLength,
  inputRef,
  onChange,
  onMention,
}: {
  initialNote: string;
  /** Limit of the Markdown note. */
  maxLength: number;
  inputRef: React.RefObject<TextInput | null>;
  onChange: (note: string) => void;
  /** A person was picked from the suggestions. */
  onMention: (person: Person) => void;
}) => {
  const { people } = usePeopleState();
  const [segments, setSegments] = useState(() => parseNote(initialNote));
  const [cursor, setCursor] = useState<number | null>(null);

  const update = (next: NoteSegment[]) => {
    const fitted = fitLength(next, maxLength);
    setSegments(fitted);
    onChange(serializeNote(fitted));
  };

  const query = cursor === null ? null : findMentionQuery(segments, cursor);
  const candidates =
    query === null
      ? []
      : matchMentionCandidates(people, query.query, MAX_SUGGESTIONS);

  return {
    segments,
    candidates,
    onChangeText: (text: string) => update(applyDisplayEdit(segments, text)),
    onSelectionChange: ({
      nativeEvent: { selection },
    }: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCursor(selection.start === selection.end ? selection.end : null);
    },
    handlePick: (person: Person) => {
      if (query === null || cursor === null) {
        return;
      }
      update(
        spliceSegments(segments, query.start, cursor, [
          { type: "mention", id: person.id, name: person.name },
          { type: "text", text: " " },
        ])
      );
      // `@`, name, and the space after it.
      const position = query.start + person.name.length + 2;
      setCursor(position);
      // Moves the caret behind the mention once the input shows it.
      requestAnimationFrame(() => {
        inputRef.current?.setSelection(position, position);
      });
      onMention(person);
    },
  };
};
