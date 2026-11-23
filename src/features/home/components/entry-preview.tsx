import { Image } from "expo-image";
import MapPin from "lucide-react-native/icons/map-pin";
import { Pressable, View } from "react-native";
import { Copy, Label } from "@/components/typography";
import type { IScale } from "@/constants/colors/scales";
import { RADIUS } from "@/constants/radius";
import { CHIP_GAP } from "@/constants/chip";
import { SPACE } from "@/constants/space";
import { EmotionItem } from "@/features/calendar";
import type { LogItem } from "@/features/logs";
import { PersonChip } from "@/features/people";
import type { Person } from "@/features/people";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { tDynamic } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import type { Emotion } from "@/types";
import { HOME_LAYOUT, HOME_TEXT, HOME_WEIGHT } from "../layout";
import { DottedDivider } from "./dotted-divider";

const COVER_PHOTOS = 3;

/** Display data of one entry on Home. Build it with `getEntryPreview`. */
export interface EntryPreviewData {
  id: string;
  /** `DATE_FORMAT` day of the entry. */
  date: string;
  time: string;
  rating: LogItem["rating"];
  /** Known emotions, positive first; unknown keys are skipped. */
  emotions: Pick<Emotion, "key" | "category">[];
  note: string;
  /** People that still exist. */
  people: Pick<Person, "id" | "name" | "avatar" | "updatedAt">[];
  /** Tags that still exist. */
  tags: Pick<Tag, "id" | "title" | "color" | "icon">[];
  place: string | null;
  /** Up to 3 photos for the cover strip; empty without photos. */
  photoUris: string[];
}

/**
 * Emotions, people, and tags as read-only chips, the same chips as the
 * check-in (tag icons with flag `tag-icons`); then the place. Chips wrap:
 * Home pages days sideways, so a sideways chip scroller would fight the
 * swipe. Nothing when empty.
 */
const Chips = ({ entry }: { entry: EntryPreviewData }) => {
  const colors = useColors();
  const hasTagIcons = useFeatureFlag("tag-icons");
  if (
    entry.emotions.length === 0 &&
    entry.people.length === 0 &&
    entry.tags.length === 0 &&
    !entry.place
  ) {
    return null;
  }
  return (
    <View
      testID="home-entry-chips"
      pointerEvents="none"
      style={{
        marginTop: SPACE.md,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: CHIP_GAP,
      }}
    >
      {entry.emotions.map((emotion) => (
        <EmotionItem key={emotion.key} emotion={emotion} />
      ))}
      {entry.people.map((person) => (
        <PersonChip key={person.id} person={person} />
      ))}
      {entry.tags.map((tag) => (
        <TagComponent
          key={tag.id}
          title={tag.title}
          colorName={tag.color}
          icon={tag.icon}
          showIcon={hasTagIcons}
        />
      ))}
      {entry.place && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            flexShrink: 1,
          }}
        >
          <MapPin color={colors.homeTextMuted} size={12} strokeWidth={2.4} />
          <Label
            size={13}
            numberOfLines={1}
            style={{
              ...HOME_TEXT.meta,
              color: colors.homeTextMuted,
              flexShrink: 1,
            }}
          >
            {entry.place}
          </Label>
        </View>
      )}
    </View>
  );
};

/**
 * One entry as a row: mood square at the top left; photos as a cover strip
 * (up to 3), rating as title, time, 2 lines of note, then chips for
 * emotions, people, and tags, and the place.
 * A dotted line sits at the top edge when `hasDivider`. A tap opens the
 * full entry.
 */
export const EntryPreview = ({
  entry,
  scale,
  hasDivider = false,
  onPress,
}: {
  entry: EntryPreviewData;
  scale: IScale;
  hasDivider?: boolean;
  onPress: (entry: EntryPreviewData) => void;
}) => {
  const colors = useColors();
  const mood = scale[entry.rating];
  const title = tDynamic(entry.rating);
  const emotionNames = entry.emotions.map((emotion) =>
    tDynamic(`log_emotion_${emotion.key}`)
  );

  return (
    <Pressable
      testID="home-entry"
      accessibilityRole="button"
      accessibilityLabel={[
        entry.time,
        title,
        emotionNames.join(", "),
        ...entry.people.map((person) => person.name),
        ...entry.tags.map((tag) => tag.title),
        entry.place,
        entry.note,
      ]
        .filter(Boolean)
        .join(", ")}
      onPress={() => onPress(entry)}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: HOME_LAYOUT.iconGap,
        minHeight: HOME_LAYOUT.rowMinHeight,
        paddingVertical: HOME_LAYOUT.rowPaddingVertical,
        paddingLeft: HOME_LAYOUT.iconInset,
        paddingRight: HOME_LAYOUT.rowInsetEnd,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {hasDivider && <DottedDivider />}
      <View
        style={{
          width: HOME_LAYOUT.iconSize,
          height: HOME_LAYOUT.iconSize,
          marginTop: 4,
          borderRadius: RADIUS.xs,
          borderCurve: "continuous",
          backgroundColor: mood.background,
          borderWidth: 1,
          borderColor: mood.border,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        {entry.photoUris.length > 0 && (
          <View
            style={{
              height: HOME_LAYOUT.coverHeight,
              marginBottom: HOME_LAYOUT.coverGap,
              flexDirection: "row",
              gap: 3,
              borderRadius: RADIUS.md,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {entry.photoUris.slice(0, COVER_PHOTOS).map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ flex: 1, height: HOME_LAYOUT.coverHeight }}
                contentFit="cover"
              />
            ))}
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Label
            size={20}
            numberOfLines={1}
            style={{ ...HOME_TEXT.title, flex: 1, fontWeight: HOME_WEIGHT }}
          >
            {title}
          </Label>
          <Label
            size={16}
            style={{
              ...HOME_TEXT.time,
              color: colors.homeTextFaint,
              fontVariant: ["tabular-nums"],
            }}
          >
            {entry.time}
          </Label>
        </View>
        {entry.note.length > 0 && (
          <Copy
            size={16}
            numberOfLines={2}
            style={{
              ...HOME_TEXT.note,
              marginTop: 2,
              color: colors.homeTextMuted,
            }}
          >
            {entry.note}
          </Copy>
        )}
        <Chips entry={entry} />
      </View>
    </Pressable>
  );
};
