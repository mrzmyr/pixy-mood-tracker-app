import { getLocale } from "@/lib/translation";
import { EMOTION_CATEGORIES } from "@/types";
import type { Emotion } from "@/types";

import { useRef } from "react";
import { useWindowDimensions, View } from "react-native";

import { Carousel } from "react-native-reanimated-carousel";
import type { CarouselRef } from "react-native-reanimated-carousel";

import { EMOTIONS } from "../../config";
import { EMOTION_BUTTON_HEIGHT } from "./constants";
import { EmotionPage } from "./emotion-page";

/**
 * Swipeable emotion pages, one per category from worst to best, sorted
 * alphabetically by label with locale-aware comparison. `defaultIndex` picks
 * the first page shown. Disabled emotions are hidden. Every page ends with a
 * "Missing one?" tile.
 */
export const EmotionAdvancedSelection = ({
  defaultIndex = 0,
  selectedEmotions,
  onPress,
  onRequestEmotion,
}: {
  defaultIndex?: number;
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  onRequestEmotion: () => void;
}) => {
  const _carousel = useRef<CarouselRef>(null);
  const { width: windowWidth } = useWindowDimensions();
  // Slides span the full carousel width. The carousel puts each slide at the
  // left edge, so a narrower slide hangs left. The page keeps its narrower
  // width and sits centered inside the slide.
  const pageWidth = windowWidth / 1.2;
  const locale = getLocale();

  const pages = EMOTION_CATEGORIES.map((category) => {
    const filteredEmotions = EMOTIONS.filter(
      (e) => e.category === category && e.disabled !== true
    ).sort((a, b) => a.label.localeCompare(b.label, locale));

    return (
      <EmotionPage
        key={`emotions-page-inner-${category}`}
        emotions={filteredEmotions}
        onPress={onPress}
        onRequestEmotion={onRequestEmotion}
        selectedEmotions={selectedEmotions}
      />
    );
  });

  return (
    <Carousel
      loop={false}
      ref={_carousel}
      data={pages}
      defaultIndex={defaultIndex}
      renderItem={({ index }) => (
        <View style={{ width: pageWidth, alignSelf: "center" }}>
          {pages[index]}
        </View>
      )}
      onConfigurePanGesture={(gesture) => gesture.activeOffsetX([-10, 10])}
      itemSize={windowWidth}
      style={{
        height: EMOTION_BUTTON_HEIGHT * 9 + 16 * 8,
        width: windowWidth,
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  );
};
