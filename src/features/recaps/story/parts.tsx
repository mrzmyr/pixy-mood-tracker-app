import dayjs from "dayjs";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { RADIUS } from "@/constants/Radius";
import { getAverageMood } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { getPhotoFile } from "@/features/photos";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { useWeekLocale } from "@/hooks/useWeekLocale";
import { useSettings } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { addDays, daysBetween } from "../days";
import type { DateKey, Period, RecapDay } from "../types";
import { STORY_MAX_FONT_SCALE, STORY_PALETTE, STORY_TYPE } from "./theme";
import type { StoryTheme } from "./theme";

type TypeRole = keyof typeof STORY_TYPE;

/** Story text in one of the fixed roles and the slide's palette. */
export const StoryText = ({
  kind,
  theme,
  tone = "text",
  style,
  children,
  numberOfLines,
  testID,
}: {
  kind: TypeRole;
  theme: StoryTheme;
  tone?: "text" | "muted" | "accent";
  style?: TextStyle;
  children: React.ReactNode;
  numberOfLines?: number;
  testID?: string;
}) => (
  <Text
    maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
    numberOfLines={numberOfLines}
    accessibilityRole={kind === "title" ? "header" : undefined}
    testID={testID}
    style={[
      STORY_TYPE[kind],
      kind === "eyebrow" && { textTransform: "uppercase" },
      { color: STORY_PALETTE[theme][tone] },
      style,
    ]}
  >
    {children}
  </Text>
);

/** Eyebrow and title at the top of a slide. */
export const SlideHeader = ({
  theme,
  eyebrow,
  title,
}: {
  theme: StoryTheme;
  eyebrow: string;
  title: React.ReactNode;
}) => (
  <View style={{ gap: 8 }}>
    <StoryText kind="eyebrow" theme={theme} tone="accent">
      {eyebrow}
    </StoryText>
    <StoryText kind="title" theme={theme}>
      {title}
    </StoryText>
  </View>
);

/** Mood color per day: the rounded mean rating, as in the calendar. */
export const useDayColors = (days: RecapDay[]) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = colors.scales[settings.scaleType];
  const map = new Map<DateKey, string>();
  for (const day of days) {
    const rating = getAverageMood(day.items);
    if (rating) {
      map.set(day.date, scale[rating].background);
    }
  }
  return map;
};

/** Mood color of the rating key on the user's scale. */
export const useRatingColor = () => {
  const colors = useColors();
  const { settings } = useSettings();
  return (rating: LogItem["rating"]) =>
    colors.scales[settings.scaleType][rating].background;
};

/** Square day pixel: mood color, or the empty color without a check-in. */
export const Pixel = ({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: ViewStyle;
}) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: Math.max(3, size * 0.22),
        backgroundColor: color,
      },
      style,
    ]}
  />
);

/** Leading empty cells before day 1 for the user's week start. */
export const useMonthLead = (start: DateKey) => {
  const weekLocale = useWeekLocale();
  const weekStart = dayjs(start).locale(weekLocale).startOf("week");
  return daysBetween(weekStart.format("YYYY-MM-DD"), start);
};

/**
 * Month as a 7-column calendar of pixels. `render` can replace a day's
 * pixel, for example with a photo.
 */
export const MonthGrid = ({
  period,
  dayColors,
  size,
  gap = 4,
  empty,
  render,
}: {
  period: Period;
  dayColors: ReadonlyMap<DateKey, string>;
  size: number;
  gap?: number;
  empty: string;
  render?: (date: DateKey) => React.ReactNode | null;
}) => {
  const lead = useMonthLead(period.start);
  const count = daysBetween(period.start, period.end) + 1;
  // Lead cells are the days before the 1st, so every cell has a date key.
  const cells = Array.from({ length: lead + count }, (_, index) =>
    addDays(period.start, index - lead)
  );
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        width: size * 7 + gap * 6,
        gap,
      }}
    >
      {cells.map((date) =>
        date < period.start ? (
          <View key={date} style={{ width: size, height: size }} />
        ) : (
          <View key={date}>
            {render?.(date) ?? (
              <Pixel size={size} color={dayColors.get(date) ?? empty} />
            )}
          </View>
        )
      )}
    </View>
  );
};

/** Tag color dot: small rounded square, as in recap card chips. */
export const TagDot = ({ tag, size = 10 }: { tag: Tag; size?: number }) => {
  const colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: colors.tags[tag.color]?.dot,
      }}
    />
  );
};

/** Tag dot plus name on one line. */
export const TagLabel = ({
  tag,
  theme,
  kind = "label",
}: {
  tag: Tag;
  theme: StoryTheme;
  kind?: TypeRole;
}) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    }}
  >
    <TagDot tag={tag} />
    <StoryText
      kind={kind}
      theme={theme}
      numberOfLines={1}
      style={{ flexShrink: 1 }}
    >
      {tag.title}
    </StoryText>
  </View>
);

/**
 * Tag inside a title: dot and name on a muted pill, same look as recap card
 * titles (`TitleChip`). Sits inline, so the title wraps around it.
 */
export const TitleTag = ({ tag, theme }: { tag: Tag; theme: StoryTheme }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      borderRadius: RADIUS.full,
      backgroundColor: STORY_PALETTE[theme].surface,
      // Inline views sit on the line bottom; this moves the text onto the
      // title baseline.
      transform: [{ translateY: 5 }],
    }}
  >
    <TagDot tag={tag} size={12} />
    <StoryText kind="title" theme={theme}>
      {tag.title}
    </StoryText>
  </View>
);

/** Photo file of an entry, cropped to fill. Never decorative: has a label. */
export const StoryImage = ({
  photo,
  style,
  label,
}: {
  photo: LogPhoto;
  style?: ImageStyle;
  label?: string;
}) => (
  <Image
    source={{ uri: getPhotoFile(photo).uri }}
    recyclingKey={photo.id}
    contentFit="cover"
    accessibilityLabel={label}
    accessible={label !== undefined}
    style={[{ borderRadius: RADIUS.md, backgroundColor: "#1C1C1E" }, style]}
  />
);
