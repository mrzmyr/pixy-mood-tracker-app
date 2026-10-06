import dayjs from "dayjs";
import keyBy from "lodash/keyBy";
import { memo } from "react";
import { Smile, Tag, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { PhotoThumbnail } from "@/features/photos";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/useColors";
import useScale from "@/hooks/useScale";
import { tDynamic } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import { RatingDot } from "../../LogList/RatingDot";
import { FadingNote } from "./FadingNote";
import { SummaryLine } from "./SummaryLine";
import type { SummaryItem } from "./SummaryLine";

// Apple Journal shows up to three photos per card. A single photo is a wide
// banner; a full-width square would fill most of the screen.
const MAX_PHOTOS = 3;
const SINGLE_PHOTO_ASPECT_RATIO = 2;
const EMOTIONS_BY_KEY = keyBy(EMOTIONS, "key");
// Screen readers get the start of long notes only.
const MAX_LABEL_MESSAGE = 200;

const TimelineEntryComponent = ({
  item,
  onPress,
}: {
  item: LogItem;
  onPress: (item: LogItem) => void;
}) => {
  const colors = useColors();
  const scale = useScale(useSetting("scaleType"));
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const photos = item.photos.slice(0, MAX_PHOTOS);
  // Same category colors as EmotionIndicator: good and bad use the extremes.
  const categoryColors = {
    very_good: scale.colors.very_good.background,
    good: scale.colors.very_good.background,
    neutral: scale.colors.neutral.background,
    bad: scale.colors.very_bad.background,
    very_bad: scale.colors.very_bad.background,
  };
  // Unknown keys and ids come from newer app versions, broken imports, or
  // deleted tags and people; skip them.
  const emotionItems = item.emotions.flatMap((key): SummaryItem[] => {
    const emotion = EMOTIONS_BY_KEY[key];
    return emotion
      ? [
          {
            key,
            label: tDynamic(`log_emotion_${emotion.key}`),
            dotColor: categoryColors[emotion.category],
          },
        ]
      : [];
  });
  const tagItems = item.tags.flatMap(({ id }): SummaryItem[] => {
    const tag = tags.find((candidate) => candidate.id === id);
    return tag
      ? [{ key: id, label: tag.title, dotColor: colors.tags[tag.color]?.dot }]
      : [];
  });
  const personItems = item.people.flatMap(({ id }): SummaryItem[] => {
    const person = people.find((candidate) => candidate.id === id);
    return person ? [{ key: id, label: person.name }] : [];
  });
  const message = item.message.trim();
  const dateLabel = dayjs(item.dateTime).format("llll");
  const hasBody =
    message !== "" ||
    emotionItems.length > 0 ||
    tagItems.length > 0 ||
    personItems.length > 0;
  const hasContent = hasBody || photos.length > 0;

  return (
    <Pressable
      testID={`timeline-entry-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={
        message === ""
          ? dateLabel
          : `${dateLabel}. ${message.slice(0, MAX_LABEL_MESSAGE)}`
      }
      onPress={() => onPress(item)}
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
      {photos.length > 0 && (
        <View style={{ flexDirection: "row", gap: 6, padding: 6 }}>
          {photos.map((photo, index) => (
            <View key={photo.id} style={{ flex: 1 }}>
              <PhotoThumbnail
                photo={photo}
                index={index}
                count={item.photos.length}
                aspectRatio={
                  photos.length === 1 ? SINGLE_PHOTO_ASPECT_RATIO : 1
                }
              />
            </View>
          ))}
        </View>
      )}
      {hasBody && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
          {message !== "" && <FadingNote message={message} />}
          <SummaryLine
            icon={Smile}
            items={emotionItems}
            testID="timeline-entry-emotions"
          />
          <SummaryLine
            icon={Tag}
            items={tagItems}
            testID="timeline-entry-tags"
          />
          <SummaryLine
            icon={Users}
            items={personItems}
            testID="timeline-entry-people"
          />
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginHorizontal: 16,
          paddingVertical: 12,
          // Rating and date alone need no divider.
          ...(hasContent && {
            marginTop: hasBody ? 16 : 6,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.logCardBorder,
          }),
        }}
      >
        <RatingDot rating={item.rating} />
        <Text
          style={{
            flex: 1,
            fontSize: 15,
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
 * Timeline card for one entry: photos, emotions, and note on top, rating
 * and date in the footer. The whole card opens the entry's day, where edit
 * and delete live.
 */
export const TimelineEntry = memo(TimelineEntryComponent);
