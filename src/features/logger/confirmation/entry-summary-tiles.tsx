import dayjs from "dayjs";
import MaskedView from "@react-native-masked-view/masked-view";
import chroma from "chroma-js";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { CHIP_FLOW, COMPACT_CHIP } from "@/constants/chip";
import { RADIUS } from "@/constants/radius";
import { FONT_SIZE } from "@/constants/typography";
import { SLEEP_QUALITY_MAPPING } from "@/constants/ratings";
import type { LogItem } from "@/features/logs";
import { PersonAvatar } from "@/features/people";
import type { Person } from "@/features/people";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { getItemTime } from "@/lib/log-dates";
import { t, tDynamic } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import type { Emotion } from "@/types";
import { EmotionIndicator } from "../slides/slide-emotions/emotions-indicator";
import { SleepQualityMeter } from "../slides/slide-sleep-button";
import type { CheckIn, DaySummary } from "./day-summary";
import { FACES_MAX, joinNames, takeVisible } from "./entry-summary-layout";
import { createFadeIn } from "./motion";

/** Every tile is at least this tall, so the grid reads as a bento. */
const TILE_MIN_HEIGHT = 96;
const FACE_SIZE = 38;
/** How far each face slides under the one before it. */
const FACE_OVERLAP = 10;
/** See-through gap between overlapping faces. */
const FACE_GAP = 2;
const PIXEL_SIZE = 36;
const DAY_MINUTES = 24 * 60;
const STRIP_HOURS = [0, 6, 12, 18, 24];

/** Position on the day strip, 0 at midnight to 1 at the next midnight. */
const toStripOffset = (minute: number) => minute / DAY_MINUTES;

/** First letter upper case: English "bad" is "not so good". */
const capitalize = (text: string) =>
  text.charAt(0).toLocaleUpperCase() + text.slice(1);

/**
 * Outline of a see-through mark on `color`: the same color, a bit darker on
 * light moods and lighter on dark ones, so it reads without turning black.
 * `isStrong` marks the newest check-in.
 */
const getMarkColor = (color: string, isStrong: boolean) => {
  const amount = isStrong ? 1.6 : 1;
  return chroma(color).luminance() > 0.4
    ? chroma(color).darken(amount).hex()
    : chroma(color).brighten(amount).hex();
};

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
        minHeight: TILE_MIN_HEIGHT,
        // Subtle lift off the gray page: see-through hairline plus a soft
        // shadow.
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.glassBorder,
        boxShadow:
          "0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.04)",
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
 * the newest outlined. The first and last check-in colors run to the edges.
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
          colors={fade(stops[0], stops, stops.at(-1))}
          locations={fade(
            0,
            checkIns.map((checkIn) => toStripOffset(checkIn.minute)),
            1
          )}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
        {/* See-through outline: sets the strip off from the card. */}
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFill,
            borderRadius: RADIUS.sm,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.glassBorder,
          }}
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
            borderWidth: checkIn.minute === newest ? 2 : 1.5,
            borderColor: getMarkColor(
              scale[checkIn.rating].background,
              checkIn.minute === newest
            ),
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

/**
 * Lead of the summary: day pixel, mood name, when, and where. 2+ check-ins
 * add the day strip. No card: it sits on the page under the hero.
 */
export const MoodHeader = ({
  summary,
  item,
}: {
  summary: DaySummary;
  item: LogItem;
}) => {
  const colors = useColors();
  const { settings } = useSettings();
  const place = item.location?.name ?? null;
  const pixelColor =
    colors.scales[settings.scaleType][summary.rating].background;

  return (
    <View style={{ paddingHorizontal: 4, paddingBottom: 6 }}>
      <View
        style={{
          width: PIXEL_SIZE,
          height: PIXEL_SIZE,
          // Calendar pixel: rounded square, 15% radius.
          borderRadius: PIXEL_SIZE * 0.15,
          backgroundColor: pixelColor,
          // Outlined in its own color, so it holds up on photos and maps.
          borderWidth: 1.5,
          borderColor: getMarkColor(pixelColor, false),
        }}
      />
      <Text
        testID="entry-summary-mood"
        accessibilityRole="header"
        style={{
          marginTop: 12,
          color: colors.text,
          // Mood name: the headline of the screen.
          fontSize: 34,
          fontWeight: "700",
          letterSpacing: -0.8,
        }}
      >
        {capitalize(t(summary.rating))}
      </Text>
      <Text
        style={{
          marginTop: 6,
          fontSize: FONT_SIZE.base,
          color: colors.textSecondary,
        }}
      >
        {dayjs(getItemTime(item)).format("LLLL")}
      </Text>
      {place !== null && (
        <Text
          style={{
            marginTop: 2,
            fontSize: FONT_SIZE.base,
            color: colors.textSecondary,
          }}
        >
          {place}
        </Text>
      )}
      {summary.checkIns.length > 1 && <DayStrip checkIns={summary.checkIns} />}
    </View>
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
              borderColor: colors.glassBorder,
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
export const TagsTile = ({ tags }: { tags: Tag[] }) => {
  const colors = useColors();
  return (
    <Tile row={4}>
      <View style={chipFlow}>
        {tags.map((tag) => (
          <TagComponent
            key={tag.id}
            title={tag.title}
            colorName={tag.color}
            compact
            // Glass shows through, like the emotion chips.
            style={{
              backgroundColor: "transparent",
              borderColor: colors.glassBorder,
            }}
          />
        ))}
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
    <Tile row={3} style={{ flex: 1, justifyContent: "flex-end" }}>
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

/**
 * Mask for a face with the next face overlapping it: a circle with a bite
 * out of its right side, so a see-through gap separates the faces on glass.
 */
const FaceCutout = () => {
  const radius = FACE_SIZE / 2;
  const next = FACE_SIZE - FACE_OVERLAP + radius;
  const circle = (cx: number, r: number) =>
    `M ${cx - r} ${radius} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  return (
    <Svg width={FACE_SIZE} height={FACE_SIZE}>
      <Path
        fill="#000"
        fillRule="evenodd"
        d={`${circle(radius, radius)} ${circle(next, radius + FACE_GAP)}`}
      />
    </Svg>
  );
};

/** Up to 3 overlapping faces and the names. */
export const PeopleTile = ({ people }: { people: Person[] }) => {
  const colors = useColors();
  const { shown } = takeVisible(people, FACES_MAX);

  return (
    <Tile row={3} style={{ flex: 1, gap: 10, justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row" }}>
        {shown.map((person, index) => (
          <View
            key={person.id}
            style={{ marginLeft: index === 0 ? 0 : -FACE_OVERLAP }}
          >
            {index < shown.length - 1 ? (
              <MaskedView maskElement={<FaceCutout />}>
                <PersonAvatar person={person} size={FACE_SIZE} />
              </MaskedView>
            ) : (
              <PersonAvatar person={person} size={FACE_SIZE} />
            )}
          </View>
        ))}
      </View>
      <Text
        style={{
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
