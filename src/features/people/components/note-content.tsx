import { Fragment, useMemo } from "react";
import { View } from "react-native";
import { usePeopleState } from "../people-provider";
import { parseNote, withOffsets } from "../mentions";
import type { NoteSegment } from "../mentions";
import { PersonAvatar } from "./person-avatar";

/** Avatar diameter relative to the font size. */
const AVATAR_SCALE = 0.95;
/** Space between avatar and name. */
const AVATAR_GAP = 3;
/** Inline views sit low on iOS; this lifts them to the cap height center. */
const BASELINE_SHIFT = -0.12;

/**
 * Read-only entry note with mentions, for use inside a `Text`. Mentions read
 * as plain text with a small avatar before the name. The current name wins
 * over the written one, so a rename follows the history. A deleted person
 * shows the written name without avatar. Check `hasMention` first: plain
 * notes need no parsing.
 */
export const NoteContent = ({
  note,
  segments: givenSegments,
  fontSize,
}: {
  note: string;
  /** Parsed `note`, when the caller already has it. */
  segments?: NoteSegment[];
  /** Font size of the parent text; sets the avatar size. */
  fontSize: number;
}) => {
  const { people } = usePeopleState();
  const segments = useMemo(
    () => givenSegments ?? parseNote(note),
    [givenSegments, note]
  );
  const avatarSize = Math.round(fontSize * AVATAR_SCALE);

  return (
    <>
      {withOffsets(segments).map(({ segment, offset: key }) => {
        if (segment.type === "text") {
          return <Fragment key={key}>{segment.text}</Fragment>;
        }
        const person = people.find((candidate) => candidate.id === segment.id);
        if (!person) {
          return <Fragment key={key}>{segment.name}</Fragment>;
        }
        return (
          <Fragment key={key}>
            <View
              style={{
                paddingRight: AVATAR_GAP,
                transform: [
                  { translateY: Math.round(fontSize * BASELINE_SHIFT) },
                ],
              }}
            >
              <PersonAvatar person={person} size={avatarSize} />
            </View>
            {person.name}
          </Fragment>
        );
      })}
    </>
  );
};
