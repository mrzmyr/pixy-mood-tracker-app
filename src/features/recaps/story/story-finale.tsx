import { View } from "react-native";
import type { View as ViewType } from "react-native";
import { t } from "@/lib/translation";
import { monthName } from "./format";
import { SlideHeader } from "./parts";
import { ShareCard } from "./share-card";
import type { SlideContext } from "./slides";
import type { ShareFact, StoryPhoto } from "./types";

/**
 * Last slide: thanks the user for looking back, then the share card with the
 * whole period. The story screen sends confetti when it shows.
 */
export const StoryFinale = ({
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
}) => (
  <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
    <SlideHeader
      theme={ctx.isDark ? "night" : "paper"}
      eyebrow={
        ctx.period.kind === "week"
          ? t("recaps_story_finale_eyebrow_week")
          : t("recaps_story_finale_eyebrow", {
              month: monthName(ctx.period.start),
            })
      }
      title={t("recaps_story_finale_title")}
    />
    <ShareCard
      ctx={ctx}
      photos={photos}
      facts={facts}
      cardRef={cardRef}
      onShuffle={onShuffle}
    />
  </View>
);
