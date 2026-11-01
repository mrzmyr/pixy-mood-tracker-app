import { Pressable, View } from "react-native";
import Shuffle from "lucide-react-native/icons/shuffle";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { ShareCard } from "./share-card";
import type { SlideContext } from "./slides";
import { STORY_PALETTE, storyButtonTint } from "./theme";
import type { StoryTheme } from "./theme";
import type { StoryPhoto } from "./types";

/**
 * Last slide, on the sky: the card to send on. Share and Shuffle sit in the
 * bottom bar like Share on every slide. Cloud Pixy flies in the free sky
 * above and never crosses the card. Reduced motion: no Pixy.
 */
export const StoryFinale = ({
  ctx,
  photos,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
}) => (
  <View style={{ flex: 1 }}>
    <SkyFlightZone style={{ flex: 1 }} />
    <ShareCard ctx={ctx} photos={photos} />
  </View>
);

/** Round button next to Share on the last slide: 3 other photos. */
export const StoryShuffleButton = ({
  theme,
  onPress,
}: {
  theme: StoryTheme;
  onPress: () => void;
}) => {
  const ink = STORY_PALETTE[theme].text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("recaps_story_share_shuffle")}
      hitSlop={8}
      onPress={onPress}
      testID="recap-story-share-shuffle"
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: storyButtonTint(theme),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Shuffle width={18} height={18} color={ink} />
    </Pressable>
  );
};
