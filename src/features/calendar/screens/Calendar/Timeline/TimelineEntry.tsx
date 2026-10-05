import dayjs from "dayjs";
import keyBy from "lodash/keyBy";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { PhotoThumbnail } from "@/features/photos";
import useColors from "@/hooks/useColors";
import { EmotionItem } from "../../LogList/EmotionItem";
import { RatingDot } from "../../LogList/RatingDot";

// Apple Journal shows up to three photos per card. A single photo is a wide
// banner; a full-width square would fill most of the screen.
const MAX_PHOTOS = 3;
const SINGLE_PHOTO_ASPECT_RATIO = 2;
// Entries can hold every emotion (161); more chips make the card screens tall.
const MAX_EMOTIONS = 3;
const EMOTIONS_BY_KEY = keyBy(EMOTIONS, "key");

const TimelineEntryComponent = ({
  item,
  onPress,
}: {
  item: LogItem;
  onPress: (item: LogItem) => void;
}) => {
  const colors = useColors();
  const photos = item.photos.slice(0, MAX_PHOTOS);
  // Unknown keys come from newer app versions or broken imports; skip them.
  const emotions = item.emotions.flatMap((key) => {
    const emotion = EMOTIONS_BY_KEY[key];
    return emotion ? [emotion] : [];
  });
  const shownEmotions = emotions.slice(0, MAX_EMOTIONS);
  const hiddenEmotionCount = emotions.length - shownEmotions.length;
  const message = item.message.trim();
  const dateLabel = dayjs(item.dateTime).format("llll");
  const hasBody = emotions.length > 0 || message !== "";
  const hasContent = hasBody || photos.length > 0;

  return (
    <Pressable
      testID={`timeline-entry-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={
        message === "" ? dateLabel : `${dateLabel}. ${message}`
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
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          {emotions.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {shownEmotions.map((emotion) => (
                <EmotionItem key={emotion.key} emotion={emotion} />
              ))}
              {hiddenEmotionCount > 0 && (
                <View
                  style={{
                    justifyContent: "center",
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.logCardBorder,
                  }}
                >
                  <Text style={{ fontSize: 17, color: colors.textSecondary }}>
                    {`+${hiddenEmotionCount}`}
                  </Text>
                </View>
              )}
            </View>
          )}
          {message !== "" && (
            <Text
              numberOfLines={4}
              style={{ fontSize: 20, lineHeight: 26, color: colors.text }}
            >
              {message}
            </Text>
          )}
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
