import {
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { View as ViewType } from "react-native";
import MapPin from "lucide-react-native/icons/map-pin";
import Shuffle from "lucide-react-native/icons/shuffle";
import { RADIUS } from "@/constants/radius";
import { getPhotoFile } from "@/features/photos";
import { t } from "@/lib/translation";
import { dateOfWeekday, monthName, weekdayName } from "./format";
import { MonthGrid, StoryText, TagDot, useDayColors } from "./parts";
import type { SlideContext } from "./slides";
import { STORY_MAX_FONT_SCALE, STORY_PALETTE } from "./theme";
import type { StoryTheme } from "./theme";
import type { ShareFact, StoryPhoto } from "./types";

/**
 * Logo on the shared image. React Native `Image`, not expo-image: Android
 * Glide can decode to hardware bitmaps, which react-native-view-shot rejects.
 */
const LOGO = require("../../../../assets/images/icon.png");

/** Space between calendar pixels on the card. */
const CELL_GAP = 6;

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

/** Photo for the captured card: React Native `Image`, same reason as `LOGO`. */
const CardPhoto = ({
  photo,
  flex,
  background,
}: {
  photo: StoryPhoto;
  flex: number;
  background: string;
}) => (
  <Image
    source={{ uri: getPhotoFile(photo.photo).uri }}
    resizeMode="cover"
    style={{ flex, borderRadius: 14, backgroundColor: background }}
  />
);

const Fact = ({ fact, ctx }: { fact: ShareFact; ctx: SlideContext }) => {
  let marker: React.ReactNode = null;
  let text = "";
  if (fact.kind === "city") {
    marker = <MapPin width={12} height={12} color="#EF4444" />;
    text = t("recaps_story_share_city", { city: fact.city });
  } else if (fact.kind === "weekday" || fact.kind === "tag") {
    const tag = ctx.tags.get(fact.tagId);
    if (!tag) {
      return null;
    }
    marker = <TagDot tag={tag} />;
    text =
      fact.kind === "weekday"
        ? t(
            fact.hits === fact.total
              ? "recaps_story_weekday_title_every"
              : "recaps_story_weekday_title_most",
            {
              tag: tag.title,
              weekday: weekdayName(dateOfWeekday(fact.weekday)),
            }
          )
        : t("recaps_story_share_tag", { tag: tag.title, count: fact.days });
  } else {
    text = t("recaps_story_share_check_ins", { count: fact.days });
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 12, alignItems: "center" }}>{marker}</View>
      <StoryText
        kind="label"
        theme={getCardTheme(ctx).theme}
        style={{ fontSize: 15, flex: 1 }}
      >
        {text}
      </StoryText>
    </View>
  );
};

/**
 * Card to send to someone close: the whole month as mood pixels, 3 bright
 * photos when there are enough, then up to 3 lines. The shuffle button
 * below the card picks 3 other photos; it never shows in the shared image.
 */
export const ShareCard = ({
  ctx,
  photos,
  facts,
  cardRef,
  onShuffle,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
  facts: ShareFact[];
  cardRef: React.Ref<ViewType>;
  onShuffle: (() => void) | null;
}) => {
  const dayColors = useDayColors(ctx.days);
  const { theme, palette, card, border } = getCardTheme(ctx);
  const { width } = useWindowDimensions();
  // Calendar fills the card: slide padding 24 and card padding 16 per side.
  const cell = Math.floor((width - 48 - 32 - CELL_GAP * 6) / 7);
  const [first, second, third] = photos;
  return (
    <View>
      <View
        ref={cardRef}
        collapsable={false}
        testID="recap-story-share-card"
        style={{
          backgroundColor: card,
          borderRadius: 24,
          padding: 16,
          gap: 14,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <StoryText
            kind="label"
            theme={theme}
            style={{ fontSize: 19, fontWeight: "800" }}
          >
            {t("recaps_story_share_title", {
              month: monthName(ctx.period.start),
            })}
          </StoryText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Image
              source={LOGO}
              style={{ width: 16, height: 16, borderRadius: 4 }}
            />
            <Text
              maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
              style={{ fontSize: 12, fontWeight: "700", color: palette.muted }}
            >
              Pixy
            </Text>
          </View>
        </View>
        {/* The whole month at a glance: every day as a mood pixel. */}
        <View style={{ alignItems: "center" }}>
          <MonthGrid
            period={ctx.period}
            dayColors={dayColors}
            size={cell}
            gap={CELL_GAP}
            empty={palette.empty}
            weekdayColor={palette.muted}
          />
        </View>
        {first && second && third && (
          <View style={{ height: 76, flexDirection: "row", gap: 6 }}>
            <CardPhoto photo={first} flex={1} background={palette.surface} />
            <CardPhoto photo={second} flex={1} background={palette.surface} />
            <CardPhoto photo={third} flex={1} background={palette.surface} />
          </View>
        )}
        <View style={{ gap: 9 }}>
          {facts.map((fact) => (
            <Fact key={JSON.stringify(fact)} fact={fact} ctx={ctx} />
          ))}
        </View>
      </View>
      {onShuffle && photos.length >= 3 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recaps_story_share_shuffle")}
          hitSlop={8}
          onPress={onShuffle}
          testID="recap-story-share-shuffle"
          style={{
            alignSelf: "center",
            marginTop: 12,
            width: 36,
            height: 36,
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
