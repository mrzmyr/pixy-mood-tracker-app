import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import chroma from "chroma-js";
import { CHIP_FLOW, COMPACT_CHIP } from "@/constants/chip";
import { RADIUS } from "@/constants/radius";
import { FONT_SIZE } from "@/constants/typography";
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
import { SleepQualityMeter } from "../slides/slide-sleep-button";
import type { CheckIn, DaySummary } from "./day-summary";
import {
  BENTO_PHOTOS_MAX,
  FACES_MAX,
  joinNames,
  takeVisible,
} from "./entry-summary-layout";
import type { PhotoRow } from "./entry-summary-layout";
import { createFadeIn } from "./motion";

const FACE_SIZE = 44;
const DAY_MINUTES = 24 * 60;
const STRIP_HOURS = [0, 6, 12, 18, 24];

/** Position on the day strip, 0 at midnight to 1 at the next midnight. */
const toStripOffset = (minute: number) => minute / DAY_MINUTES;

/** First letter upper case: English "bad" is "not so good". */
const capitalize = (text: string) =>
  text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** `color` fully transparent: a fade to it stays in the same hue. */
const clear = (color: string) => chroma(color).alpha(0).css();

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
        ...style,
      }}
    >
      {children}
    </Animated.View>
  );
};

const chipFlow = { ...CHIP_FLOW, paddingRight: 0, paddingBottom: 0 };

/**
 * Day strip under the mood: 24 hours, one mark per check-in at its time,
 * the newest outlined. Hours without check-ins fade to transparent.
 */
const DayStrip = ({ checkIns }: { checkIns: CheckIn[] }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = colors.scales[settings.scaleType];
  const newest = Math.max(...checkIns.map((checkIn) => checkIn.minute));
  const stops = checkIns.map((checkIn) => scale[checkIn.rating].background);

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
          colors={fade(clear(stops[0]), stops, clear(stops.at(-1) ?? ""))}
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
              // Axis ticks: smaller so the strip stays the focus.
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

/** Day pixel and rating word. 2+ check-ins add the day strip. */
export const MoodTile = ({ summary }: { summary: DaySummary }) => {
  const colors = useColors();
  const { settings } = useSettings();
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
            // Mood word: the headline of the summary.
            fontSize: 24,
            fontWeight: "700",
            letterSpacing: -0.5,
          }}
        >
          {capitalize(t(summary.rating))}
        </Text>
      </View>
      {isMulti && <DayStrip checkIns={summary.checkIns} />}
    </Tile>
  );
};

/** All emotion chips, like the day view. */
export const EmotionsTile = ({
  emotions,
}: {
  emotions: Pick<Emotion, "key" | "category">[];
}) => {
  const colors = useColors();

  return (
    <Tile row={2}>
      <View style={chipFlow}>
        {emotions.map((emotion) => (
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
      </View>
    </Tile>
  );
};

/** All tag chips. */
export const TagsTile = ({ tags }: { tags: Tag[] }) => (
  <Tile row={4}>
    <View style={chipFlow}>
      {tags.map((tag) => (
        <TagComponent
          key={tag.id}
          title={tag.title}
          colorName={tag.color}
          compact
        />
      ))}
    </View>
  </Tile>
);

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

/**
 * Photos in `rows`, full bleed. Above {@link BENTO_PHOTOS_MAX} the last
 * photo carries "+N".
 */
export const PhotosTile = ({
  photos,
  rows,
  row,
}: {
  photos: LogItem["photos"];
  rows: PhotoRow[];
  /** Fade-in order, see {@link Tile}. */
  row: number;
}) => {
  const { rest } = takeVisible(photos, BENTO_PHOTOS_MAX);

  return (
    <Tile row={row} style={{ padding: 0, flex: 1 }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("logger_step_photos")}
        style={{ gap: 2 }}
      >
        {rows.map(({ height, columns }) => (
          <View
            key={columns.flat().join(",")}
            style={{ height, flexDirection: "row", gap: 2 }}
          >
            {columns.map((column) => (
              <View key={column.join(",")} style={{ flex: 1, gap: 2 }}>
                {column.map((index) => (
                  <MosaicImage key={index} photo={photos[index]} />
                ))}
              </View>
            ))}
          </View>
        ))}
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
            {/* Badge on a photo: small so it covers little of it. */}
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              +{rest}
            </Text>
          </View>
        )}
      </View>
    </Tile>
  );
};

/** The word and the sleep quality meter, never a rating word: "Bad" judges. */
export const SleepTile = ({
  quality,
}: {
  quality: keyof typeof SLEEP_QUALITY_MAPPING;
}) => {
  const colors = useColors();
  // Mapping runs 0 to 4; screen readers read 1 to 5.
  const value = SLEEP_QUALITY_MAPPING[quality];

  return (
    <Tile row={3} style={{ flex: 1, justifyContent: "center" }}>
      <View
        accessible
        accessibilityLabel={`${t("logger_step_sleep")} ${value + 1}/5`}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Text style={{ fontSize: FONT_SIZE.base, color: colors.text }}>
          {t("logger_step_sleep")}
        </Text>
        <SleepQualityMeter value={value} height={20} />
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
          fontSize: FONT_SIZE.base,
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
          fontSize: FONT_SIZE.base,
          lineHeight: 22,
        }}
      >
        {note}
      </Text>
    </Tile>
  );
};
