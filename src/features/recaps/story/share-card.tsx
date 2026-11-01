import dayjs from "dayjs";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { getPhotoFile } from "@/features/photos";
import { t } from "@/lib/translation";
import { dayRange, monthName } from "./format";
import { MonthGrid, useDayColors } from "./parts";
import type { SlideContext } from "./slides";
import {
  getStoryTheme,
  STORY_CARD_RADIUS,
  STORY_MAX_FONT_SCALE,
  STORY_PALETTE,
} from "./theme";
import type { StoryPhoto } from "./types";

/** Card padding per side. */
const PADDING = 20;
/** Space between day pixels and between photos. */
const GAP = 8;
/** Photos on the card, all square. */
const PHOTOS = 3;

/** iOS 26 liquid glass blurs the sky behind the card. */
const HAS_GLASS = isGlassEffectAPIAvailable();

/** Square photo for the captured card: React Native `Image`, as the logo. */
const CardPhoto = ({
  photo,
  size,
  background,
}: {
  photo: StoryPhoto;
  size: number;
  background: string;
}) => (
  <Image
    source={{ uri: getPhotoFile(photo.photo).uri }}
    resizeMode="cover"
    style={{
      width: size,
      height: size,
      borderRadius: 12,
      backgroundColor: background,
    }}
  />
);

/**
 * Card to send to someone close: the days as mood pixels and 3 square
 * bright photos when there are enough. Light type, no tags: the days and
 * photos tell the story. See-through on the sky with a light outline and,
 * on iOS 26, a blur of the sky behind it.
 */
export const ShareCard = ({
  ctx,
  photos,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
}) => {
  const dayColors = useDayColors(ctx.days, "glass");
  const dayOutlines = useDayColors(ctx.days, "glassEdge");
  const palette = STORY_PALETTE[getStoryTheme(ctx.isDark)];
  const { width } = useWindowDimensions();
  // Days fill the card: slide padding 24 and card padding per side.
  const inner = width - 48 - PADDING * 2;
  const cell = Math.floor((inner - GAP * 6) / 7);
  const shown = photos.slice(0, PHOTOS);
  // Fewer photos share the row, each at most half of it.
  const photoSize = Math.floor(
    (inner - GAP * (Math.max(shown.length, 2) - 1)) / Math.max(shown.length, 2)
  );
  const isWeek = ctx.period.kind === "week";
  return (
    <View
      testID="recap-story-share-card"
      style={{
        backgroundColor: palette.glass,
        borderRadius: STORY_CARD_RADIUS,
        borderCurve: "continuous",
        padding: PADDING,
        borderWidth: 1,
        borderColor: palette.glassBorder,
        overflow: "hidden",
      }}
    >
      {HAS_GLASS && (
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
            {isWeek
              ? dayRange(ctx.period.start, ctx.period.end)
              : dayjs(ctx.period.start).format("YYYY")}
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
            {isWeek
              ? t("recaps_story_share_title_week")
              : t("recaps_story_share_title", {
                  month: monthName(ctx.period.start),
                })}
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
        {shown.length > 0 && (
          <View style={{ flexDirection: "row", gap: GAP }}>
            {shown.map((photo) => (
              <CardPhoto
                key={photo.photo.id}
                photo={photo}
                size={photoSize}
                background={palette.glass}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};
