import { View } from "react-native";
import type { View as ViewType } from "react-native";
import { t } from "@/lib/translation";
import { monthName } from "./format";
import { StoryText } from "./parts";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { ShareCard } from "./share-card";
import { StoryShareButton } from "./story-share-button";
import type { SlideContext } from "./slides";
import type { StoryPhoto } from "./types";

/**
 * Last slide, on the sky: a quiet "That was your week", the card to send
 * on, and a wide share button. Cloud Pixy flies in the free sky above and
 * never crosses the card. Reduced
 * motion: no Pixy.
 */
export const StoryFinale = ({
  ctx,
  photos,
  cardRef,
  onShuffle,
  isSharing,
  onShare,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
  cardRef: React.Ref<ViewType>;
  onShuffle: (() => void) | null;
  isSharing: boolean;
  onShare: () => void;
}) => {
  const theme = ctx.isDark ? "night" : "paper";
  return (
    <View style={{ flex: 1 }}>
      <SkyFlightZone style={{ flex: 1 }} />
      <View style={{ gap: 12 }}>
        <StoryText
          kind="eyebrow"
          theme={theme}
          // Gray reads washed out on the sky: a deep blue of its hue instead.
          style={{
            textAlign: "center",
            color: ctx.isDark ? "rgba(255,255,255,0.7)" : "#2A4A6B",
          }}
        >
          {ctx.period.kind === "week"
            ? t("recaps_story_finale_eyebrow_week")
            : t("recaps_story_finale_eyebrow", {
                month: monthName(ctx.period.start),
              })}
        </StoryText>
        <ShareCard
          ctx={ctx}
          photos={photos}
          cardRef={cardRef}
          onShuffle={onShuffle}
        />
        <StoryShareButton
          theme={theme}
          disabled={isSharing}
          onPress={onShare}
          isWide
        />
      </View>
      <View style={{ height: 8 }} />
    </View>
  );
};
