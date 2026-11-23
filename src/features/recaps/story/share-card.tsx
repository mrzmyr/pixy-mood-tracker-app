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

/**
 * iOS 26 liquid glass blurs the sky behind the card. Light mode only: on the
 * night sky clear glass turns the card bright.
 */
const HAS_GLASS = isGlassEffectAPIAvailable();

/**
 * Card fill on the sky: less white than the slide glass, so the day sky
 * shows through and the card does not glare.
 */
const CARD_FILL = {
  paper: "rgba(255,255,255,0.16)",
  paperBorder: "rgba(255,255,255,0.45)",
  // Dark mode: a dark see-through card, so it never glares on the night sky.
  night: "rgba(10,10,10,0.55)",
  nightBorder: "rgba(255,255,255,0.14)",
};

/**
 * Card to send to someone close: the days as mood pixels, no photos. Light
 * type, no tags: the days tell the story. Light mode: see-through on the
 * sky with a light outline and, on iOS 26, a blur of the sky behind it.
 * Dark mode: a dark see-through card. A tap on the card does nothing, so
 * the story stays.
 */
export const ShareCard = ({ ctx }: { ctx: SlideContext }) => {
  const dayColors = useDayColors(ctx.days, "glass");
  const dayOutlines = useDayColors(ctx.days, "glassEdge");
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const fill = theme === "paper" ? CARD_FILL.paper : CARD_FILL.night;
  const border =
    theme === "paper" ? CARD_FILL.paperBorder : CARD_FILL.nightBorder;
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
        backgroundColor: fill,
        borderRadius: STORY_CARD_RADIUS,
        borderCurve: "continuous",
        padding: PADDING,
        borderWidth: 1,
        borderColor: border,
        overflow: "hidden",
      }}
    >
      {HAS_GLASS && theme === "paper" && (
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
          empty={palette.glass}
          dayOutlines={dayOutlines}
          emptyOutline={palette.glassBorder}
          weekdayColor={palette.muted}
        />
      </View>
    </Pressable>
  );
};
