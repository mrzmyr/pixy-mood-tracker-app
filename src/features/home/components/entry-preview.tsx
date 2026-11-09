import { Image } from "expo-image";
import MapPin from "lucide-react-native/icons/map-pin";
import { Pressable, View } from "react-native";
import { Copy, Label } from "@/components/typography";
import type { IScale } from "@/constants/colors/scales";
import { RADIUS } from "@/constants/radius";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { tDynamic } from "@/lib/translation";
import { HOME_LAYOUT, HOME_TEXT, HOME_WEIGHT } from "../layout";
import { DottedDivider } from "./dotted-divider";

const COVER_PHOTOS = 3;
const { avatarSize } = HOME_LAYOUT;

/** Person on an entry preview: photo or initials. */
export interface EntryPreviewPerson {
  id: string;
  name: string;
  avatarUri: string | null;
  initials: string;
}

/** Display data of one entry on Home. Build it with `getEntryPreview`. */
export interface EntryPreviewData {
  id: string;
  /** `DATE_FORMAT` day of the entry. */
  date: string;
  time: string;
  rating: LogItem["rating"];
  /** Emotion names; empty shows the rating name. */
  emotions: string[];
  note: string;
  people: EntryPreviewPerson[];
  tags: { id: string; title: string }[];
  place: string | null;
  /** Up to 3 photos for the cover strip; empty without photos. */
  photoUris: string[];
}

const Avatars = ({ people }: { people: EntryPreviewPerson[] }) => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row" }}>
      {people.slice(0, 3).map((person, index) => (
        <View
          key={person.id}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            marginLeft: index === 0 ? 0 : -6,
            borderWidth: 2,
            borderColor: colors.calendarBackground,
            backgroundColor: colors.homeTextFaint,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {person.avatarUri ? (
            <Image
              source={{ uri: person.avatarUri }}
              style={{ width: avatarSize, height: avatarSize }}
              contentFit="cover"
            />
          ) : (
            <Label
              size={12}
              strong
              style={{ lineHeight: 14, color: colors.textSecondary }}
            >
              {person.initials}
            </Label>
          )}
        </View>
      ))}
    </View>
  );
};

/** People, tags, and place of a preview on one line. Nothing when empty. */
const Meta = ({ entry }: { entry: EntryPreviewData }) => {
  const colors = useColors();
  const text = { ...HOME_TEXT.meta, color: colors.homeTextMuted };
  const hasPeople = entry.people.length > 0;
  if (!hasPeople && entry.tags.length === 0 && !entry.place) {
    return null;
  }
  return (
    <View
      style={{
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        overflow: "hidden",
      }}
    >
      {hasPeople && (
        <>
          <Avatars people={entry.people} />
          <Label size={13} numberOfLines={1} style={text}>
            {entry.people.map((person) => person.name).join(", ")}
          </Label>
        </>
      )}
      {entry.tags.slice(0, 3).map((tag) => (
        <View
          key={tag.id}
          style={{
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: RADIUS.xs,
            backgroundColor: colors.homeSelectedDay,
          }}
        >
          <Label
            size={13}
            numberOfLines={1}
            style={{ ...text, fontWeight: HOME_WEIGHT }}
          >
            {tag.title}
          </Label>
        </View>
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
          <Label size={13} numberOfLines={1} style={{ ...text, flexShrink: 1 }}>
            {entry.place}
          </Label>
        </View>
      )}
    </View>
  );
};

/**
 * One entry as a row: mood square at the top left; photos as a cover strip
 * (up to 3), emotions as title, time, 2 lines of note, people, tags, place.
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
  const title =
    entry.emotions.length > 0
      ? entry.emotions.join(", ")
      : tDynamic(entry.rating);

  return (
    <Pressable
      testID="home-entry"
      accessibilityRole="button"
      accessibilityLabel={[
        entry.time,
        tDynamic(entry.rating),
        title,
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
        <Meta entry={entry} />
      </View>
    </Pressable>
  );
};
