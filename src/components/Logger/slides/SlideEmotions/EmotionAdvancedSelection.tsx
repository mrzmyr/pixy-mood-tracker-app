import { Emotion, EMOTION_CATEGORIES } from "@/types";
import { useRef } from "react";
import { Dimensions, ViewStyle } from "react-native";
import { Carousel, CarouselRef } from "react-native-reanimated-carousel";
import { EMOTIONS } from "../../config";
import { EMOTION_BUTTON_HEIGHT } from "./constants";
import { EmotionPage } from "./EmotionPage";

const WINDOW_WIDTH = Dimensions.get('window').width

export const EmotionAdvancedSelection = ({
  defaultIndex = 0,
  selectedEmotions,
  onPress,
  style = {},
}: {
  defaultIndex?: number;
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  style?: ViewStyle;
}) => {
  const _carousel = useRef<CarouselRef>(null);

  const pages = EMOTION_CATEGORIES.map((category) => {
    const filteredEmotions = EMOTIONS
      .filter((e) => (
        e.category === category &&
        e.disabled !== true
      ))
      .sort((a, b) => a.label.localeCompare(b.label));

    return (
      <EmotionPage
        key={`emotions-page-inner-${category}`}
        emotions={filteredEmotions}
        onPress={onPress}
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
      renderItem={({ index }) => pages[index]}
      onConfigurePanGesture={(gesture) => gesture.activeOffsetX([-10, 10])}
      itemSize={WINDOW_WIDTH / 1.2}
      style={{
        height: EMOTION_BUTTON_HEIGHT * 9 + 16 * 8,
        width: WINDOW_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    />
  );
};
