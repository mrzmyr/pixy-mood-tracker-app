import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Moon from "lucide-react-native/icons/moon";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { CHIP_FLOW, COMPACT_CHIP } from "@/constants/chip";
import { RADIUS } from "@/constants/radius";
import { SLEEP_QUALITY_MAPPING } from "@/constants/ratings";
import type { LogItem } from "@/features/logs";
import { PersonAvatar } from "@/features/people";
import type { Person } from "@/features/people";
import { getPhotoFile } from "@/features/photos";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { t, tDynamic } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import type { Emotion } from "@/types";
import { EmotionIndicator } from "../slides/slide-emotions/emotions-indicator";
import type { CheckIn, DaySummary } from "./day-summary";
import {
  EMOTION_CHIPS_MAX,
  FACES_MAX,
  getMoodText,
  joinNames,
  PHOTOS_MAX,
  TAG_CHIPS_MAX,
  takeVisible,
} from "./entry-summary-layout";
import type { PhotoTileSize } from "./entry-summary-layout";
import { createFadeIn } from "./motion";

const FACE_SIZE = 44;
const PHOTO_HEIGHT: Record<PhotoTileSize, number> = {
  band: 150,
  half: 120,
  tall: 200,
};
const DAY_MINUTES = 24 * 60;
const STRIP_HOURS = [0, 6, 12, 18, 24];
const SLEEP_STEPS = [1, 2, 3, 4, 5];

/** Position on the day strip, 0 at midnight to 1 at the next midnight. */
const toStripOffset = (minute: number) => minute / DAY_MINUTES;

/** Gradient stops: `middle` between `start` and `end`. */
const fade = <T,>(start: T, middle: T[], end: T = start) => {
  const [first, ...rest] = [...middle, end];
  return [start, first, ...rest] as const;
};

/**
 * Card of the summary. `row` orders the fade-in: tiles in the same row
 * appear together.
 */
export const Tile = ({
  row,
  style,
  children,
}: {
  row: number;
  style?: ViewStyle;
  children: ReactNode;
}) => {
  const colors = useColors();
  const isReducedMotion = useReducedMotion();
  const entering = useMemo(
    () => createFadeIn({ delay: 150 + row * 90, isReducedMotion }),
    [row, isReducedMotion]
  );

  return (
    <Animated.View
      entering={entering}
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: RADIUS.lg,
        borderCurve: "continuous",
        padding: 14,
        overflow: "hidden",
        boxShadow: "0 8px 24px -16px rgba(15, 40, 70, 0.35)",
        ...style,
      }}
    >
      {children}
    </Animated.View>
  );
};

/** Dashed "+N" chip after the last shown chip. */
const MoreChip = ({ count }: { count: number }) => {
  const colors = useColors();
  return (
    <View
      style={{
        height: COMPACT_CHIP.height,
        paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
        borderRadius: COMPACT_CHIP.borderRadius,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.logCardBorder,
        justifyContent: "center",
      }}
    >
      <Text
        style={{ fontSize: COMPACT_CHIP.fontSize, color: colors.textSecondary }}
      >
        +{count}
      </Text>
    </View>
  );
};

const chipFlow = { ...CHIP_FLOW, paddingRight: 0, paddingBottom: 0 };

/**
 * Day strip under the mood: 24 hours, one mark per check-in at its time,
 * the newest outlined. Colors only, no words, also on hard days.
 */
const DayStrip = ({ checkIns }: { checkIns: CheckIn[] }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = colors.scales[settings.scaleType];
  const newest = Math.max(...checkIns.map((checkIn) => checkIn.minute));

  return (
    <View
      accessible
      accessibilityLabel={t("log_summary_check_in", {
        count: checkIns.length,
      })}
      style={{ marginTop: 14 }}
    >
      <View style={{ height: 30, borderRadius: RADIUS.sm, overflow: "hidden" }}>
        <LinearGradient
          colors={fade(
            colors.logBackground,
            checkIns.map((checkIn) => scale[checkIn.rating].background)
          )}
          locations={fade(
            0,
            checkIns.map((checkIn) => toStripOffset(checkIn.minute)),
            1
          )}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </View>
      {checkIns.map((checkIn) => (
        <View
          key={`${checkIn.minute}-${checkIn.rating}`}
          style={{
            position: "absolute",
            top: 3,
            height: 24,
            width: 6,
            marginLeft: -3,
            left: `${toStripOffset(checkIn.minute) * 100}%`,
            borderRadius: 3,
            backgroundColor: scale[checkIn.rating].background,
            borderWidth: 1.5,
            borderColor:
              checkIn.minute === newest ? colors.text : colors.cardBackground,
          }}
        />
      ))}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        {STRIP_HOURS.map((hour) => (
          <Text
            key={hour}
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {hour}
          </Text>
        ))}
      </View>
    </View>
  );
};

/**
 * Day pixel and rating word. Hard days get a thank-you instead of the
 * rating. 2+ check-ins add the day strip.
 */
export const MoodTile = ({ summary }: { summary: DaySummary }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const mood = getMoodText(summary);
  const isMulti = summary.checkIns.length > 1;
  const pixelSize = isMulti ? 24 : 40;

  return (
    <Tile row={1} style={{ padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: pixelSize,
            height: pixelSize,
            // Calendar pixel: rounded square, 15% radius.
            borderRadius: pixelSize * 0.15,
            backgroundColor:
              colors.scales[settings.scaleType][summary.rating].background,
          }}
        />
        <Text
          testID="entry-summary-mood"
          style={{
            flex: 1,
            color: colors.text,
            ...(mood.isRating
              ? { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 }
              : { fontSize: 17, fontWeight: "600", lineHeight: 22 }),
          }}
        >
          {mood.text}
        </Text>
      </View>
      {isMulti && <DayStrip checkIns={summary.checkIns} />}
    </Tile>
  );
};

/** Emotion chips, like the day view, then "+N". */
export const EmotionsTile = ({
  emotions,
}: {
  emotions: Pick<Emotion, "key" | "category">[];
}) => {
  const colors = useColors();
  const { shown, rest } = takeVisible(emotions, EMOTION_CHIPS_MAX);

  return (
    <Tile row={2}>
      <View style={chipFlow}>
        {shown.map((emotion) => (
          <View
            key={emotion.key}
            style={{
              height: COMPACT_CHIP.height,
              paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
              borderRadius: COMPACT_CHIP.borderRadius,
              borderWidth: 1,
              backgroundColor: colors.entryBackground,
              borderColor: colors.entryItemBorder,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <EmotionIndicator emotion={emotion} compact />
            <Text
              style={{ fontSize: COMPACT_CHIP.fontSize, color: colors.text }}
            >
              {tDynamic(`log_emotion_${emotion.key}`)}
            </Text>
          </View>
        ))}
        {rest > 0 && <MoreChip count={rest} />}
      </View>
    </Tile>
  );
};

/** Tag chips, then "+N". */
export const TagsTile = ({ tags }: { tags: Tag[] }) => {
  const { shown, rest } = takeVisible(tags, TAG_CHIPS_MAX);

  return (
    <Tile row={4}>
      <View style={chipFlow}>
        {shown.map((tag) => (
          <TagComponent
            key={tag.id}
            title={tag.title}
            colorName={tag.color}
            compact
          />
        ))}
        {rest > 0 && <MoreChip count={rest} />}
      </View>
    </Tile>
  );
};

const MosaicImage = ({ photo }: { photo: LogItem["photos"][number] }) => (
  <Image
    source={getPhotoFile(photo).uri}
    style={{ flex: 1 }}
    contentFit="cover"
    // Files are local already; a disk cache would only copy them.
    cachePolicy="memory"
    accessibilityIgnoresInvertColors
  />
);

/** Photos as a full-bleed mosaic of up to 4, then "+N". */
export const PhotosTile = ({
  photos,
  size,
}: {
  photos: LogItem["photos"];
  size: PhotoTileSize;
}) => {
  const { shown, rest } = takeVisible(photos, PHOTOS_MAX);
  const [first, ...others] = shown;

  return (
    <Tile row={3} style={{ padding: 0, flex: 1 }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("logger_step_photos")}
        style={{ height: PHOTO_HEIGHT[size], flexDirection: "row", gap: 2 }}
      >
        <MosaicImage photo={first} />
        {others.length > 0 && (
          <View style={{ flex: 1, gap: 2 }}>
            {others.map((photo) => (
              <MosaicImage key={photo.fileName} photo={photo} />
            ))}
          </View>
        )}
        {rest > 0 && (
          <View
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: RADIUS.full,
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              +{rest}
            </Text>
          </View>
        )}
      </View>
    </Tile>
  );
};

/**
 * Moon and a 5-step meter, never a word: "Bad" next to the moon judges.
 * `isRow` lays it out in one line for a full-width tile.
 */
export const SleepTile = ({
  quality,
  isRow,
}: {
  quality: keyof typeof SLEEP_QUALITY_MAPPING;
  isRow: boolean;
}) => {
  const colors = useColors();
  const value = SLEEP_QUALITY_MAPPING[quality] + 1;

  return (
    <Tile
      row={3}
      style={
        isRow
          ? { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }
          : { flex: 1, gap: 8, justifyContent: "space-between" }
      }
    >
      <Moon size={20} color={colors.tint} />
      <View
        accessible
        accessibilityLabel={`${t("logger_step_sleep")} ${value}/5`}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
          {t("logger_step_sleep")}
        </Text>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {SLEEP_STEPS.map((step) => (
            <View
              key={step}
              style={{
                width: 6,
                height: 14,
                borderRadius: RADIUS.full,
                backgroundColor:
                  step <= value ? colors.tint : colors.logCardBorder,
              }}
            />
          ))}
        </View>
      </View>
    </Tile>
  );
};

/** Up to 3 overlapping faces and the names. */
export const PeopleTile = ({
  people,
  isRow,
}: {
  people: Person[];
  isRow: boolean;
}) => {
  const colors = useColors();
  const { shown } = takeVisible(people, FACES_MAX);

  return (
    <Tile
      row={3}
      style={
        isRow
          ? { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }
          : { flex: 1, gap: 10, justifyContent: "space-between" }
      }
    >
      <View style={{ flexDirection: "row" }}>
        {shown.map((person, index) => (
          <View
            key={person.id}
            style={{
              marginLeft: index === 0 ? 0 : -12,
              borderRadius: FACE_SIZE,
              borderWidth: 3,
              borderColor: colors.cardBackground,
            }}
          >
            <PersonAvatar person={person} size={FACE_SIZE - 6} />
          </View>
        ))}
      </View>
      <Text
        style={{
          flex: isRow ? 1 : 0,
          fontSize: 15,
          fontWeight: "600",
          color: colors.text,
        }}
      >
        {joinNames(people.map((person) => person.name))}
      </Text>
    </Tile>
  );
};

/** The note in full: always the last tile. */
export const NoteTile = ({ note }: { note: string }) => {
  const colors = useColors();
  return (
    <Tile row={5}>
      <Text
        testID="entry-summary-note"
        style={{
          color: colors.text,
          ...(note.length < 80
            ? { fontSize: 17, fontWeight: "500" }
            : { fontSize: 15, lineHeight: 22 }),
        }}
      >
        {note}
      </Text>
    </Tile>
  );
};
