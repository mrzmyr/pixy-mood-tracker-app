import dayjs from "dayjs";
import keyBy from "lodash/keyBy";
import { memo } from "react";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COMPACT_CHIP } from "@/constants/Chip";
import { getLocationLabel, PlacePreview } from "@/features/location";
import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { PersonChip, usePeopleState } from "@/features/people";
import { PhotoThumbnail } from "@/features/photos";
import { TagComponent, useTagsState } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { EmotionItem } from "../../LogList/EmotionItem";
import { RatingDot } from "../../LogList/RatingDot";
import { ChipRow } from "./ChipRow";
import { FadingNote } from "./FadingNote";

// Apple Journal shows up to three media tiles per card: photos, then the
// map. A single tile is a wide banner; a full-width square would fill most
// of the screen.
const MAX_TILES = 3;
const SINGLE_TILE_ASPECT_RATIO = 2;
// Chips rendered per row; the rest collapse into a `+N` chip. Keeps an entry
// with all 161 emotions cheap to lay out.
const MAX_CHIPS = 12;
const EMOTIONS_BY_KEY = keyBy(EMOTIONS, "key");
// Screen readers get the start of long notes only.
const MAX_LABEL_MESSAGE = 200;

/** `+N` chip for the items past {@link MAX_CHIPS}. */
const MoreChip = ({ count }: { count: number }) => {
  const colors = useColors();
  return (
    <View
      style={{
        justifyContent: "center",
        height: COMPACT_CHIP.height,
        paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
        borderRadius: COMPACT_CHIP.borderRadius,
        borderWidth: 1,
        borderColor: colors.entryItemBorder,
      }}
    >
      <Text
        style={{
          fontSize: COMPACT_CHIP.fontSize,
          color: colors.textSecondary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {`+${count}`}
      </Text>
    </View>
  );
};

/** First {@link MAX_CHIPS} chips, plus a `+N` chip for the rest. */
const withMore = (chips: ReactElement[]) =>
  chips.length > MAX_CHIPS
    ? [
        ...chips.slice(0, MAX_CHIPS),
        <MoreChip key="more" count={chips.length - MAX_CHIPS} />,
      ]
    : chips;

const TimelineEntryComponent = ({
  item,
  onPress,
}: {
  item: LogItem;
  onPress: (item: LogItem) => void;
}) => {
  const colors = useColors();
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const { location } = item;
  const photos = item.photos.slice(
    0,
    location === undefined ? MAX_TILES : MAX_TILES - 1
  );
  const tileCount = photos.length + (location === undefined ? 0 : 1);
  const tileAspectRatio = tileCount === 1 ? SINGLE_TILE_ASPECT_RATIO : 1;
  // Only rendered chips are built; unknown keys and ids come from newer app
  // versions, broken imports, or deleted tags and people; skip them.
  const chipStyle = {
    marginRight: 0,
    marginBottom: 0,
    backgroundColor: colors.entryBackground,
    borderColor: colors.entryItemBorder,
  };
  const emotionChips = withMore(
    item.emotions.flatMap((key) => {
      const emotion = EMOTIONS_BY_KEY[key];
      return emotion
        ? [<EmotionItem key={key} emotion={emotion} compact />]
        : [];
    })
  );
  const tagChips = withMore(
    item.tags.flatMap(({ id }) => {
      const tag = tags.find((candidate) => candidate.id === id);
      return tag
        ? [
            <TagComponent
              key={id}
              title={tag.title}
              colorName={tag.color}
              compact
              style={chipStyle}
            />,
          ]
        : [];
    })
  );
  const personChips = withMore(
    item.people.flatMap(({ id }) => {
      const person = people.find((candidate) => candidate.id === id);
      return person
        ? [<PersonChip key={id} person={person} compact style={chipStyle} />]
        : [];
    })
  );
  const open = () => onPress(item);
  const message = item.message.trim();
  const dateLabel = dayjs(item.dateTime).format("llll");
  const hasChips =
    emotionChips.length > 0 || tagChips.length > 0 || personChips.length > 0;
  const hasBody = message !== "" || hasChips;
  const hasContent = hasBody || tileCount > 0;
  const accessibilityLabel = [
    dateLabel,
    location === undefined ? null : getLocationLabel(location),
    message === "" ? null : message.slice(0, MAX_LABEL_MESSAGE),
  ]
    .filter((part) => part !== null)
    .join(". ");

  return (
    <Pressable
      testID={`timeline-entry-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={open}
      style={({ pressed }) => ({
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.logCardBorder,
        backgroundColor: colors.logCardBackground,
        overflow: "hidden",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {tileCount > 0 && (
        <View style={{ flexDirection: "row", gap: 6, padding: 6 }}>
          {photos.map((photo, index) => (
            <View key={photo.id} style={{ flex: 1 }}>
              <PhotoThumbnail
                photo={photo}
                index={index}
                count={item.photos.length}
                aspectRatio={tileAspectRatio}
              />
            </View>
          ))}
          {location !== undefined && (
            <View style={{ flex: 1 }}>
              <PlacePreview location={location} aspectRatio={tileAspectRatio} />
            </View>
          )}
        </View>
      )}
      {hasBody && (
        <View style={{ paddingTop: 20, gap: 10 }}>
          {message !== "" && (
            // Room around the note, so it reads as text, not as another row.
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <FadingNote message={message} />
            </View>
          )}
          {/* Keyed by entry: FlashList recycles cards, and a reused row
              would keep the old scroll position. */}
          <ChipRow
            key={`emotions-${item.id}`}
            testID="timeline-entry-emotions"
            onPress={open}
          >
            {emotionChips}
          </ChipRow>
          <ChipRow
            key={`tags-${item.id}`}
            testID="timeline-entry-tags"
            onPress={open}
          >
            {tagChips}
          </ChipRow>
          <ChipRow
            key={`people-${item.id}`}
            testID="timeline-entry-people"
            onPress={open}
          >
            {personChips}
          </ChipRow>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginHorizontal: 16,
          paddingVertical: 10,
          // Rating and date alone need no divider.
          ...(hasContent && {
            marginTop: hasBody ? 16 : 6,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.logCardBorder,
          }),
        }}
      >
        <RatingDot rating={item.rating} size={20} />
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {dateLabel}
        </Text>
      </View>
    </Pressable>
  );
};

/**
 * Timeline card for one entry: photos and map on top, then the note and
 * scrollable chip rows for emotions, tags, and people; rating and date in
 * the footer. The whole card opens the entry's day, where edit
 * and delete live.
 */
export const TimelineEntry = memo(TimelineEntryComponent);
