import dayjs from "dayjs";
import {
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { View as ViewType } from "react-native";
import Shuffle from "lucide-react-native/icons/shuffle";
import { RADIUS } from "@/constants/radius";
import { getPhotoFile } from "@/features/photos";
import { t } from "@/lib/translation";
import { dayRange, monthName } from "./format";
import { MonthGrid, useDayColors } from "./parts";
import type { SlideContext } from "./slides";
import { StoryBrand } from "./story-brand";
import { STORY_MAX_FONT_SCALE, STORY_PALETTE } from "./theme";
import type { StoryTheme } from "./theme";
import type { StoryPhoto } from "./types";

/** Card padding per side. */
const PADDING = 20;
/** Space between day pixels and between photos. */
const GAP = 8;
/** Photos on the card, all square. */
const PHOTOS = 3;

/** Card colors: white card in light mode, dark card in dark mode. */
const getCardTheme = (ctx: SlideContext) => {
  const theme: StoryTheme = ctx.isDark ? "night" : "paper";
  return {
    theme,
    palette: STORY_PALETTE[theme],
    card: ctx.isDark ? "#161618" : "#FFFFFF",
    border: ctx.isDark ? "#26262A" : "#EEEEEE",
  };
};

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
 * photos tell the story. The shuffle button below the card picks 3 other
 * photos; it never shows in the shared image.
 */
export const ShareCard = ({
  ctx,
  photos,
  cardRef,
  onShuffle,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
  cardRef: React.Ref<ViewType>;
  onShuffle: (() => void) | null;
}) => {
  const dayColors = useDayColors(ctx.days);
  const { palette, card, border } = getCardTheme(ctx);
  const { width } = useWindowDimensions();
  // Days fill the card: slide padding 24 and card padding per side.
  const inner = width - 48 - PADDING * 2;
  const cell = Math.floor((inner - GAP * 6) / 7);
  const photoSize = Math.floor((inner - GAP * (PHOTOS - 1)) / PHOTOS);
  const shown = photos.length >= PHOTOS ? photos.slice(0, PHOTOS) : [];
  const isWeek = ctx.period.kind === "week";
  return (
    <View>
      <View
        ref={cardRef}
        collapsable={false}
        testID="recap-story-share-card"
        style={{
          backgroundColor: card,
          borderRadius: 28,
          borderCurve: "continuous",
          padding: PADDING,
          gap: 20,
          borderWidth: 1,
          borderColor: border,
        }}
      >
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
          empty={palette.empty}
          weekdayColor={palette.muted}
        />
        {shown.length > 0 && (
          <View style={{ flexDirection: "row", gap: GAP }}>
            {shown.map((photo) => (
              <CardPhoto
                key={photo.photo.id}
                photo={photo}
                size={photoSize}
                background={palette.surface}
              />
            ))}
          </View>
        )}
        <StoryBrand color={palette.text} />
      </View>
      {onShuffle && shown.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recaps_story_share_shuffle")}
          hitSlop={8}
          onPress={onShuffle}
          testID="recap-story-share-shuffle"
          style={{
            alignSelf: "center",
            marginTop: 16,
            width: 40,
            height: 40,
            borderRadius: RADIUS.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.surface,
          }}
        >
          <Shuffle width={16} height={16} color={palette.text} />
        </Pressable>
      )}
    </View>
  );
};
