import { View } from "react-native";
import type { View as ViewType } from "react-native";
import { ShareCard } from "./share-card";
import type { SlideContext } from "./slides";
import type { StoryPhoto } from "./types";

/**
 * Last slide: the share card alone, centered. The thanks slide before it
 * already said goodbye, so this one only shows the period to send on.
 */
export const StoryFinale = ({
  ctx,
  photos,
  cardRef,
  onShuffle,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
  cardRef: React.Ref<ViewType>;
  onShuffle: (() => void) | null;
}) => (
  <View style={{ flex: 1, justifyContent: "center" }}>
    <ShareCard
      ctx={ctx}
      photos={photos}
      cardRef={cardRef}
      onShuffle={onShuffle}
    />
  </View>
);
