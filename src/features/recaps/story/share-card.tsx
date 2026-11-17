import dayjs from "dayjs";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { t } from "@/lib/translation";
import { monthName } from "./format";
import { MonthGrid, useDayColors } from "./parts";
import type { SlideContext } from "./slides";
import {
  getStoryTheme,
  STORY_CARD_RADIUS,
  STORY_MAX_FONT_SCALE,
  STORY_PALETTE,
} from "./theme";

/** Card padding per side. */
const PADDING = 20;
/** Space between day pixels. */
const GAP = 8;

/** iOS 26 liquid glass blurs the day sky behind the light card. */
const HAS_GLASS = isGlassEffectAPIAvailable();

/**
 * Light card: see-through and less white than the slide glass, so the day
 * sky shows through and the card does not glare. Dark card: solid, so it
 * reads as a dark card on the night sky, with solid mood pixels.
 */
const CARD = {
  paper: {
    fill: "rgba(255,255,255,0.16)",
    border: "rgba(255,255,255,0.45)",
    isGlass: true,
  },
  night: {
    fill: STORY_PALETTE.night.surface,
    border: STORY_PALETTE.night.chipBorder,
    isGlass: false,
  },
} as const;

/**
 * Card to send to someone close: the month's days as mood pixels only.
 * Light mode: see-through on the day sky with a light outline and, on
 * iOS 26, a blur of the sky behind it. Dark mode: a solid dark card. A tap
 * on the card does nothing, so the story stays.
 */
export const ShareCard = ({ ctx }: { ctx: SlideContext }) => {
  const theme = getStoryTheme(ctx.isDark);
  const isNight = theme === "night";
  const card = isNight ? CARD.night : CARD.paper;
  const palette = STORY_PALETTE[theme];
  const dayColors = useDayColors(ctx.days, isNight ? "background" : "glass");
  const glassOutlines = useDayColors(ctx.days, "glassEdge");
  const { width } = useWindowDimensions();
  // Days fill the card: slide padding 24 and card padding per side.
  const inner = width - 48 - PADDING * 2;
  const cell = Math.floor((inner - GAP * 6) / 7);
  // "My September".
  const title = t("recaps_story_share_title", {
    month: monthName(ctx.period.start),
  });
  return (
    // Takes taps, so a tap on the card never moves the story on or closes it.
    <Pressable
      accessible={false}
      testID="recap-story-share-card"
      style={{
        backgroundColor: card.fill,
        borderRadius: STORY_CARD_RADIUS,
        borderCurve: "continuous",
        padding: PADDING,
        borderWidth: 1,
        borderColor: card.border,
        overflow: "hidden",
      }}
    >
      {HAS_GLASS && card.isGlass && (
        <GlassView
          glassEffectStyle="clear"
          style={[StyleSheet.absoluteFill, { borderRadius: STORY_CARD_RADIUS }]}
        />
      )}
      <View style={{ gap: 20 }}>
        <View style={{ gap: 2 }}>
          <Text
            maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
            style={{
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "500",
              color: palette.muted,
              fontVariant: ["tabular-nums"],
            }}
          >
            {dayjs(ctx.period.start).format("YYYY")}
          </Text>
          {/* Big and light: weight 500 with tight tracking reads calm. */}
          <Text
            maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
            accessibilityRole="header"
            style={{
              fontSize: 30,
              lineHeight: 36,
              fontWeight: "500",
              letterSpacing: -0.8,
              color: palette.text,
            }}
          >
            {title}
          </Text>
        </View>
        <MonthGrid
          period={ctx.period}
          dayColors={dayColors}
          size={cell}
          gap={GAP}
          empty={isNight ? palette.empty : palette.glass}
          // Solid pixels on the dark card need no outline.
          dayOutlines={isNight ? undefined : glassOutlines}
          emptyOutline={isNight ? undefined : palette.glassBorder}
          weekdayColor={palette.muted}
        />
      </View>
    </Pressable>
  );
};
