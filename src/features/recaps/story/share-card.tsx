import dayjs from "dayjs";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { RADIUS } from "@/constants/radius";
import { PhotoGallery, PhotoGalleryItem } from "@/features/photos";
import { t } from "@/lib/translation";
import { monthName } from "./format";
import { MonthGrid, StoryImage, useDayColors } from "./parts";
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

/**
 * Card fill on the sky: less white than the slide glass, so the day sky
 * shows through and the card does not glare.
 */
const CARD_FILL = {
  paper: "rgba(255,255,255,0.16)",
  paperBorder: "rgba(255,255,255,0.45)",
};

/**
 * Card to send to someone close: the days as mood pixels and 3 square
 * bright photos when there are enough. Light type, no tags: the days and
 * photos tell the story. See-through on the sky with a light outline and,
 * on iOS 26, a blur of the sky behind it. A photo opens the gallery with
 * all 3; a tap anywhere else on the card does nothing, so the story stays.
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
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const fill = theme === "paper" ? CARD_FILL.paper : palette.glass;
  const border =
    theme === "paper" ? CARD_FILL.paperBorder : palette.glassBorder;
  const { width } = useWindowDimensions();
  // Days fill the card: slide padding 24 and card padding per side.
  const inner = width - 48 - PADDING * 2;
  const cell = Math.floor((inner - GAP * 6) / 7);
  const shown = photos.slice(0, PHOTOS);
  // Fewer photos share the row, each at most half of it.
  const photoSize = Math.floor(
    (inner - GAP * (Math.max(shown.length, 2) - 1)) / Math.max(shown.length, 2)
  );
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
        {shown.length > 0 && (
          <PhotoGallery
            photos={shown.map((item) => item.photo)}
            context="recap"
          >
            <View style={{ flexDirection: "row", gap: GAP }}>
              {shown.map((item, index) => (
                <PhotoGalleryItem key={item.photo.id} index={index}>
                  <StoryImage
                    photo={item.photo}
                    label={t("photos_thumbnail_label", {
                      index: index + 1,
                      count: shown.length,
                    })}
                    style={{
                      width: photoSize,
                      height: photoSize,
                      borderRadius: RADIUS.md,
                    }}
                  />
                </PhotoGalleryItem>
              ))}
            </View>
          </PhotoGallery>
        )}
      </View>
    </Pressable>
  );
};
