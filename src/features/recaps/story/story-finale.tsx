import { Pressable, View } from "react-native";
import type { View as ViewType } from "react-native";
import Shuffle from "lucide-react-native/icons/shuffle";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { ShareCard } from "./share-card";
import { StoryShareButton } from "./story-share-button";
import type { SlideContext } from "./slides";
import { getStoryTheme, STORY_BLOCK_GAP, STORY_PALETTE } from "./theme";
import type { StoryPhoto } from "./types";

/**
 * Last slide, on the sky: the card to send on, with Share bottom left and
 * Shuffle bottom right. Cloud Pixy flies in the free sky above and never
 * crosses the card. Reduced motion: no Pixy.
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
  /** `null` with 3 photos or fewer: nothing to shuffle. */
  onShuffle: (() => void) | null;
  isSharing: boolean;
  onShare: () => void;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  return (
    <View style={{ flex: 1 }}>
      <SkyFlightZone style={{ flex: 1 }} />
      <View style={{ gap: STORY_BLOCK_GAP }}>
        <ShareCard ctx={ctx} photos={photos} cardRef={cardRef} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <StoryShareButton
            theme={theme}
            disabled={isSharing}
            onPress={onShare}
            isWide
          />
          {onShuffle && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("recaps_story_share_shuffle")}
              hitSlop={8}
              onPress={onShuffle}
              testID="recap-story-share-shuffle"
              style={({ pressed }) => ({
                width: 52,
                height: 52,
                borderRadius: RADIUS.full,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.glass,
                borderWidth: 1,
                borderColor: palette.glassBorder,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Shuffle width={20} height={20} color={palette.text} />
            </Pressable>
          )}
        </View>
      </View>
      <View style={{ height: 8 }} />
    </View>
  );
};
