import { Image, Pressable, Text, View } from "react-native";
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
import type { ShareFact, StoryPhoto } from "./types";

/**
 * Logo on the shared image. React Native `Image`, not expo-image: Android
 * Glide can decode to hardware bitmaps, which react-native-view-shot rejects.
 */
const LOGO = require("../../../../assets/images/icon.png");

const palette = STORY_PALETTE.paper;

/** Photo for the captured card: React Native `Image`, same reason as `LOGO`. */
const CardPhoto = ({ photo, flex }: { photo: StoryPhoto; flex: number }) => (
  <Image
    source={{ uri: getPhotoFile(photo.photo).uri }}
    resizeMode="cover"
    style={{ flex, borderRadius: 14, backgroundColor: palette.surface }}
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
      <StoryText kind="label" theme="paper" style={{ fontSize: 15, flex: 1 }}>
        {text}
      </StoryText>
    </View>
  );
};

/**
 * Card to send to someone close: 3 photos or the month grid, then up to 3
 * lines. The shuffle button picks 3 other bright photos. It sits outside
 * the captured view, so it never shows in the shared image.
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
  const [first, second, third] = photos;
  return (
    <View>
      <View
        ref={cardRef}
        collapsable={false}
        testID="recap-story-share-card"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 16,
          gap: 14,
          borderWidth: 1,
          borderColor: "#EEEEEE",
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
            theme="paper"
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
        {first && second && third ? (
          <View style={{ height: 230, flexDirection: "row", gap: 6 }}>
            <CardPhoto photo={first} flex={1.6} />
            <View style={{ flex: 1, gap: 6 }}>
              <CardPhoto photo={second} flex={1} />
              <CardPhoto photo={third} flex={1} />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <MonthGrid
              period={ctx.period}
              dayColors={dayColors}
              size={34}
              gap={6}
              empty={palette.empty}
            />
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
            position: "absolute",
            top: 64,
            right: 24,
            width: 32,
            height: 32,
            borderRadius: RADIUS.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.92)",
          }}
        >
          <Shuffle width={16} height={16} color="#0A0A0A" />
        </Pressable>
      )}
    </View>
  );
};
