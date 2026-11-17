import { View } from "react-native";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { ShareCard } from "./share-card";
import type { SlideContext } from "./slides";
import { STORY_BLOCK_GAP } from "./theme";

/**
 * Last slide, on the sky: the card to send on, at the top like the content
 * of every slide. Share sits in the bottom bar. Cloudy flies in the free
 * sky below and never crosses the card. Reduced motion: no Pixy.
 */
export const StoryFinale = ({ ctx }: { ctx: SlideContext }) => (
  <View style={{ flex: 1 }}>
    <ShareCard ctx={ctx} />
    <SkyFlightZone style={{ flex: 1, marginTop: STORY_BLOCK_GAP }} />
  </View>
);
